# Final Quote Sharing App (Workshop 3 Final Project)

This is the **complete capstone application** for Workshop 3. It combines persistence, full CRUD, pagination, filtering, sorting, categories, partial search, and a database dashboard in one server-rendered Fastify project. Every quote lives in PostgreSQL through Prisma 7; nothing important is kept in memory.

The design is the polished end state of the **Quote Sharing** library: a paper-toned editorial layout, quote cards, filter controls, category chips, date ranges, pagination, a confirmation-before-delete flow, and styled `404` and `500` pages.

### What You'll Learn

- **End-to-end architecture:** Fastify plugins for Prisma, security, static files, and views, with routes kept separate.
- **Persistent CRUD:** Create, read, update, and delete quotes in PostgreSQL.
- **Prisma 7:** Schema, committed migrations, generated ESM client, and the `@prisma/adapter-pg` driver adapter.
- **Safe inputs:** JSON Schema validation, trimming, CSRF tokens, and escaped Handlebars output.
- **Collection browsing:** Nine quotes per page with filters preserved across page links.
- **Filtering:** Partial author match, category, and `createdAt` date range.
- **Sorting:** Newest, oldest, author A–Z, and author Z–A with stable tie-breakers.
- **Statistics:** `aggregate()` and `groupBy()` power the dashboard, including top authors and categories.
- **Failure handling:** Invalid IDs and missing rows render `404`; unexpected errors render `500` without leaking internals.
- **Post/Redirect/Get:** Every successful write redirects with `303`.

### Project Structure

```text
final-quote-sharing-app/
├── prisma/
│   ├── migrations/
│   │   ├── 20261116092000_init/
│   │   ├── 20261116092500_add_quote_category/
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── styles.css
├── src/
│   ├── lib/categories.ts         # Shared category options
│   ├── plugins/
│   │   ├── prisma.ts             # PrismaClient + onClose disconnect
│   │   ├── security.ts           # Cookies + CSRF protection
│   │   ├── static.ts             # Serves public/ at /assets/
│   │   └── views.ts              # Handlebars layout and helpers
│   ├── routes/quotes.ts          # Pages, filters, CRUD
│   ├── types/fastify.d.ts
│   ├── app.ts
│   └── server.ts
├── views/
│   ├── partials/
│   │   ├── pagination.hbs
│   │   └── quote-card.hbs
│   ├── 404.hbs
│   ├── confirm-delete.hbs
│   ├── dashboard.hbs
│   ├── edit-quote.hbs
│   ├── error.hbs
│   ├── index.hbs
│   ├── layout.hbs
│   ├── search.hbs
│   └── share.hbs
├── .env.example
├── package.json
├── prisma7.config.ts
└── tsconfig.json
```

> The generated Prisma client is intentionally not committed. Run `npx prisma generate` after installing dependencies.

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on `localhost:5432`.
- A PostgreSQL role that can own its database.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database**

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE w3_final_quotes_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w3_final_quotes
OWNER w3_final_quotes_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://w3_final_quotes_user:change_me@localhost:5432/w3_final_quotes?schema=public"
PORT=3000
COOKIE_SECRET="replace_with_a_long_random_string"
```

Use a long random value for `COOKIE_SECRET`, and URL-encode special characters in the password.

**4. Apply Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates the `Quote` table, adds the optional `category` column, and writes the ESM client into `src/generated/prisma/`.

**5. Start the Application**

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

If port `3000` is occupied, run `PORT=3100 npm run dev`.

### Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Paginated collection with author, category, date, and sort filters |
| `GET` | `/share` | Submission form |
| `POST` | `/share` | Validate, check CSRF, and create a quote |
| `GET` | `/search?author=...` | Partial, case-insensitive author search |
| `GET` | `/dashboard` | Totals, latest quote, top authors, and top categories |
| `GET` | `/quotes/:id/edit` | Edit form with current values |
| `POST` | `/quotes/:id/edit` | Validate and update a quote |
| `GET` | `/quotes/:id/delete` | Confirmation page |
| `POST` | `/quotes/:id/delete` | Delete after CSRF verification |

### Filter Reference

| Query | Example | Effect |
|---|---|---|
| `author` | `?author=einstein` | Case-insensitive partial author match |
| `category` | `?category=Philosophy` | Exact category match |
| `from` | `?from=2026-01-01` | Quotes created on or after that date |
| `to` | `?to=2026-03-31` | Quotes created on or before that date |
| `sort` | `?sort=author-asc` | `newest`, `oldest`, `author-asc`, `author-desc` |
| `page` | `?page=2` | Nine quotes per page |

### Exploring the Final App

| Try this | What to notice |
|---|---|
| Share several quotes | The homepage fills in newest-first order, then paginates at nine rows. |
| Combine filters | Author, category, and date conditions narrow one Prisma query. |
| Change sorting | Pagination links keep the chosen order and filters. |
| Search for part of a name | `contains` + `mode: 'insensitive'` finds nearby spellings. |
| Leave the category empty | The optional field stores `NULL` and renders as uncategorised. |
| Edit a quote | Current values are pre-filled; invalid edits re-render with feedback. |
| Visit a missing quote | `/quotes/999999/edit` renders the styled `404` page. |
| Delete a quote | Confirmation restates the record, then the POST deletes and redirects. |
| Refresh after delete | No repeated delete occurs because of the `303` redirect. |
| Submit without `_csrf` | The request is rejected with `403` before any write. |
| Stop and restart | All quotes remain; PostgreSQL is the source of truth. |
| Open the dashboard | Totals and top lists are computed by the database. |

### Production Notes

- Set `COOKIE_SECRET` to a strong random value and serve the app over HTTPS in production.
- Management routes are intentionally unauthenticated for this workshop. A real application must add authentication and ownership checks before allowing edits or deletes.
- Run `npm run db:deploy` to apply committed migrations in a deployment environment.
- Use `npm run build` and `npm start` for the compiled server.

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with automatic restarts |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Inspect the database |

### Workshop Objective

By the end of this project, you should have a complete, persistent, server-rendered CRUD application that validates and protects its inputs, browses data efficiently, and presents database state clearly to the user.
