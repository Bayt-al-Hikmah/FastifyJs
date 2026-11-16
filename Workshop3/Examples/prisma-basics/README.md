# Prisma Basics

## Workshop Objective

This example introduces the core of Workshop 3: modelling relational data with
Prisma 7 and PostgreSQL. You will define related `User`, `Project`, and `Task`
models, apply a migration, create nested records, load a project with
`include()`, and verify that `onDelete: Cascade` removes dependent rows.

The project is a command-line demo rather than a web application. It focuses on
the database layer that every Fastify application in the rest of the workshop
uses.

## What This Example Demonstrates

- A Prisma 7 schema with one-to-many relations.
- `@map` and `@@map` for mapping Prisma names to PostgreSQL table and column names.
- `onDelete: Cascade` on both relations.
- A PostgreSQL driver adapter (`@prisma/adapter-pg`) instead of a bundled engine.
- A reusable Prisma Client module in `db/prisma.ts`.
- Nested writes, `include()`, and cascade verification in `db/demo.ts`.
- A committed migration history that can be applied with Prisma Migrate.

## Project Structure

```text
prisma-basics/
├── db/
│   ├── demo.ts                  # Runnable demonstration
│   └── prisma.ts                # Shared Prisma Client instance
├── prisma/
│   ├── migrations/
│   │   ├── 20261116090000_init/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── src/
│   └── generated/prisma/        # Generated client (ignored by Git)
├── .env.example
├── .gitignore
├── package.json
├── prisma7.config.ts
├── README.md
└── tsconfig.json
```

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer, running locally on port `5432`.
- The `psql` command available in your terminal.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the PostgreSQL role and database

Open the PostgreSQL administrative shell:

```bash
sudo -u postgres psql
```

Create a dedicated role and database, then exit:

```sql
CREATE ROLE w3_prisma_basics_user
WITH LOGIN PASSWORD 'change_me';

CREATE DATABASE w3_prisma_basics
OWNER w3_prisma_basics_user;

\q
```

Use a stronger password outside this educational project. If your password
contains special characters, URL-encode it inside the connection string.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` so that it matches the role and database you created:

```env
DATABASE_URL="postgresql://w3_prisma_basics_user:change_me@localhost:5432/w3_prisma_basics?schema=public"
```

### 4. Apply the migration and generate Prisma Client

The repository already contains the initial migration. Apply it with:

```bash
npx prisma migrate dev --name init
```

Then generate the ESM Prisma Client explicitly:

```bash
npx prisma generate
```

The generated client is written to `src/generated/prisma/`. It is excluded from
Git because it can always be recreated from the schema.

If you change `prisma/schema.prisma` later, create another migration and
regenerate the client:

```bash
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

### 5. Run the demo

```bash
npm run demo
```

For development with automatic restarts:

```bash
npm run dev
```

## Endpoints

This example does not expose HTTP endpoints. It is a database-only demonstration
driven by the following commands:

| Command | Purpose |
|---|---|
| `npm run demo` | Create related records, load a project with `include()`, delete the user, and verify the cascade. |
| `npm run dev` | Run the demo in watch mode while editing `db/demo.ts`. |
| `npm run typecheck` | Type-check the demo and the generated Prisma Client. |
| `npm run db:studio` | Open Prisma Studio for the configured database. |
| `npm run db:migrate` | Create and apply a development migration. |
| `npm run db:deploy` | Apply committed migrations in a production-like environment. |

## Data Model

```text
User 1 ─── * Project 1 ─── * Task
```

- `User.email` is unique and stored as `email_address`.
- `Project.ownerId` stores `owner_id` and references `User.id`.
- `Task.projectId` stores `project_id` and references `Project.id`.
- Deleting a `User` cascades to their projects, and deleting a project cascades
  to its tasks.
- Table names are mapped to lowercase plural names with `@@map`.

The database also has indexes on `Project.ownerId` and `Task.projectId`, which
speed up relation lookups and cascading deletes.

## Exploration Walkthrough

1. Run `npm run demo`. The script creates a user with two projects and four
   tasks using a single nested `create()` call.
2. Observe the printed project summary. It is based on the result returned by
   `prisma.user.create({ include: { projects: { include: { tasks: true } } } })`.
3. The script reloads one project with:
   - `include: { owner: true }` to load the related user.
   - `include: { tasks: true }` with an explicit `orderBy` to load its tasks.
4. The script deletes only the user. It then counts the user, their projects, and
   their tasks. All three counts must be `0`, proving that the database
   cascaded the delete.
5. Open Prisma Studio with `npm run db:studio` and inspect the `users`,
   `projects`, and `tasks` tables. The demo cleans up its own records, so you
   can also comment out the delete block to inspect the created rows.
6. Change the demo to add a third project, run it again, and confirm that the
   same code handles the additional nested records without any schema changes.

## Prisma Studio

Prisma Studio provides a browser-based view of the database:

```bash
npx prisma studio
```

Open the URL printed by the command (usually <http://localhost:5555>), select the
`users`, `projects`, or `tasks` table, and inspect or edit records. Stop Studio
with `Ctrl+C` when you are finished.

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `demo` | `tsx db/demo.ts` | Run the demonstration once. |
| `dev` | `tsx watch db/demo.ts` | Re-run when files change. |
| `build` | `tsc -p tsconfig.json` | Compile TypeScript. |
| `typecheck` | `tsc --noEmit` | Check types without writing output. |
| `db:generate` | `prisma generate` | Regenerate Prisma Client. |
| `db:migrate` | `prisma migrate dev` | Create and apply a development migration. |
| `db:deploy` | `prisma migrate deploy` | Apply committed migrations. |
| `db:studio` | `prisma studio` | Open Prisma Studio. |

## Troubleshooting

- **`DATABASE_URL is not configured`**: create `.env` from `.env.example`.
- **Authentication failed**: verify the role name, password, and URL encoding.
- **Database does not exist**: run the `CREATE DATABASE` statement as a
  PostgreSQL administrator.
- **`Can't reach database server`**: confirm PostgreSQL is running and listening
  on port `5432`.
- **Types are missing after a schema edit**: run `npx prisma generate` again.
