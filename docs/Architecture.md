## Codebase Architecture

The project is built with Fastify, Prisma, and PostgreSQL, employing a feature-sliced modular architecture for scalability and clean code separation.

### Global Structure

- **`src/app.ts` & `src/server.ts`**: Application entry points, Fastify instance setup, and graceful shutdown logic.
- **`src/config/`**: Centralized configuration and environment variable validation (using Zod).
- **`src/lib/`**: Shared core utilities (e.g., Prisma client singleton, custom standardized errors).
- **`src/plugins/`**: Global Fastify plugins (e.g., centralized exception handling).
- **`src/routes/`**: Global API routing registry where module-level routes are mounted.
- **`src/modules/`**: Self-contained feature modules (e.g., `user`).

Each module follows a **modular layer structure** that keeps concerns cleanly separated:

- **schema.ts & dto.ts**: Zod validation schemas, TypeScript types, and DTOs — the single source of truth for the module's data contracts.
- **services/**: For complex modules, logic is decomposed into multiple domain-specific files (e.g., `bankAccount.service.ts`) within this directory, linked via an `index.ts` barrel.
- **controller.ts**: Parses incoming requests, calls services, and handles responses (kept as thin as possible).
- **routes.ts**: Defines HTTP methods and mounts them to the global registry.

- If it **touches the database or contains business logic**, it belongs in the **service**.
- If it answers **“is this allowed?”**, it belongs in the **service**.
- If it touches **`req` or `reply`**, it belongs in the **controller**.
- If it **validates incoming or outgoing data**, it belongs in the **schema**.
- If it **defines the shape of data moving between layers**, it belongs in the **DTO**.

### Database & Schema Architecture

The database schema (`schema.prisma`) incorporates robust financial and data-integrity safeguards designed for a B2B2C fintech/SaaS platform:

- **Soft Deletes**: To maintain a reliable audit trail for analytics and financial history, we prioritize soft deletions over hard deletions for core entities. Models like `User` and `Business` use `deletedAt` (DateTime) and `isActive` (Boolean) fields.
- **`onDelete: Restrict` for Strict Safety**: Relations tied to critical data (e.g., `Invoice`, `Expense`, `Customer`) use `onDelete: Restrict` instead of `Cascade`. This acts as a database-level safety net: if a developer accidentally attempts to `.delete()` a User/Business with financial history, PostgreSQL will explicitly block the operation via a foreign key constraint. Soft deletion must be used instead.
- **Precision Integers**: All financial values (balances, payment amounts, net payouts) are stored as `Int`, representing the smallest currency unit (e.g., kobo/cents) to completely avoid floating-point calculation errors.
- **Prisma Currency Extension & `toFinancialAmount`**: Financial amounts in raw DB models are automatically extended with Naira and Kobo computed fields via `currencyExtension` (`amountNaira`, `amountKobo`). For API response objects, `toFinancialAmount(amount, prefix)` is the mandatory standard for returning both units consistently. Unit tests import `currencyExtensionDefinition` directly for lightweight test coverage without needing a live database.
- **Auditing & Idempotency**: The schema includes built-in models for tracking `AuditLog`s (recording "before" and "after" states), handling `WebhookEvent`s, and supporting an `IdempotencyKey` pattern for safe API retries.

### Database Performance Guidelines

To maintain system stability and prevent connection pool exhaustion, we follow a strict strategy for database operations:

#### 1. GET Queries (Pagination & Stats)

We use `Promise.all` instead of `prisma.$transaction`.

- **Reason**: These queries don't need to be atomic. If the count finishes a millisecond before the findMany, it's perfectly fine. `Promise.all` allows the connection pool to handle these queries more efficiently and prevents holding a connection "captive" for the duration of multiple queries.
- **Impact**: This significantly reduces the pressure on the database connection pool, preventing "Unable to start a transaction" timeout errors under load.

#### 2. Updates/Writes (Balance, Status, Security)

We use `prisma.$transaction`.

- **Reason**: These must be atomic. For example, when a user withdraws money, we must ensure the balance is deducted and the transaction is recorded simultaneously. If one fails, both must fail.
- **Impact**: This ensures data integrity and consistency for critical financial and security operations.

#### Summary

Reserve transactions only for when you need **atomicity** (all-or-nothing logic). For independent data retrieval, always prefer parallel execution via `Promise.all`.

### Error Handling

The application employs a standardized **Domain-Driven Error Layer** to ensure that business logic violations are translated into clear, actionable explanations for the API consumer, while infrastructure failures remain traceable for the engineering team.

Custom errors are headquartered in `src/lib/errors.ts` and managed by a centralized Fastify plugin (`src/plugins/errorHandler.ts`).

#### The Error Hierarchy

- **`AppError`**: The base class for all application exceptions. It supports standardized `message`, `statusCode`, `code` (DomainErrorCode), and `data` (payload) properties.
- **`DomainErrorCode`**: A centralized enum defined in `src/lib/errors.ts` containing semantic business-logic identifiers (e.g., `ALREADY_SUBSCRIBED`, `ACCOUNT_LOCKED`, `PAYMENT_FAILED`). This eliminates "magic strings" and ensures consistent error messaging.
- **Semantic Subclasses**:
  - `NotFoundError` (HTTP 404): Thrown when a requested resource is missing.
  - `ConflictError` (HTTP 409): Thrown for state conflicts, such as duplicate records or invalid idempotent operations.
  - `ValidationError` (HTTP 400): Thrown for malformed inputs or request-level validation failures.
  - `ForbiddenError` (HTTP 403): Thrown for authorization failures (e.g., lack of permissions).
  - `UnauthorizedError` (HTTP 401): Thrown for missing or invalid authentication.
  - `PayloadTooLargeError` (HTTP 413): Thrown for file size limit violations.
  - **`TechnicalError`** (HTTP 500): Specifically for infrastructure or system-level failures that should trigger monitoring alerts (e.g., failed geocoding, uninitialized SDKs).

#### Global Serialization

The centralized error handler automatically catches these exceptions—alongside database constraints (`PrismaClientKnownRequestError`) and schema violations (`ZodError`)—and serializes them into a consistent JSON envelope. Technical errors (5xx) are automatically reported to Sentry for proactive monitoring.

### Standardized Responses

To maintain API consistency, all success responses are formatted using utility functions located in `src/lib/response.ts`:

- `sendSuccess(reply, data, code, message, meta)`: Generates an `{ status: true, code, data, message }` payload with an optional `meta` object.
- `sendCreated(reply, data, message)`: Syntactic sugar for `sendSuccess` with HTTP status 201.
- `sendNoContent(reply)`: Generates an empty response with HTTP status 204.

## Response Format

All endpoints return a consistent envelope:

```json
// Success
{
  "status": true,
  "code": 200,
  "data": { ... },
  "message": "Resource retrieved successfully"
}

// Error
{
  "status": false,
  "code": "NOT_FOUND",
  "message": "User not found",
  "errors": [ ... ] // Optional for validation errors
}
```

### Authorization & Caching

The application uses Role-Based Access Control (RBAC) to manage permissions across business studios based on user roles (e.g. `OWNER`, `STAFF`, `COLLABORATOR`).

#### Session & Cache Management

1. **Unified Cache**: We utilize a centralized `cacheStore` (`src/lib/cache/`) with support for in-memory and Redis backends.
2. **Session Invalidation**: Whenever a user logs out or terminates all sessions, cached user sessions are evicted immediately (`cacheStore.delete(CACHE_KEYS.userSession(userId))`).
3. **Token Rotation**: Refresh tokens are rotated on each use with automatic reuse detection and revocation.
