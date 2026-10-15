# Database Design
## BillSaathi AI — Supabase PostgreSQL

## 1. Design principles
- Use PostgreSQL with UUID primary keys and `timestamptz` timestamps.
- Every tenant-owned row must carry `organization_id`.
- Use foreign keys and database constraints, not just frontend validation.
- Use `numeric(14,2)` or a suitable decimal type for money.
- Preserve original documents independently of extracted/corrected fields.
- A bank transaction can pay multiple invoices, and an invoice can have multiple payments; use a match/allocation table.
- Enable RLS on all tenant-owned tables.

## 2. Core tables

### `profiles`
- `id uuid primary key references auth.users(id) on delete cascade`
- `full_name text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `organizations`
- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`

### `organization_members`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('owner','admin','reviewer','operator','client_user'))`
- `status text not null default 'active' check (status in ('invited','active','suspended','removed'))`
- `joined_at timestamptz`
- `created_at timestamptz not null default now()`
- Unique `(organization_id, user_id)`

### `clients`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `name text not null`
- `gstin text`
- `pan text`
- `financial_year_start_month smallint not null default 4 check (financial_year_start_month between 1 and 12)`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`
- `created_by uuid references auth.users(id)`

### `client_access` (enable if client-level restrictions are needed)
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `client_id uuid not null references clients(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `access_level text not null check (access_level in ('read','upload','review','admin'))`
- Unique `(client_id, user_id)`

### `documents`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `uploaded_by uuid references auth.users(id)`
- `storage_path text not null`
- `original_filename text not null`
- `mime_type text not null`
- `file_size_bytes bigint not null check (file_size_bytes > 0)`
- `sha256 text`
- `document_type text not null default 'invoice'`
- `processing_status text not null default 'uploaded'`
- `created_at timestamptz not null default now()`
- `archived_at timestamptz`

### `document_processing_runs`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `document_id uuid not null references documents(id) on delete cascade`
- `provider text`
- `model text`
- `status text not null`
- `attempt_number integer not null default 1`
- `error_code text`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz`

### `invoices`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `document_id uuid not null unique references documents(id)`
- `supplier_name text`
- `supplier_gstin text`
- `invoice_number text`
- `invoice_date date`
- `currency char(3) not null default 'INR'`
- `taxable_amount numeric(14,2)`
- `cgst_amount numeric(14,2)`
- `sgst_amount numeric(14,2)`
- `igst_amount numeric(14,2)`
- `cess_amount numeric(14,2)`
- `total_amount numeric(14,2)`
- `status text not null default 'needs_review'`
- `reviewed_by uuid references auth.users(id)`
- `reviewed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Add nonnegative checks where valid for your supported invoice types, but allow explicit handling for credit notes and corrections rather than assuming all totals are positive.

### `invoice_extraction_versions`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `invoice_id uuid not null references invoices(id) on delete cascade`
- `version_number integer not null`
- `extracted_json jsonb not null`
- `provider text`
- `model text`
- `created_at timestamptz not null default now()`
- Unique `(invoice_id, version_number)`

### `bank_statements`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `uploaded_by uuid references auth.users(id)`
- `filename text not null`
- `period_start date`
- `period_end date`
- `status text not null default 'uploaded'`
- `created_at timestamptz not null default now()`

### `bank_transactions`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `bank_statement_id uuid not null references bank_statements(id)`
- `transaction_date date not null`
- `description text`
- `reference_number text`
- `debit_amount numeric(14,2) not null default 0 check (debit_amount >= 0)`
- `credit_amount numeric(14,2) not null default 0 check (credit_amount >= 0)`
- `currency char(3) not null default 'INR'`
- `import_fingerprint text`
- `created_at timestamptz not null default now()`
- Add a constraint that prevents both debit and credit being positive on the same row, if compatible with the importer’s normalized data model.

### `reconciliation_matches`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `bank_transaction_id uuid not null references bank_transactions(id)`
- `invoice_id uuid not null references invoices(id)`
- `allocated_amount numeric(14,2) not null check (allocated_amount > 0)`
- `match_score numeric(5,2)`
- `match_status text not null default 'suggested' check (match_status in ('suggested','confirmed','rejected','reversed'))`
- `reviewed_by uuid references auth.users(id)`
- `reviewed_at timestamptz`
- `created_at timestamptz not null default now()`

### `review_tasks`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid not null references clients(id)`
- `document_id uuid references documents(id)`
- `assigned_to uuid references auth.users(id)`
- `status text not null default 'open'`
- `due_at timestamptz`
- `created_at timestamptz not null default now()`

### `audit_logs`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `actor_user_id uuid references auth.users(id)`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

### `exports`
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id)`
- `client_id uuid references clients(id)`
- `requested_by uuid references auth.users(id)`
- `export_type text not null`
- `filters jsonb not null default '{}'::jsonb`
- `status text not null default 'queued'`
- `storage_path text`
- `expires_at timestamptz`
- `created_at timestamptz not null default now()`

## 3. Relationship summary
- One organization has many members and clients.
- One client has many documents and bank statements.
- A document may produce one invoice record; extraction attempts are stored separately.
- A bank statement has many transactions.
- Reconciliation matches link transactions to invoices and store allocated amounts.
- An organization has many audit events and export jobs.

## 4. Important indexes
- Unique `(organization_id, user_id)` on organization membership.
- `clients (organization_id, status)`.
- `documents (organization_id, client_id, created_at desc)`.
- `documents (organization_id, sha256)`.
- `invoices (organization_id, client_id, invoice_date)`.
- `bank_transactions (organization_id, client_id, transaction_date)`.
- `reconciliation_matches (organization_id, bank_transaction_id)`.
- `audit_logs (organization_id, created_at desc)`.

## 5. Data integrity requirements
- Verify document/client/organization relationships match on every write.
- Verify invoice/client/organization relationships match on every write.
- Verify transaction, invoice and match belong to the same client and organization.
- Prevent confirmed allocations from exceeding transaction amount or invoice outstanding balance.
- Use transactions/locking for concurrent confirmations.
- Duplicate detection should consider client, normalized supplier GSTIN and invoice number; missing invoice numbers and credit notes require review logic.
- Store currency explicitly and use decimal-safe arithmetic in application code.
- Audit important edits, approvals, reversals and exports.

## 6. RLS
Enable RLS for every tenant-owned table. Write SELECT/INSERT/UPDATE/DELETE policies appropriate to each role. Membership alone is not enough when client-level restrictions are enabled. Test with two separate organizations and users who belong to one, both, or neither organization.

This document is a logical schema specification. Implement it as reviewed, versioned SQL migrations and test all constraints and policies before production.
