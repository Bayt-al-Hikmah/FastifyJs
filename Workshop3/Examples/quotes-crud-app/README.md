# Quotes CRUD App (Workshop 3 Example)

This example is the complete **CRUD reference application** for Workshop 3. It stores quotes in PostgreSQL through Prisma 7, renders every page with Handlebars, and supports creating, reading, updating, and deleting records. The homepage can filter by author and sort by newest, oldest, or author name.

The interface is a small editorial **Quote Library** with a serif display face, warm paper background, quote cards, a detail page, a shared create/edit form, validation feedback, and a confirmation step before deletion.

### What You'll Learn

- **Prisma 7 setup:** Use the `prisma-client` generator and a PostgreSQL driver adapter.
- **Schema modelling:** Map a `Quote` model with an auto-incrementing ID, length-limited columns, and indexes.
- **Migrations:** Apply the committed migration and regenerate Prisma Client.
- **Fastify plugin:** Decorate the app with one shared `PrismaClient` and disconnect it in `onClose`.
- **Create:** Insert validated form data with `quote.create()`.
- **Read:** List records with `findMany()`, filter with `contains`, and order with `orderBy`.
- **Update:** Load current values and persist changes with `quote.update()`.
- **Delete:** Remove a record with `quote.delete()` only after a confirmation page and CSRF check.
- **Prisma error handling:** Translate `P2025` into a styled `404` instead of exposing a database error.
- **JSON Schema + CSRF:** Validate form bodies and protect every write.
- **Post/Redirect/Get:** Redirect with `303` after each successful mutation.

### Project Structure

```text
quotes-crud-app/
├── prisma/
│   ├── migrations/
│   │   ├── 20261116090500_init/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── styles.css
├── src/
│   ├── generated/prisma/         # Generated client (recreate with prisma generate)
│   ├── plugins/
│   │   ├── prisma.ts             # Shared PrismaClient + onClose cleanup
│   │   ├── security.ts           # Cookies + CSRF protection
│   │   ├── static.ts             # Serves public/ at /assets/
│   │   └── views.ts              # Handlebars helpers and layout
│   ├── routes/
│   │   └── quotes.ts             # All CRUD routes
│   ├── types/fastify.d.ts        # Prisma decoration type
│   ├── app.ts                    # Builds the application
│   └── server.ts                 # Starts the server
├── views/
│   ├── partials/quote-card.hbs
│   ├── 404.hbs
│   ├── error.hbs
│   ├── index.hbs
│   ├── layout.hbs
│   ├── quote-detail.hbs
│   └── quote-form.hbs
├── .env.example
├── package.json
├── prisma7.config.ts
└── tsconfig.json
```

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on `localhost:5432`.
- A PostgreSQL role that can create tables in its own database.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database**

Open the PostgreSQL administrative shell:

```bash
sudo -u postgres psql
```

Create a dedicated role and database:

```sql
CREATE ROLE w3_quotes_crud_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w3_quotes_crud
OWNER w3_quotes_crud_user;

\q
```

**3. Configure Environment Variables**

```bash
cp .env.example .env
```

Edit `.env` if your role, password, or database name differs:

```env
DATABASE_URL="postgresql://w3_quotes_crud_user:change_me@localhost:5432/w3_quotes_crud?schema=public"
PORT=3000
COOKIE_SECRET="replace_with_a_long_random_string"
```

**4. Apply the Migration and Generate Prisma Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

The generated client is written to `src/generated/prisma/`. Re-run `npx prisma generate` after every schema change.

**5. Start the Application**

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

If port `3000` is busy:

```bash
PORT=3100 npm run dev
```

### Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List quotes; accepts `author` and `sort=newest\|oldest\|author` |
| `GET` | `/quotes/new` | Show the empty create form |
| `POST` | `/quotes` | Validate and create a quote |
| `GET` | `/quotes/:id` | Show one quote and its management actions |
| `GET` | `/quotes/:id/edit` | Show the edit form with current values |
| `POST` | `/quotes/:id/edit` | Validate and update the quote |
| `POST` | `/quotes/:id/delete` | Delete the quote after confirmation and CSRF verification |

Every mutating form includes a hidden `_csrf` field. A missing or invalid token is rejected before the route handler runs.

### Exploring the Example

| Try this | What to notice |
|---|---|
| Create a quote | The row is inserted and the browser is redirected to `/quotes/:id?created=1`. |
| Stop and restart the server | The quote is still there; it lives in PostgreSQL, not in memory. |
| Filter by a partial author | `contains` with `mode: 'insensitive'` matches nearby names. |
| Sort by author | `orderBy` is chosen from the validated `sort` query value. |
| Open an edit page | The form is pre-filled from `findUnique()`, and the submit label changes to “Save changes”. |
| Submit an empty edit | Schema validation returns `400` and preserves the submitted values. |
| Delete a quote | The detail page asks for browser confirmation, then the POST deletes and redirects to `/?deleted=1`. |
| Visit `/quotes/999999` | A styled `404` is rendered without leaking a Prisma stack trace. |
| Post a form without `_csrf` | The request is rejected with `403`. |
| Open Prisma Studio | Run `npm run db:studio` to inspect the `Quote` table directly. |

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with automatic restarts |
| `npm run typecheck` | Check TypeScript without writing output |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Open Prisma Studio |

### Troubleshooting

- **`DATABASE_URL is not configured`**: copy `.env.example` to `.env`.
- **Authentication failed**: check the role name and password, and URL-encode special characters.
- **Database does not exist**: create it with the `CREATE DATABASE` statement above.
- **Prisma types are missing**: run `npx prisma generate`.
- **CSRF errors after a restart**: reload the form so the browser receives a fresh secret cookie.

### Workshop Objective

By the end of this example, you should be able to connect Fastify to PostgreSQL through Prisma, complete all four CRUD operations from server-rendered HTML forms, and handle missing records and invalid submissions without exposing database internals.
