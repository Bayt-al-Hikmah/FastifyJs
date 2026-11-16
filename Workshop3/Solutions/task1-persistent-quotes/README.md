# Persistent Quotes (Workshop 3 Task 1 Solution)

This solution makes the Workshop 2 quote-sharing application **persistent**. Instead of keeping quotes in an array, every submission is written to PostgreSQL through Prisma 7. The homepage reads the ten newest rows, search queries the database, and the dashboard calculates totals with Prisma aggregate queries.

The visual design is a calm, bookish **Quote Sharing** library: large serif headlines, paper-toned cards, a flow panel explaining the database path, and honest empty states.

### What You'll Learn

- **Replace memory with a database:** Swap an in-memory store for Prisma Client calls.
- **Model a table:** Define `Quote` with an auto-incrementing ID, `VarChar` limits, timestamps, and indexes.
- **Driver adapter:** Connect Prisma 7 to PostgreSQL with `@prisma/adapter-pg`.
- **Shared client:** Decorate Fastify with one `PrismaClient` and disconnect in `onClose`.
- **Read the newest rows:** Use `findMany({ orderBy, take })` for the homepage.
- **Create records:** Persist validated form data with `quote.create()`.
- **Case-insensitive search:** Query with `equals` and `mode: 'insensitive'`.
- **Database statistics:** Use `aggregate()` and `groupBy()` instead of manual counters.
- **Validation and CSRF:** Keep JSON Schema validation and token checks from Workshop 2.
- **Persistence proof:** Restart the server and confirm that the data survives.

### Project Structure

```text
task1-persistent-quotes/
├── prisma/
│   ├── migrations/
│   │   ├── 20261116091000_init/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── styles.css
├── src/
│   ├── generated/prisma/         # Generated client (recreate with prisma generate)
│   ├── plugins/
│   │   ├── prisma.ts             # PrismaClient + PostgreSQL adapter
│   │   ├── security.ts           # Cookies + CSRF protection
│   │   ├── static.ts             # Serves public/ at /assets/
│   │   └── views.ts              # Handlebars helpers
│   ├── routes/quotes.ts          # /, /share, /search, /dashboard
│   ├── types/fastify.d.ts
│   ├── app.ts
│   └── server.ts
├── views/
│   ├── partials/quote-card.hbs
│   ├── 404.hbs
│   ├── dashboard.hbs
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

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on port `5432`.
- Permission to create a role and database (or an existing database URL).

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
CREATE ROLE w3_task1_quotes_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w3_task1_quotes
OWNER w3_task1_quotes_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
```

The example values match the role and database above:

```env
DATABASE_URL="postgresql://w3_task1_quotes_user:change_me@localhost:5432/w3_task1_quotes?schema=public"
PORT=3000
COOKIE_SECRET="replace_with_a_long_random_string"
```

**4. Apply the Migration and Generate the Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Run the Application**

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Use `PORT=3100 npm run dev` if port `3000` is already taken.

### Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Show the ten newest quotes |
| `GET` | `/share` | Show the submission form with a CSRF token |
| `POST` | `/share` | Validate, verify the token, and insert a quote |
| `GET` | `/search?author=...` | Case-insensitive exact-author search |
| `GET` | `/dashboard` | Total quotes, unique authors, newest timestamp, latest row |

### Exploring the Solution

| Try this | What to notice |
|---|---|
| Share a quote | The record is inserted into PostgreSQL and the browser redirects to `/share?created=1`. |
| Restart the server | Open `/` again: the quote remains because storage is no longer in memory. |
| Search `albert einstein` | A quote stored under `Albert Einstein` is found thanks to case-insensitive matching. |
| Search a partial name | This task uses exact-author search; try `Albert` and compare with Task 3. |
| Open `/dashboard` | `_count`, `_max`, and `groupBy` compute the statistics in PostgreSQL. |
| Submit spaces only | Pre-validation trims the fields; the schema then rejects them. |
| Submit without `_csrf` | The CSRF hook rejects the request before any insert. |
| Open Prisma Studio | Run `npm run db:studio` and inspect the `Quote` rows directly. |

### Persistence Check

1. Submit a distinctive quote.
2. Stop the dev server with `Ctrl+C`.
3. Start it again with `npm run dev`.
4. Reload `/`.

The quote should still appear. This is the key difference from Workshop 2: the server process no longer owns the data.

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with automatic restarts |
| `npm run typecheck` | Check TypeScript |
| `npm run build` / `npm start` | Compile and run the production build |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Inspect the database visually |

### Workshop Objective

By the end of this solution, you should be able to replace temporary storage with PostgreSQL, perform validated inserts and reads through Prisma, and use database-side aggregates instead of counters maintained by hand.
