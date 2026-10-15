# Product Requirements Document (PRD)
## BillSaathi AI — MVP v1.0

## 1. Product summary
BillSaathi AI helps Indian CA firms, accountants and bookkeepers organize client invoices, extract structured invoice fields, review results, import bank statements, suggest payment matches and export approved records.

## 2. Problem
Invoices arrive as PDFs, scans, images, email attachments and other files. Staff manually enter invoice details, organize evidence, check duplicates, compare payments and prepare accounting records. This work is repetitive and prone to entry errors.

## 3. Goals
1. Reduce manual invoice data entry.
2. Organize documents by firm and client.
3. Extract common Indian GST invoice fields.
4. Provide a clear human-review workflow.
5. Import CSV/XLSX bank statements and suggest possible matches.
6. Export approved records and supporting documents.
7. Maintain tenant isolation and an audit trail.

## 4. Target users
- CA firm owner / organization owner
- Organization administrator
- Accountant or reviewer
- Data-entry operator
- Client user with restricted access

## 5. MVP scope
### Included
- Email/password authentication, email verification and password reset.
- Organization creation and team membership.
- Client company management.
- PDF/JPEG/PNG invoice upload and private storage.
- Invoice field extraction: supplier name/GSTIN, invoice number/date, taxable amount, CGST, SGST, IGST, cess and total.
- Editable review screen with source-document preview.
- Missing-field validation and duplicate-candidate warnings.
- CSV/XLSX bank-statement import, column mapping and row validation.
- Reconciliation suggestions with human confirmation/rejection.
- Approved-record CSV/XLSX exports and supporting-document downloads.
- Audit history for important actions.

### Excluded from v1
- Automatic Gmail/Outlook/WhatsApp ingestion.
- Direct bank connections or payment initiation.
- GST return filing or tax advice.
- Full accounting ledger, payroll, inventory or ERP.
- Automatic approval of AI results.
- Full Tally API integration; provide structured exports first.
- Native mobile apps.

## 6. User stories
- As a CA owner, I can create a firm workspace and add client companies.
- As an admin, I can invite staff and assign roles.
- As an operator, I can upload invoices to the correct client.
- As a reviewer, I can compare extracted fields with the source and correct them.
- As a reviewer, I can see possible duplicates before approval.
- As an accountant, I can import a bank statement and map its columns.
- As a reviewer, I can confirm, reject or partially allocate a suggested payment match.
- As an authorized user, I can export approved records.
- As an organization owner, I can inspect important changes and approvals.

## 7. Main screens
1. Sign in / sign up / password reset
2. Onboarding and organization creation
3. Dashboard and pending work
4. Client list and client detail
5. Document list and upload
6. Invoice review
7. Bank statement import
8. Bank transactions
9. Reconciliation review
10. Exports
11. Team and settings
12. Audit log

## 8. Invoice statuses
Suggested states: `uploaded`, `processing`, `needs_review`, `approved`, `failed`, `rejected`, `duplicate_candidate`. Define allowed transitions in application logic; do not let arbitrary client input set status.

## 9. Reconciliation statuses
Suggested states: `suggested`, `confirmed`, `rejected`, `reversed`. Partial payment allocations should be represented by allocation amounts, not a simplistic one-invoice/one-transaction relationship.

## 10. Acceptance criteria
- Users can create an organization and client.
- Cross-organization access is denied even if a user changes a record UUID or URL.
- Supported files can be uploaded to private storage.
- Extracted values can be reviewed, corrected and approved by an authorized role.
- Missing values remain unknown instead of being invented.
- Duplicate candidates are flagged without silently deleting data.
- CSV/XLSX statement imports validate rows and report failures.
- Match suggestions require human confirmation.
- Financial values are calculated with decimal-safe arithmetic.
- Exports contain only authorized records and approved data where appropriate.
- Audit records exist for edits, approvals, reversals and exports.
- Automated tests cover RLS, role permissions, uploads and reconciliation edge cases.

## 11. Success metrics
Measure before/after time per invoice, required-field extraction accuracy, correction rate, duplicate-detection usefulness, confirmed-match precision, export success, weekly active firms and pilot-to-paid conversion. Do not claim accuracy targets until measured against a representative sample.

## 12. Pilot plan
Interview 10–15 CA firms/bookkeepers, recruit 3–5 pilot users, and test a consented batch of 50–100 documents. Compare manual time and error rates with the prototype. Collect feedback before adding costly integrations.

## 13. Pricing experiments
Illustrative hypotheses only, not validated pricing: Solo ₹299–₹499/month, Business ₹999–₹1,999/month, CA Practice ₹2,499–₹7,499/month. Validate willingness to pay during pilots.

## 14. Product guardrails
The app is a document workflow and reconciliation assistant, not a guarantee of GST compliance, deductibility or input tax credit eligibility. Financial and tax decisions remain with qualified users.
