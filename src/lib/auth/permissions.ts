/**
 * Centralised authorization rules.
 *
 * This module is the ONLY place in the codebase where a role is interpreted
 * (docs/AUTHENTICATION.md section 4: "Define permissions centrally in
 * server-side code. UI visibility is for usability, not security.").
 *
 * WHAT can() DOES NOT DO
 *
 * It answers one question: "may this role, at this client access level, perform
 * this kind of action?" It does NOT verify that the record being acted upon
 * actually belongs to the caller's organization or client. That is step 6 of
 * docs/AUTHENTICATION.md section 8 and remains the caller's responsibility, as
 * does Row Level Security in the database. A `can()` check that passes while
 * the record belongs to another tenant is still a cross-tenant breach -- both
 * checks are required, neither replaces the other.
 */

export const ORGANIZATION_ROLES = [
  'owner',
  'admin',
  'reviewer',
  'operator',
  'client_user',
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['invited', 'active', 'suspended', 'removed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const CLIENT_ACCESS_LEVELS = ['read', 'upload', 'review', 'admin'] as const;
export type ClientAccessLevel = (typeof CLIENT_ACCESS_LEVELS)[number];

/** Access levels are ordered: each tier includes everything below it. */
const CLIENT_ACCESS_RANK: Record<ClientAccessLevel, number> = {
  read: 0,
  upload: 1,
  review: 2,
  admin: 3,
};

export const PERMISSIONS = [
  // Organization-scoped
  'organization:update',
  'organization:delete',
  'member:invite',
  'member:update_role',
  'member:remove',
  'client:create',
  'client_access:grant',
  'audit:view',

  // Client-scoped
  'client:view',
  'client:update',
  'client:archive',
  'document:upload',
  'document:view',
  'document:archive',
  'invoice:view',
  'invoice:edit',
  'invoice:approve',
  'invoice:reject',
  'invoice:retry_extraction',
  'bank_statement:import',
  'bank_transaction:view',
  'reconciliation:suggest',
  'reconciliation:confirm',
  'reconciliation:reverse',
  'export:create',
  'export:download',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Permissions that act on a single client's data and therefore require a
 * resolved client context before they can be granted to a `client_user`.
 */
const CLIENT_SCOPED_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'client:view',
  'client:update',
  'client:archive',
  'document:upload',
  'document:view',
  'document:archive',
  'invoice:view',
  'invoice:edit',
  'invoice:approve',
  'invoice:reject',
  'invoice:retry_extraction',
  'bank_statement:import',
  'bank_transaction:view',
  'reconciliation:suggest',
  'reconciliation:confirm',
  'reconciliation:reverse',
  'export:create',
  'export:download',
]);

export function isClientScopedPermission(permission: Permission): boolean {
  return CLIENT_SCOPED_PERMISSIONS.has(permission);
}

// ---------------------------------------------------------------------------
// Role matrix
// ---------------------------------------------------------------------------

const REVIEWER_PERMISSIONS: readonly Permission[] = [
  'client:view',
  'document:upload',
  'document:view',
  'document:archive',
  'invoice:view',
  'invoice:edit',
  'invoice:approve',
  'invoice:reject',
  'invoice:retry_extraction',
  'bank_statement:import',
  'bank_transaction:view',
  'reconciliation:suggest',
  'reconciliation:confirm',
  'reconciliation:reverse',
  'export:create',
  'export:download',
];

/**
 * An operator prepares work for review but never ratifies it. The absence of
 * invoice:approve and reconciliation:confirm here is the enforcement point for
 * "never automatically approve AI-extracted financial data" at the role level:
 * the staff member doing bulk data entry structurally cannot sign it off.
 */
const OPERATOR_PERMISSIONS: readonly Permission[] = [
  'client:view',
  'document:upload',
  'document:view',
  'invoice:view',
  'invoice:edit',
  'bank_statement:import',
  'bank_transaction:view',
  'reconciliation:suggest',
];

/**
 * A client_user is an EXTERNAL party -- a staff member at the CA firm's client
 * company, logging into the same application as the firm itself. The blast
 * radius is wider than for any internal role, so the grant is deny-by-default
 * and deliberately tiny: see their own documents and invoices, upload more.
 *
 * Specifically withheld: approvals, reconciliation, exports, the audit log, the
 * team list, and any visibility into other clients of the same firm.
 */
const CLIENT_USER_PERMISSIONS: readonly Permission[] = [
  'client:view',
  'document:upload',
  'document:view',
  'invoice:view',
];

const ADMIN_PERMISSIONS: readonly Permission[] = PERMISSIONS.filter(
  // Destroying the workspace stays with the owner.
  (permission) => permission !== 'organization:delete',
);

const ROLE_PERMISSIONS: Record<OrganizationRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>(PERMISSIONS),
  admin: new Set<Permission>(ADMIN_PERMISSIONS),
  reviewer: new Set<Permission>(REVIEWER_PERMISSIONS),
  operator: new Set<Permission>(OPERATOR_PERMISSIONS),
  client_user: new Set<Permission>(CLIENT_USER_PERMISSIONS),
};

/**
 * Minimum client access level a `client_user` needs per permission.
 *
 * A permission absent from this map is never available to a client_user, even
 * if some future edit mistakenly adds it to CLIENT_USER_PERMISSIONS -- the two
 * structures must agree, and can() requires both.
 */
const CLIENT_USER_MIN_ACCESS: Partial<Record<Permission, ClientAccessLevel>> = {
  'client:view': 'read',
  'document:view': 'read',
  'invoice:view': 'read',
  'document:upload': 'upload',
};

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface AuthorizationContext {
  role: OrganizationRole;

  /**
   * Resolved membership status. Required rather than optional so that every
   * call site must have actually looked it up -- docs/SECURITY.md section 3
   * requires suspended and removed members to lose access immediately, and an
   * optional field makes that easy to forget.
   */
  membershipStatus: MembershipStatus;

  /**
   * The caller's access level on the client being acted upon, or null when the
   * operation is organization-scoped. Mandatory for a client_user.
   */
  clientAccessLevel?: ClientAccessLevel | null;
}

export function can(context: AuthorizationContext, permission: Permission): boolean {
  // Only an active membership carries any authority. 'invited' has not been
  // accepted yet; 'suspended' and 'removed' have had it withdrawn.
  if (context.membershipStatus !== 'active') {
    return false;
  }

  if (!ROLE_PERMISSIONS[context.role].has(permission)) {
    return false;
  }

  if (context.role === 'client_user') {
    // Belt and braces: a client_user may only ever hold client-scoped
    // permissions, whatever the role matrix above happens to say.
    if (!isClientScopedPermission(permission)) {
      return false;
    }

    const required = CLIENT_USER_MIN_ACCESS[permission];
    if (required === undefined) {
      return false;
    }

    const granted = context.clientAccessLevel;
    if (granted === null || granted === undefined) {
      return false;
    }

    return CLIENT_ACCESS_RANK[granted] >= CLIENT_ACCESS_RANK[required];
  }

  return true;
}

/** Raised when an authorization check fails. Maps to HTTP 403. */
export class ForbiddenError extends Error {
  readonly permission: Permission;

  constructor(permission: Permission) {
    // Message is intentionally generic -- it must not reveal whether the
    // record exists (docs/APP_FLOW.md section 8).
    super('You do not have permission to perform this action.');
    this.name = 'ForbiddenError';
    this.permission = permission;
  }
}

/** Throwing form of can(), for use at the top of a server action or route. */
export function requirePermission(
  context: AuthorizationContext,
  permission: Permission,
): void {
  if (!can(context, permission)) {
    throw new ForbiddenError(permission);
  }
}

/**
 * Every permission a role can hold, ignoring client scope.
 *
 * For building UI affordances only. Hiding a button is not a security control
 * (docs/SECURITY.md section 3) -- the server must still call requirePermission.
 */
export function permissionsForRole(role: OrganizationRole): readonly Permission[] {
  return PERMISSIONS.filter((permission) => ROLE_PERMISSIONS[role].has(permission));
}
