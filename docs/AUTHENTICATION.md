# Authentication and Authorization
## BillSaathi AI

## 1. Provider
Use Supabase Auth. Do not implement password storage or custom session management.

## 2. MVP authentication features
- Email/password sign up and sign in.
- Email verification.
- Password reset.
- Session refresh and logout.
- Organization creation.
- Invitation flow for team members.
- Optional social login later, based on user demand.

## 3. Identity versus membership
Authentication answers: “Who is the user?”
Authorization answers: “Which organization/client can the user access, and what can they do?”

Keep application profile data in `profiles`, linked to `auth.users`. Store organization roles in `organization_members`, not in a user-editable profile field. If client-specific restrictions are enabled, use `client_access`.

## 4. Roles
- `owner`: manages organization and ownership.
- `admin`: manages settings, members within policy, clients and workflows.
- `reviewer`: reviews/approves invoices and reconciliation suggestions.
- `operator`: uploads documents and prepares records for review.
- `client_user`: accesses only explicitly authorized client data.

Define permissions centrally in server-side code. UI visibility is for usability, not security.

## 5. Sign-in flow
1. User opens the application.
2. If no valid session exists, redirect to sign-in.
3. User signs in or registers through Supabase Auth.
4. Require email verification according to the project's Auth settings.
5. Resolve active organization memberships server-side.
6. If the user has no membership, offer organization creation or invitation acceptance.
7. If multiple memberships exist, let the user choose a workspace.
8. Load only authorized clients and records.
9. Validate authorization again for every server action/API request.

## 6. Organization creation
- Create the organization through a trusted server-side operation.
- Add the creator as the initial owner in the same safe workflow.
- Avoid a state where an organization exists without a valid owner.
- Slug uniqueness must be enforced in PostgreSQL.
- Do not allow the browser to assign itself an owner/admin role through arbitrary membership inserts.

## 7. Invitations
- Only authorized owners/admins can invite members.
- Validate invitation email and requested role.
- Use a secure, expiring invitation mechanism.
- Verify the invitee identity before activating membership.
- Prevent invitation reuse after acceptance/expiry.
- Log invitations, acceptance, revocation and role changes.
- Re-check the inviting user's permission when the invitation is accepted if appropriate to the implementation.

## 8. Permission enforcement
For every protected operation:
1. Validate the session server-side.
2. Resolve the active organization.
3. Confirm active membership.
4. Check the role against a centralized permission rule.
5. Verify client-level access if enabled.
6. Confirm record ownership and organization/client consistency.
7. Perform the operation using RLS and database constraints.
8. Write an audit event for sensitive changes.

## 9. Supabase RLS example
This is a pattern for client reads, not a complete production policy:

```sql
alter table public.clients enable row level security;

create policy "Members can view authorized clients"
on public.clients
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);
```

Create separate insert/update/delete policies. Use `WITH CHECK` for writes and restrict them by role. Add client-access conditions when needed. Avoid recursive RLS policy designs; test helper functions carefully if using them.

## 10. Session and account safety
- Use the framework-supported Supabase SSR/browser client patterns.
- Never expose the service-role key in browser code.
- Do not store session secrets in custom local storage.
- Require re-authentication for especially sensitive account/ownership changes where appropriate.
- Ensure removed/suspended members lose access.
- Configure session expiry and email settings intentionally.
- Provide safe password-reset responses that do not disclose whether an email exists.

## 11. Required tests
- Anonymous user cannot access protected pages or APIs.
- Verified user can access only active memberships.
- User cannot self-promote to owner/admin.
- User cannot access another organization by changing a UUID.
- Client users cannot access unassigned clients.
- Removed member cannot continue using application APIs.
- Only reviewers and higher permitted roles can approve invoices.
- Only authorized roles can manage invitations and members.
- Last owner cannot be removed without an ownership transfer.

Implement and test these rules before connecting real customer documents.
