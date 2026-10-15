# Application Flow
## BillSaathi AI

## 1. Onboarding flow
1. Visitor opens the app.
2. Visitor signs up or signs in.
3. Email is verified as configured.
4. User creates an organization or accepts an invitation.
5. Organization creator is assigned owner through a trusted server-side workflow.
6. Owner adds the first client company.
7. Owner invites staff and assigns appropriate roles.
8. User lands on the dashboard.

## 2. Dashboard
Show actionable work:
- Documents waiting for review.
- Failed processing jobs.
- Duplicate candidates.
- Unmatched bank transactions.
- Recent approvals and exports.
- Workload grouped by client.

Do not present unreviewed AI output as final accounting data.

## 3. Invoice upload and extraction
1. User selects an authorized client.
2. User uploads a PDF/JPEG/PNG.
3. Server checks authorization, extension, MIME type, file signature and limits.
4. Server creates a unique storage path and stores the original in a private bucket.
5. Server creates a document record.
6. Processing extracts embedded PDF text first when feasible; OCR is used for scanned/image content.
7. An extraction adapter asks the selected model/provider for structured fields.
8. Server validates JSON shape, dates, GSTIN format and monetary fields.
9. Duplicate detection generates candidates.
10. Document is marked `needs_review` or `failed`.
11. Reviewer compares source and fields, corrects values and approves/rejects.
12. Approval is recorded in an audit log.
13. Approved data becomes available for exports and reconciliation.

## 4. Invoice review UI
Recommended layout:
- Left: PDF/image preview.
- Right: editable structured fields.
- Clearly mark missing, invalid or low-confidence values.
- Show duplicate candidates with links to existing records.
- Actions: Save draft, Approve, Reject, Retry extraction (authorized roles only).
- Show processing and review history.
- Never auto-approve low-confidence or unverified fields.

## 5. Bank statement import
1. User selects an authorized client.
2. User uploads CSV/XLSX.
3. Server validates file type and size.
4. UI previews rows and lets the user map date, description, reference, debit and credit columns.
5. Validate dates, numeric amounts and required fields.
6. Show invalid rows with reasons before import.
7. Normalize valid rows and store the statement batch and transactions.
8. Detect likely duplicate rows using an import fingerprint plus contextual fields.
9. Report inserted, skipped and invalid row counts.

## 6. Reconciliation
1. Select unmatched bank transactions.
2. Generate candidate invoices using amount, date proximity, supplier/reference similarity and outstanding balance.
3. Show why each candidate was suggested.
4. Reviewer confirms, rejects or enters a partial allocation.
5. Server validates that invoice, transaction, client and organization match.
6. Server checks outstanding invoice and transaction balances.
7. Save allocation in a transaction with appropriate locking.
8. Write audit event.
9. Allow reversal through an explicit, audited action.

Matching score is advisory. Avoid auto-confirmation in v1. Support one transaction paying multiple invoices and multiple transactions settling one invoice.

## 7. Export flow
1. Authorized user selects client, date range and export type.
2. Server verifies permissions and selects permitted/approved records.
3. Generate CSV/XLSX and optionally a ZIP of supporting files.
4. Store export privately.
5. Create export record with status and expiry.
6. Log the export request/completion.
7. Authorize the download and generate a short-lived signed URL.
8. Expire/delete the export according to retention policy.

## 8. Failure flows
- Invalid file: reject with a clear, safe reason.
- OCR/LLM failure: preserve original file, record failure and offer authorized retry.
- Partial extraction: save known fields and mark for review.
- Duplicate candidate: show the existing record; do not silently delete.
- Invalid bank row: report row and reason; permit correction/re-import.
- Conflicting reconciliation: reject or refresh based on current balances.
- Permission failure: return 401/403 without exposing record contents.
- Export failure: record status and safe error code; allow retry.

## 9. Suggested navigation
Dashboard
- Clients
- Documents
- Invoices
- Bank Statements
- Reconciliation
- Exports
- Team
- Settings
- Audit Log

All navigation is scoped to the active organization and current user's permissions.
