# Security Specification
## BillSaathi AI

## 1. Security objectives
- Prevent cross-organization data access.
- Protect invoices, GST details and bank transaction data.
- Keep uploaded files private.
- Prevent unauthorized financial edits and approvals.
- Treat OCR/LLM output as untrusted until validated.
- Provide traceability for sensitive operations.

## 2. Trust boundaries
1. Browser/client: untrusted; never trust submitted organization IDs, client IDs, roles or financial statuses.
2. Next.js server: validates session, permissions, inputs and business rules.
3. PostgreSQL: RLS, foreign keys, checks and unique constraints enforce data boundaries.
4. Storage: private buckets and scoped access.
5. OCR/LLM providers: external processors; send only necessary data and review retention terms.
6. Uploaded files and extracted text: untrusted input.

## 3. Authentication and authorization
- Use Supabase Auth.
- Validate the session server-side for every protected operation.
- Verify organization membership and active status.
- Enforce role permissions and client-level access where applicable.
- Enable RLS on all tenant-owned tables.
- Use server-side checks and RLS together.
- Do not treat hidden buttons or frontend route guards as security controls.
- Prevent removing/demoting the last organization owner.
- Revoke access promptly when membership is suspended or removed.

## 4. Storage and upload controls
- Permit only required formats: PDF/JPEG/PNG for invoices and CSV/XLSX for statements.
- Check extension, MIME type and file signature.
- Enforce configurable size, page and row limits.
- Generate storage keys on the server; do not use original filenames as keys.
- Keep buckets private.
- Generate short-lived signed URLs only after authorization.
- Never expose permanent public links to customer documents.
- Avoid executing uploaded content; consider malware scanning and isolated parsing for production.
- Rate-limit uploads and processing requests.
- Ensure object paths, database metadata and client/organization ownership agree.

## 5. Secrets and APIs
- Store secrets in server-only environment variables.
- Never expose service-role keys or AI provider keys through `NEXT_PUBLIC_` variables.
- Do not log secrets or print environment values.
- Validate route parameters and bodies using Zod or equivalent.
- Apply rate limits to authentication-related custom endpoints, uploads, AI extraction and exports.
- Use HTTPS in production and configure allowed origins appropriately.
- Use least-privilege access for hosting, database and provider accounts.
- Return safe errors to clients; restrict internal diagnostics.

## 6. AI/OCR controls
- Treat invoice contents as data, never as trusted instructions.
- Do not allow document text to trigger privileged tools, arbitrary SQL or external requests.
- Require schema-validated structured output.
- Validate dates, GSTIN format, amounts and required fields.
- Preserve missing values as null; do not invent values.
- Keep extraction provider/model/status metadata and useful error codes.
- Avoid logging full invoice text or unnecessary personal/financial data.
- Preserve source files and extraction history.
- Never auto-approve invoice data or payment matches in the MVP.
- Review provider retention, model-training, processing-location and contractual privacy terms.

## 7. Financial safeguards
- Use PostgreSQL numeric/decimal types and decimal-safe application calculations.
- Enforce match allocations and outstanding balances in server/database logic.
- Use transactions and locking where concurrent reconciliation could cause over-allocation.
- Handle partial payments, combined payments, refunds, reversals and credit notes explicitly.
- Audit edits, approvals, match confirmation/reversal and exports.
- Never imply that OCR alone proves GST compliance, deductibility or input tax credit eligibility.

## 8. Audit and logging
Log important actions with actor, organization, entity, action and timestamp. Store minimal metadata needed for accountability. Do not log passwords, access tokens, full bank account numbers or unnecessary source content. Restrict audit-log reads and avoid letting ordinary users edit or delete audit events.

## 9. Privacy and incident readiness
Before paid production:
- Publish a privacy notice and appropriate customer terms.
- Document purposes, retention and deletion rules.
- Define export, correction and deletion request handling.
- Review applicable Indian data-protection and contractual obligations with qualified counsel.
- Define an incident response process for compromised accounts and data exposure.
- Review backups, restore procedures and access logs.
- Document data sharing with OCR/LLM providers.

## 10. Required security tests
- User from organization A cannot read/update organization B's rows.
- A user cannot forge a different organization_id or client_id.
- Removed members lose access.
- Unauthorized roles cannot approve invoices or confirm matches.
- Private storage cannot be accessed without valid authorization.
- Expired signed URLs stop working.
- Invalid and oversized files are rejected.
- AI output cannot set unauthorized status or fields.
- Concurrent match confirmations cannot over-allocate balances.
- Exports contain only authorized records and expire as configured.

## 11. Release rule
Do not launch with real customer financial records until RLS, role checks, private storage, server-only secrets and cross-tenant tests have been reviewed and passed.
