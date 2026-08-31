# AGENTS.md

This file provides development standards, architectural rules, and operational guidance when working in the `shopwus-api` codebase.

---

# MANDATORY: Check When Done — NEVER SKIP THIS
AFTER EVERY CODE CHANGE, WITHOUT EXCEPTION, YOU MUST:
1. **No Magic Strings Allowed** — Define named constants, enums, or configuration maps in `src/config/constants/`.
2. **Types & Schemas in Designated Sections** — Move DTOs and response interfaces to `dto/` or `src/types/`, and Zod schemas to `schema/`. Never declare inline types or ad-hoc interfaces in controllers or route definitions.
3. **Scan Related Files** — Check route registrations, controller calls, service functions, DTO serializers, Zod schemas, sibling services, and background workers for anything missing, broken, or inconsistent with your change.
4. **Briefly Explain Changes** — Provide a concise summary of the problem, the fix applied, and any important architectural considerations.
5. **Call Out Breaking Changes** — Explicitly warn if a change impacts DB schema, Prisma migrations, API response contracts, job payload shapes, or authentication.
6. **Run Verification Suite**:
   - `npm run lint` / `npm run format` (Biome linting and formatting)
   - `npm run check` (`tsc --noEmit` type checking)
   - `npm run test:unit` (Jest unit test suite)
7. **End With Completion Confirmation** — End with a one-line statement confirming whether anything important is missing: `"Nothing important appears to be missing."`

---

# CORE BACKEND RULES

- **STANDALONE & INDEPENDENT DEPLOYMENT:**
  `shopwus-api` is a 100% standalone, independently deployed project. It MUST NOT depend on `shopwus-web` or any shared root monorepo packages. All types, DTOs, schemas, and configurations must remain completely self-contained within this repository. No workspace symlinks, shared packages, or cross-project dependencies are permitted.

- **STRICT ARCHITECTURAL PLACEMENT & MODULAR BOUNDARIES:**
  Everything in the codebase MUST be defined strictly in its designated architectural layer without exception:
  - **Routes** $\rightarrow$ `src/modules/{feature}/{feature}.routes.ts` (Fastify route definitions, schema attachments, auth & RBAC pre-handlers)
  - **Controllers** $\rightarrow$ `src/modules/{feature}/{feature}.controller.ts` (Thin request parsing, context extraction, delegating to services, returning formatted response via `reply.success`)
  - **Services** $\rightarrow$ `src/modules/{feature}/services/{feature}.service.ts` (Core business logic, database transactions, domain validation)
  - **Schemas** $\rightarrow$ `src/modules/{feature}/schema/{feature}.schema.ts` (Zod validation schemas for query, params, headers, and request bodies)
  - **DTOs** $\rightarrow$ `src/modules/{feature}/dto/{feature}.dto.ts` (API response contracts, serialization helpers, and TypeScript types)
  - **Global Utilities** $\rightarrow$ `src/utils/{utility}.ts` (Pure, stateless helpers)
  - **Core Infrastructure / Libraries** $\rightarrow$ `src/lib/{infrastructure}.ts` (Prisma client, error classes, logger, email, PDF, queue client)
  - **Configuration & Constants** $\rightarrow$ `src/config/` (`env.ts` for Zod env vars, `constants/` for static configuration maps)
  - **Background Jobs** $\rightarrow$ `src/jobs/` (job name constants & payload schemas in `job.types.ts`, queue workers in `workers/`)

- **ZERO `any` POLICY (Strict TypeScript):**
  `any` is strictly prohibited anywhere in the codebase. Always use explicit types from `@prisma/client`, `src/types`, module DTOs, or Zod inferences (`z.infer<...>`). For unknown inputs or error catching, use `unknown` with explicit runtime type narrowing.

- **STRICT SCOPE ENFORCEMENT:**
  NEVER introduce unrequested endpoints, database columns, background job queues, utility functions, or dependencies unless explicitly requested. Keep implementations tightly scoped to the user directive.

- **CUSTOM ERROR HANDLING & DOMAIN EXCEPTIONS:**
  Never throw generic `Error` for client-facing or business logic failures. Always throw typed domain exceptions from `src/lib/errors.ts`:
  - `DomainError` / `BusinessRuleError` (400 - Business rule violations)
  - `ValidationError` (400 - Invalid data format/input)
  - `UnauthorizedError` (401 - Missing or invalid JWT)
  - `ForbiddenError` (403 - Insufficient role or studio permissions)
  - `NotFoundError` (404 - Entity not found)
  - `ConflictError` (409 - Unique constraint / duplicate state conflicts)
  - `PaymentError` (400 - Payment and financial operation failures)
  - `TechnicalError` (500 - System / 3rd-party integration errors)

- **FINANCIAL AMOUNT CONVENTION (`toFinancialAmount`) — MANDATORY:**
  All API endpoints returning monetary amounts must enforce the standardized dual-unit response format (`{ [prefix]: number, [prefix]Kobo: number }`).
  - Always use `toFinancialAmount(value, prefix)` from `src/utils/currency.utils.ts` in serializers and DTO mappings.
  - Never do manual division `/ 100` or return bare unformatted numbers for financial fields.
  ```ts
  import { toFinancialAmount } from "../../../utils/currency.utils";

  // Produces { amount: 1500, amountKobo: 150000 }
  ...toFinancialAmount(inv.total, "total")
  ```

- **MULTI-TENANT ISOLATION:**
  - The API uses `AsyncLocalStorage` (`requestContext`) and the Prisma extension (`tenantExtension` in `src/lib/prisma-tenant-extension.ts`) to automatically scope queries for tenant-backed models to `businessId`.
  - Always ensure authenticated requests validate and attach `request.user.businessId`.
  - Never allow cross-tenant data leakage; always include `businessId` checks in custom queries and permission gates.

- **DATA INTEGRITY & TRANSACTIONS:**
  - Use `prisma.$transaction` for multi-step mutations (e.g., invoice + line items + sequence numbers).
  - Relations to critical financial and customer data must use `onDelete: Restrict` or structured soft-deletes where applicable.

- **NO ASSUMPTIONS & PRACTICAL REVIEWS:**
  Never hallucinate requirements or third-party API capabilities. Keep code reviews and implementations clean, direct, and free from unnecessary bloat or premature abstractions.

---

# PROJECT OVERVIEW & TECH STACK

**Shopwus API** is a multi-tenant business & studio management SaaS backend built with **Fastify v5**, **Prisma ORM**, and **PostgreSQL**.

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Fastify v5 (with `fastify-type-provider-zod`) |
| Language | TypeScript (Strict Mode) |
| ORM | Prisma v7 (`@prisma/adapter-pg` with PostgreSQL) |
| Validation | Zod |
| Testing | Jest + ts-jest (`@testcontainers/postgresql` for integration) |
| Code Quality | Biome (linting + formatting) |
| Auth | JWT (cookie & Bearer token) + Custom RBAC middleware |
| Background Jobs | pg-boss (PostgreSQL-backed queue) |
| Storage | Cloudflare R2 / AWS S3 SDK |
| Email | Resend + Pug Templates |
| Messaging | Twilio (WhatsApp & SMS) |
| File Generation | Puppeteer (remote/local PDF rendering), Sharp (image manipulation) |
| Realtime | Socket.io (`fastify-socket.io`) |

---

# CODEBASE STRUCTURE

```
src/
├── app.ts                  # Fastify app factory (plugin registration, hooks)
├── server.ts               # Process startup & HTTP listen
├── config/                 # Environment & app constants
│   ├── env.ts              # Zod-validated environment variables
│   └── constants/          # App-wide constants (auth, errors, cache, etc.)
├── lib/                    # Shared libraries & singletons
│   ├── prisma.ts           # Extended PrismaClient instance
│   ├── errors.ts           # AppError and DomainError hierarchy
│   ├── pgboss.ts           # pg-boss lifecycle management
│   ├── pdf.ts              # Puppeteer PDF generation & concurrency queue
│   ├── email.ts            # Resend transactional email client
│   ├── mediaUpload.ts      # Cloudflare R2 / S3 storage utilities
│   ├── logger.ts           # Pino logger configuration
│   └── monitor.ts          # Sentry error monitoring
├── plugins/                # Fastify plugins
│   ├── cookie.ts           # Cookie support
│   ├── cors.ts             # CORS configuration
│   ├── errorHandler.ts     # Global centralized error handler
│   ├── rateLimit.ts        # Route & global rate limiting
│   ├── response.ts         # reply.success() custom decorator
│   └── socket.ts           # Socket.io setup & room orchestration
├── middlewares/            # Authentication & RBAC pre-handlers
│   └── auth.ts             # authenticate, optionalAuthenticate, requireRole, requireStudioOwner
├── modules/                # Feature-sliced domain modules
│   ├── analytics/
│   ├── auth/
│   ├── blog/
│   ├── broadcasts/
│   ├── customers/
│   ├── expenses/
│   ├── feedback/
│   ├── invoices/
│   ├── leads/
│   ├── media/
│   ├── studios/
│   └── valuation/
├── jobs/                   # Background job orchestration
│   ├── job.types.ts        # JOB_NAMES constants & Zod payload schemas
│   ├── index.ts            # Queue registration & error monitoring
│   └── workers/            # pg-boss worker processors
│       ├── broadcast.worker.ts
│       ├── email.worker.ts
│       └── invoice.worker.ts
├── types/                  # App-wide shared TypeScript interfaces
└── utils/                  # Utility functions (currency, date, sequence, etc.)
```

---

# BACKGROUND JOBS (`pg-boss`)

Background jobs are defined in `src/jobs/job.types.ts` and registered in `src/jobs/index.ts`.

### Active Supported Queues:
- `JOB_NAMES.SEND_EMAIL` (`"send-email"`): Asynchronous transactional emails via Resend (`email.worker.ts`).
- `JOB_NAMES.SEND_WHATSAPP` (`"send-whatsapp"`): WhatsApp message dispatch via Twilio.
- `JOB_NAMES.GENERATE_INVOICE_PDF` (`"generate-invoice-pdf"`): PDF rendering and storage (`invoice.worker.ts`).
- `JOB_NAMES.SEND_BROADCAST_MESSAGE` (`"admin-send-broadcast-message"`): Bulk campaign messaging (`broadcast.worker.ts`).
- `JOB_NAMES.CLEANUP_EXPIRED_SESSIONS` (`"auth-cleanup-expired-sessions"`): Session housekeeping.

> **Rule:** Every background job MUST have a matching Zod payload schema in `job.types.ts` and be registered in `src/jobs/index.ts`.

---

# IMPORTANT SCRIPTS & COMMANDS

| Command | Action |
|---|---|
| `npm run dev` | Start development server with live reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run start` | Run compiled production bundle (`node dist/server.js`) |
| `npm run check` | Run TypeScript type check (`tsc --noEmit`) |
| `npm run lint` | Run Biome linter with autofix (`biome lint --write`) |
| `npm run format` | Run Biome formatter (`biome check --write .`) |
| `npm run test` | Run full Jest test suite |
| `npm run test:unit` | Run isolated unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run db:migrate` | Deploy pending Prisma migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database |
