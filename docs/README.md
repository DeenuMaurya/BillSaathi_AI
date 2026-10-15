# BillSaathi AI — Project Documentation

India-focused invoice extraction and bank-statement reconciliation SaaS for CA firms and bookkeepers.

## Documents
- [Product Requirements Document](./PRD.md)
- [Database Design](./DATABASE.md)
- [Security Specification](./SECURITY.md)
- [Authentication and Authorization](./AUTHENTICATION.md)
- [Application Flow](./APP_FLOW.md)
- [API Design](./API.md)
- [Claude Code Implementation Prompt](./CLAUDE_CODE_PROMPT.md)

## Suggested stack
Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/private Storage, and Zod.

## Product principles
- Multi-tenant isolation is mandatory.
- Original documents remain preserved.
- AI extraction and reconciliation are suggestions until a human approves them.
- Use decimal-safe financial calculations.
- Begin with CSV/XLSX import/export; defer direct bank and accounting integrations.
- Build and test in milestones rather than generating the whole app at once.

These documents are the proposed specification, not proof that the application or its security controls have already been implemented.
