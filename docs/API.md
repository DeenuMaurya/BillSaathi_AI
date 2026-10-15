# API Design
## BillSaathi AI

Use Next.js App Router route handlers for operations requiring HTTP boundaries, uploads, external provider calls or downloadable exports. Server actions may be used for simpler mutations, but must enforce identical authentication and authorization rules.

## 1. Proposed endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/organizations` | List current user's workspaces |
| POST | `/api/organizations` | Create workspace and initial owner membership |
| GET | `/api/clients` | List authorized clients |
| POST | `/api/clients` | Create a client |
| GET | `/api/documents` | List documents with filters/pagination |
| POST | `/api/documents/upload` | Validate and upload a document |
| POST | `/api/documents/:id/process` | Start/retry extraction |
| GET | `/api/documents/:id` | Get authorized document details |
| PATCH | `/api/invoices/:id` | Correct invoice fields |
| POST | `/api/invoices/:id/approve` | Approve invoice |
| POST | `/api/bank-statements/import` | Import and validate statement |
| GET | `/api/bank-transactions` | List authorized transactions |
| POST | `/api/reconciliation/suggest` | Generate candidate matches |
| POST | `/api/reconciliation/:id/confirm` | Confirm allocation |
| POST | `/api/reconciliation/:id/reject` | Reject suggestion |
| POST | `/api/exports` | Start export job |
| GET | `/api/exports/:id` | Check export status / authorized download |

These are proposed routes, not existing endpoints.

## 2. Request pipeline
For every protected route:
1. Validate session server-side.
2. Resolve organization and active membership.
3. Verify role and client-level access.
4. Validate parameters and payload with Zod.
5. Confirm record ownership and organization/client consistency.
6. Perform operation with RLS/database constraints.
7. Write audit event for important mutations.
8. Return a safe response and appropriate HTTP status.

## 3. Response convention
Success:
```json
{
  "data": {
    "id": "record-uuid",
    "status": "needs_review"
  },
  "error": null
}
```

Error:
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields."
  }
}
```

Suggested error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DUPLICATE_CANDIDATE`, `PROCESSING_FAILED`, `CONFLICT`.

## 4. Operational requirements
- Paginate list endpoints.
- Validate all query filters.
- Use idempotency or robust duplicate checks for upload/import retries.
- Do not accept arbitrary status values from the browser.
- Use server-controlled storage paths.
- Do not return private storage paths or permanent public URLs.
- Limit upload, extraction and export rates.
- Ensure export queries are organization- and client-scoped.
- Return safe error messages; keep restricted diagnostics server-side.
- Use database transactions for financial allocation changes.
