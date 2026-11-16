# Quote Management (Workshop 3 Task 2 Solution)

This solution extends persistent quote sharing with **full record management**. Visitors can edit an existing quote, review a dedicated delete-confirmation page, and remove a record. Invalid IDs and deleted rows render a styled `404` instead of a Prisma stack trace.

The interface keeps the **Quote Sharing** library look from Task 1 but adds a management layer: an edit form that preserves both old and newly typed values, success notices, a danger zone, and a confirmation screen that restates exactly what will be deleted.

### What You'll Learn

- **Update flow:** Load a row with `findUnique()`, pre-fill a form, then persist changes with `quote.update()`.
- **Delete flow:** Use a separate `GET` confirmation page and a protected `POST` to delete.
- **Route parameters:** Parse and validate `:id` before querying the database.
- **Missing records:** Distinguish an invalid ID from a missing row and render `404` for both.
- **Prisma `P2025`:** Catch “record not found” during update or delete and turn it into a friendly page.
- **Validation reuse:** Apply the same JSON Schema to create, edit, and delete-related forms.
- **CSRF on every write:** Generate a token for each form and verify it in `preHandler`.
- **Post/Redirect/Get:** Redirect after edit and delete so refreshes cannot repeat the action.
- **Safe error handling:** Keep internal database errors out of the browser.

### Project Structure

```text
task2-quote-management/
├── prisma/
│   ├── migrations/
│   │   ├── 20261116091000_init/
│   │   ├── 20261116091500_init/
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── styles.css
├── src/
│   ├── generated/prisma/         # Generated client (recreate with prisma generate)
│   ├── plugins/
│   │   ├── prisma.ts
│   │   ├── security.ts
│   │   ├── static.ts
│   │   └── views.ts
│   ├── routes/quotes.ts          # Read, create, edit, delete
│   ├── types/fastify.d.ts
│   ├── app.ts
│   └── server.ts
├── views/
│   ├── partials/quote-card.hbs
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
- A role that owns its database.

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
CREATE ROLE w3_task2_quotes_user
WITH LOGIN PASSWORD 'change_me';

CREATE DATABASE w3_task2_quotes
OWNER w3_task2_quotes_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://w3_task2_quotes_user:change_me@localhost:5432/w3_task2_quotes?schema=public"
PORT=3000
COOKIE_SECRET="replace_with_a_long_random_string"
```

**4. Migrate and Generate**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

The repository includes the migration history. `migrate dev` applies any migration that has not yet run against your database.

**5. Start the App**

```bash
npm run dev
```

Visit `http://127.0.0.1:3000`. Use `PORT=3100 npm run dev` when port `3000` is busy.

### Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List the ten newest quotes; shows a deletion notice |
| `GET` | `/share` | Show the create form |
| `POST` | `/share` | Validate and insert a quote |
| `GET` | `/search?author=...` | Search by exact author, ignoring case |
| `GET` | `/dashboard` | Show database statistics |
| `GET` | `/quotes/:id/edit` | Show the edit form for an existing quote |
| `POST` | `/quotes/:id/edit` | Validate and update the quote |
| `GET` | `/quotes/:id/delete` | Show the delete confirmation page |
| `POST` | `/quotes/:id/delete` | Delete the quote after CSRF verification |

### Exploring the Solution

| Try this | What to notice |
|---|---|
| Edit a quote | The form arrives pre-filled; saving redirects to `/quotes/:id/edit?updated=1`. |
| Submit an empty edit | A `400` response re-renders the edit form with the attempted values. |
| Edit a deleted quote | The record is gone, so `findUnique()` returns `null` and a `404` page appears. |
| Delete a quote | `GET /quotes/:id/delete` restates the author and text before the destructive POST. |
| Cancel a delete | The confirmation page links back without changing the database. |
| Submit the delete form twice | The second POST catches Prisma `P2025` and shows `404`; no internal error leaks. |
| Visit `/quotes/abc/edit` | The ID parser rejects non-integers before any query runs. |
| Post without `_csrf` | The request is blocked with `403`. |
| Refresh after deleting | Post/Redirect/Get keeps the action from repeating. |
| Run Prisma Studio | Confirm that edits changed `updatedAt` and deletes removed the row. |

### Management Flow

```text
GET /quotes/:id/edit          POST /quotes/:id/edit
  findUnique()                  validate body + CSRF
  render current values         quote.update()
                                catch P2025 → 404
                                redirect 303

GET /quotes/:id/delete        POST /quotes/:id/delete
  findUnique()                  CSRF check
  render confirmation           quote.delete()
                                catch P2025 → 404
                                redirect 303
```

The confirmation page matters: destructive actions should not happen on a plain link or a page refresh.

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with automatic restarts |
| `npm run typecheck` | Check TypeScript |
| `npm run build` / `npm start` | Compile and run the build |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Inspect rows and timestamps |

### Workshop Objective

By the end of this solution, you should be able to implement safe update and delete flows in a server-rendered application, validate route parameters, handle missing records, and keep destructive actions behind confirmation, CSRF protection, and redirects.
