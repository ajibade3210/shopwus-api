# Fastify API

> Fastify · TypeScript · Prisma · PostgreSQL

---

## Stack

| Layer           | Tool           |
| --------------- | -------------- |
| Runtime         | Node.js        |
| Framework       | Fastify v4     |
| Language        | TypeScript     |
| ORM             | Prisma         |
| Database        | PostgreSQL     |
| Validation      | Zod            |
| Testing         | Jest + ts-jest |
| Package manager | Yarn           |

---

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 3. Run database migrations

```bash
yarn db:migrate
```

### 4. Start dev server

```bash
yarn dev
```

---

## Project Structure
For more information, please check the [Architecture documentation](docs/Architecture.md).

## Scripts

```bash
yarn dev              # Start dev server with hot reload
yarn build            # Compile TypeScript
yarn start            # Run compiled output
yarn typecheck        # Type-check without emitting

yarn db:migrate       # Run Prisma migrations
yarn db:generate      # Regenerate Prisma client
yarn db:studio        # Open Prisma Studio

yarn test             # Run all tests
yarn test:unit        # Unit tests only (no DB needed)
yarn test:integration # Integration tests (requires DB)
yarn test:coverage    # Coverage report
```

## Testing
### Unit tests
Mock the service logic — no database required:
```bash
yarn test:unit
```

### Integration tests

Require a running PostgreSQL instance. Copy and configure:

```bash
cp .env.test.example .env.test
yarn test:integration

pnpm seed:products bluemajic321@gmail.com
```

Integration tests use `app.inject()` — no HTTP port needed, full request lifecycle tested
# shopwus-api
