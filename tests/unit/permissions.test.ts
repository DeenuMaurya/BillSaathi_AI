import { describe, expect, it } from 'vitest';
import {
  type AuthorizationContext,
  type ClientAccessLevel,
  ForbiddenError,
  type OrganizationRole,
  PERMISSIONS,
  type Permission,
  can,
  isClientScopedPermission,
  permissionsForRole,
  requirePermission,
} from '@/lib/auth/permissions';

/** Active membership with no client scope resolved. */
function orgContext(role: OrganizationRole): AuthorizationContext {
  return { role, membershipStatus: 'active' };
}

/** Active membership scoped to a client at a given access level. */
function clientContext(
  role: OrganizationRole,
  clientAccessLevel: ClientAccessLevel,
): AuthorizationContext {
  return { role, membershipStatus: 'active', clientAccessLevel };
}

describe('membership status gates everything', () => {
  it.each(['invited', 'suspended', 'removed'] as const)(
    'denies every permission to an owner whose membership is %s',
    (membershipStatus) => {
      // docs/SECURITY.md section 3: revoke access promptly when membership is
      // suspended or removed. Role is irrelevant once status is not active.
      const context: AuthorizationContext = { role: 'owner', membershipStatus };

      for (const permission of PERMISSIONS) {
        expect(can(context, permission)).toBe(false);
      }
    },
  );

  it('grants an active owner every permission', () => {
    for (const permission of PERMISSIONS) {
      expect(can(orgContext('owner'), permission)).toBe(true);
    }
  });
});

describe('owner and admin', () => {
  it('reserves organization deletion to the owner', () => {
    expect(can(orgContext('owner'), 'organization:delete')).toBe(true);
    expect(can(orgContext('admin'), 'organization:delete')).toBe(false);
  });

  it('lets an admin do everything else', () => {
    for (const permission of PERMISSIONS) {
      if (permission === 'organization:delete') continue;
      expect(can(orgContext('admin'), permission)).toBe(true);
    }
  });
});

describe('operator cannot ratify financial data', () => {
  // The structural guarantee behind "never auto-approve AI-extracted financial
  // data": the role doing bulk data entry cannot sign it off.
  it.each([
    'invoice:approve',
    'invoice:reject',
    'reconciliation:confirm',
    'reconciliation:reverse',
  ] as const)('denies %s to an operator', (permission) => {
    expect(can(orgContext('operator'), permission)).toBe(false);
  });

  it('still lets an operator prepare work', () => {
    expect(can(orgContext('operator'), 'document:upload')).toBe(true);
    expect(can(orgContext('operator'), 'invoice:edit')).toBe(true);
    expect(can(orgContext('operator'), 'reconciliation:suggest')).toBe(true);
  });

  it('denies an operator exports and the audit log', () => {
    expect(can(orgContext('operator'), 'export:create')).toBe(false);
    expect(can(orgContext('operator'), 'export:download')).toBe(false);
    expect(can(orgContext('operator'), 'audit:view')).toBe(false);
  });

  it('denies an operator any member management', () => {
    expect(can(orgContext('operator'), 'member:invite')).toBe(false);
    expect(can(orgContext('operator'), 'member:update_role')).toBe(false);
    expect(can(orgContext('operator'), 'member:remove')).toBe(false);
  });
});

describe('reviewer', () => {
  it('can approve invoices and confirm matches', () => {
    expect(can(orgContext('reviewer'), 'invoice:approve')).toBe(true);
    expect(can(orgContext('reviewer'), 'reconciliation:confirm')).toBe(true);
    expect(can(orgContext('reviewer'), 'reconciliation:reverse')).toBe(true);
  });

  it('cannot manage members or delete the organization', () => {
    expect(can(orgContext('reviewer'), 'member:invite')).toBe(false);
    expect(can(orgContext('reviewer'), 'organization:update')).toBe(false);
    expect(can(orgContext('reviewer'), 'organization:delete')).toBe(false);
  });

  it('cannot create clients', () => {
    expect(can(orgContext('reviewer'), 'client:create')).toBe(false);
  });
});

describe('client_user is deny-by-default', () => {
  it('gets nothing without a resolved client access level', () => {
    // An external user with no grant on the client must see nothing, even for
    // permissions their role nominally holds.
    for (const permission of PERMISSIONS) {
      expect(can(orgContext('client_user'), permission)).toBe(false);
    }
  });

  it('gets nothing when the access level is explicitly null', () => {
    const context: AuthorizationContext = {
      role: 'client_user',
      membershipStatus: 'active',
      clientAccessLevel: null,
    };

    for (const permission of PERMISSIONS) {
      expect(can(context, permission)).toBe(false);
    }
  });

  it('can read at access level read', () => {
    const context = clientContext('client_user', 'read');
    expect(can(context, 'client:view')).toBe(true);
    expect(can(context, 'document:view')).toBe(true);
    expect(can(context, 'invoice:view')).toBe(true);
  });

  it('cannot upload at access level read', () => {
    expect(can(clientContext('client_user', 'read'), 'document:upload')).toBe(false);
  });

  it('can upload from access level upload onwards', () => {
    expect(can(clientContext('client_user', 'upload'), 'document:upload')).toBe(true);
    expect(can(clientContext('client_user', 'review'), 'document:upload')).toBe(true);
    expect(can(clientContext('client_user', 'admin'), 'document:upload')).toBe(true);
  });

  it('never approves, reconciles or exports — even at access level admin', () => {
    // The highest client access level must not promote an external party into
    // an internal reviewer. This is the role matrix refusing, not the scope
    // check, so no access level can unlock it.
    const context = clientContext('client_user', 'admin');

    const withheld: readonly Permission[] = [
      'invoice:approve',
      'invoice:reject',
      'invoice:edit',
      'invoice:retry_extraction',
      'reconciliation:suggest',
      'reconciliation:confirm',
      'reconciliation:reverse',
      'export:create',
      'export:download',
      'bank_statement:import',
      'bank_transaction:view',
      'document:archive',
      'client:update',
      'client:archive',
    ];

    for (const permission of withheld) {
      expect(can(context, permission)).toBe(false);
    }
  });

  it('never sees the audit log, the team, or other clients', () => {
    const context = clientContext('client_user', 'admin');
    expect(can(context, 'audit:view')).toBe(false);
    expect(can(context, 'member:invite')).toBe(false);
    expect(can(context, 'member:remove')).toBe(false);
    expect(can(context, 'client:create')).toBe(false);
    expect(can(context, 'client_access:grant')).toBe(false);
    expect(can(context, 'organization:update')).toBe(false);
  });

  it('holds only client-scoped permissions', () => {
    const held = permissionsForRole('client_user');
    expect(held.length).toBeGreaterThan(0);

    for (const permission of held) {
      expect(isClientScopedPermission(permission)).toBe(true);
    }
  });
});

describe('internal roles are unaffected by client access level', () => {
  it('lets a reviewer approve without a client grant', () => {
    // client_access restricts client_user. Internal roles derive authority from
    // organization membership; the caller still has to verify the record
    // belongs to the organization.
    expect(can(orgContext('reviewer'), 'invoice:approve')).toBe(true);
    expect(can(clientContext('reviewer', 'read'), 'invoice:approve')).toBe(true);
  });
});

describe('requirePermission', () => {
  it('passes silently when allowed', () => {
    expect(() => requirePermission(orgContext('reviewer'), 'invoice:approve')).not.toThrow();
  });

  it('throws ForbiddenError when denied', () => {
    expect(() => requirePermission(orgContext('operator'), 'invoice:approve')).toThrow(
      ForbiddenError,
    );
  });

  it('does not leak whether the record exists', () => {
    try {
      requirePermission(orgContext('operator'), 'invoice:approve');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).message).toBe(
        'You do not have permission to perform this action.',
      );
      // The permission is retained for server-side logging, not for the client.
      expect((error as ForbiddenError).permission).toBe('invoice:approve');
    }
  });
});
