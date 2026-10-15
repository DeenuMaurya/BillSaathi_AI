# Claude Code Implementation Prompt

Act as a senior full-stack engineer and application security architect.

We are building BillSaathi AI, an India-focused invoice extraction and bank-statement reconciliation SaaS for CA firms and bookkeepers.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS and shadcn/ui
- Supabase PostgreSQL, Auth and private Storage
- Zod validation
- Server-side OCR/LLM adapter for structured invoice extraction
- Version-controlled SQL migrations
- Automated tests for authorization and financial logic

## Architecture requirements
1. Multi-tenant organization and client model.
2. Organization roles: owner, admin, reviewer, operator and client_user.
3. Client-specific access restrictions where enabled.
4. Supabase RLS on every tenant-owned table.
5. Private storage with short-lived signed URLs.
6. Server-only provider secrets.
7. Decimal-safe monetary calculations.
8. Immutable original documents and preserved extraction history.
9. Human approval for invoice data and reconciliation matches.
10. Audit logs for important business operations.
11. Duplicate detection that flags candidates rather than silently deleting data.
12. CSV/XLSX bank import, partial payments and multi-invoice reconciliation.
13. Export only authorized, approved records.

## Security rules
- Never expose Supabase service-role or OCR/LLM secrets in client-side code.
- Never trust organization_id or client_id submitted by the browser without server-side authorization.
- Use RLS and server-side permission checks together.
- Validate uploads, request payloads and AI output.
- Do not invent missing invoice values.
- Never auto-approve financial records.
- Preserve audit history for corrections, approvals and reversals.
- Do not implement direct banking, automatic email scanning or GST return filing in the MVP.

## Working procedure
FIRST inspect the existing repository, package manager, Git status, installed dependencies, environment-variable names and current project structure.

Do not delete, overwrite or replace existing working code without explaining why and obtaining my approval for destructive changes.

Then:
1. Summarize the current architecture and any existing work.
2. Map the specification to the existing project.
3. Identify security risks and unresolved design decisions.
4. Propose the initial migrations and folder structure.
5. List commands and manual setup required.

Implement only Milestone 1: application foundation, Supabase client setup, authentication screens and the minimal authenticated session flow. Do not implement all database entities, AI extraction or reconciliation in this milestone.

Use safe environment-variable placeholders. Do not print secret values into logs or documentation.

Run available lint, type-check and tests. Add tests for implemented behavior. Clearly report what passed, what failed, what remains incomplete and which manual configuration steps I must perform.

Wait for my review before starting Milestone 2.
