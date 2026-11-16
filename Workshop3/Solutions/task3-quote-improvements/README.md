# Quote Improvements (Workshop 3 Task 3 Solution)

This solution turns the quote library into a **browsable, filterable collection**. The homepage is paginated, quotes can be filtered by author, category, and submission date, and the order can be changed by newest, oldest, author A–Z, or author Z–A. Author search now uses partial matching.

The interface adds a compact filter bar, category chips, date inputs, a pagination partial that preserves the active filters, a richer dashboard with top authors and categories, and category selectors on the create and edit forms.

### What You'll Learn

- **Pagination:** Use `count()`, `skip`, and `take` to build stable pages.
- **Filter objects:** Assemble a `Prisma.QuoteWhereInput` from optional query values.
- **Date ranges:** Convert `from` and `to` query strings into `gte` / `lte` conditions.
- **Sorting:** Map validated sort keys to `orderBy` arrays with tie-breakers.
- **Partial search:** Replace exact matches with `contains` and `mode: 'insensitive'`.
- **Schema migration:** Add an optional `category` column with a new migration.
- **Indexes:** Index `category` for filtered queries.
- **URL state:** Build pagination links that keep filters and ordering intact.
- **Dashboard groups:** Use `groupBy()` to rank authors and categories.
- **Form reuse:** Share one category list between create, edit, and filter controls.

### Project Structure

```text
task3-quote-improvements/
├── prisma/
│   ├── migrations/
│   │   ├── 20261116092000_init/
│   │   ├── 20261116092500_add_quote_category/
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── styles.css
├── src/
│   ├── generated/prisma/
│   ├── lib/
│   │   └── categories.ts         # Shared category options
│   ├── plugins/
│   │   ├── prisma.ts
│   │   ├── security.ts
│   │   ├── static.ts
│   │   └── views.ts
│   ├── routes/quotes.ts          # Filtering, sorting, pagination, CRUD
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

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on `localhost:5432`.
- A role that can own a database.

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
CREATE ROLE w3_task3_quotes_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w3_task3_quotes
OWNER w3_task3_quotes_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://w3_task3_quotes_user:change_me@localhost:5432/w3_task3_quotes?schema=public"
PORT=3000
COOKIE_SECRET="replace_with_a_long_random_string"
```

**4. Apply Both Migrations and Generate the Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

The committed history contains the initial `Quote` table and the later `category` column. Running `migrate dev` applies both in order.

**5. Run the App**

```bash
npm run dev
```

Open `http://127.0.0.1:3000`. Use `PORT=3100 npm run dev` if needed.

### Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Paginated collection; accepts `page`, `author`, `from`, `to`, `category`, `sort`, `deleted` |
| `GET` | `/share` | Show the create form with category options |
| `POST` | `/share` | Validate and insert a quote |
| `GET` | `/search?author=...` | Partial, case-insensitive author search (up to 50 rows) |
| `GET` | `/dashboard` | Totals, latest row, top authors, and top categories |
| `GET` | `/quotes/:id/edit` | Show the edit form |
| `POST` | `/quotes/:id/edit` | Validate and update author, text, and category |
| `GET` | `/quotes/:id/delete` | Show the delete confirmation |
| `POST` | `/quotes/:id/delete` | Delete after CSRF verification |

### Filters and Sorting

| Query | Accepted values | Effect |
|---|---|---|
| `author` | any text up to 50 characters | Case-insensitive partial match |
| `category` | one of the shared category options | Exact category match |
| `from` | `YYYY-MM-DD` | `createdAt >=` the start of that day (UTC) |
| `to` | `YYYY-MM-DD` | `createdAt <=` the end of that day (UTC) |
| `sort` | `newest`, `oldest`, `author-asc`, `author-desc` | Orders the result set |
| `page` | positive integer | Selects a page of nine quotes |

The query schema restricts `sort` to a known union and rejects unknown parameters. Pagination clamps out-of-range pages to the last available page.

### Exploring the Solution

| Try this | What to notice |
|---|---|
| Add more than nine quotes | The homepage shows pagination; page links keep every active filter. |
| Filter by author and category together | Conditions are combined in one `where` object. |
| Choose `oldest` or `author-desc` | The selected option survives pagination and filtering. |
| Use `from` and `to` together | The date range becomes `gte` and `lte` on `createdAt`. |
| Jump to `?page=999` | The requested page is clamped and the last page is shown. |
| Search a partial name | `contains` finds `Einstein` inside `Albert Einstein`. |
| Create a quote without a category | The optional column stores `NULL` and appears as “Uncategorised”. |
| Edit a quote’s category | The new value is saved and the filter picks it up immediately. |
| View `/dashboard` | Top authors and categories come from `groupBy()`, not loops in the app. |
| Delete a quote | The collection redirects to `/?deleted=1` with the filter-free homepage. |
| Post without `_csrf` | The write is blocked with `403`. |

### Design Notes

- **One source of truth:** `src/lib/categories.ts` feeds the filter bar, create form, edit form, and dashboard labels.
- **Stable ordering:** Every sort ends with an `id` tie-breaker so equal timestamps or author names do not shuffle between pages.
- **URL-safe pagination:** `buildHomeUrl()` serializes only active filters and always includes `page`.
- **Friendly empty states:** No quotes, no matches, and no active filters each get their own message.
- **Safe dates:** Invalid date strings are ignored rather than passed to PostgreSQL.

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with automatic restarts |
| `npm run typecheck` | Check TypeScript |
| `npm run build` / `npm start` | Compile and run the build |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Inspect categories, timestamps, and indexes |

### Workshop Objective

By the end of this solution, you should be able to turn a basic CRUD list into a real collection view: paginated, filtered, sortable, and backed by efficient Prisma queries rather than client-side array operations.
