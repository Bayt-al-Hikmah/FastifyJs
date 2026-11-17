# Community Library API (Workshop 6 Example)

A small, database-free REST API for a community library. It serves nine starter books from memory and demonstrates the core habits behind predictable HTTP APIs: resource-oriented URLs, meaningful status codes, validated input, and a consistent JSON envelope. A polished browser explorer at `/app/` lets you send every request and inspect the exact response without installing any API client.

Everything lives in one Fastify process. There is no PostgreSQL, no Prisma, no JWT, and no build step needed to experiment — edits, creates, and deletes survive only until you restart the server.

### What You'll Learn

- **Resource-oriented URLs** — `/books` is the collection, `/books/:id` is one item, and the HTTP method describes the operation.
- **HTTP method semantics** — `GET` and `DELETE` are idempotent, `PATCH` applies a partial update, and `POST` creates a resource.
- **Meaningful status codes** — `200`, `201`, `204`, `400`, `404`, `409`, and `429` each carry a distinct meaning.
- **Consistent response envelopes** — successful responses use `message` + `data`; lists add `pagination`; errors use `message` (+ `errors`).
- **Layered architecture** — routes declare the contract, controllers shape HTTP responses, and services own the business rules.
- **Runtime validation** — JSON Schemas on params, query strings, and bodies with `additionalProperties: false`.
- **Pre-validation normalisation** — trimming user input in a hook before the schema runs.
- **Search, filtering, sorting, and pagination** — composable query parameters with bounded page sizes.
- **Central error handling** — one `setErrorHandler` maps validation and domain errors to safe client messages.
- **Duplicate detection** — ISBN conflicts return `409` instead of silently creating a second copy.
- **Scoped CORS and rate limiting** — both apply to `/api` routes only; the static explorer is untouched.
- **Fetch-based exploration** — a reusable browser helper that handles `response.ok`, `204`, and validation error details.

### Project Structure

```text
rest-api-basics/
├── public/
│   ├── css/style.css              # Dark slate + amber developer-console theme
│   ├── js/api.js                  # Reusable fetch helper (status, details, 204 handling)
│   ├── js/app.js                  # Explorer logic: forms, endpoint list, cards, response panel
│   └── index.html                 # Semantic, accessible single-page explorer
├── src/
│   ├── config.ts                  # Port, host, CORS origin, rate-limit and pagination settings
│   ├── app.ts                     # Fastify instance, error handler, 404 handler, static UI, plugins
│   ├── server.ts                  # Entry point that opens the network port
│   ├── lib/api-error.ts           # ApiError for expected 404 / 409 failures
│   ├── types/book.ts              # Book, Genre, query, pagination, and input types
│   ├── data/seed-books.ts         # The nine starter books (fresh copy per startup)
│   ├── schemas/book-schemas.ts    # JSON Schemas for params, query string, POST, and PATCH
│   ├── services/book-service.ts   # In-memory collection, search, filters, sorting, CRUD
│   ├── controllers/book-controller.ts  # HTTP envelopes and status codes
│   └── routes/
│       ├── api.ts                 # /api scope: CORS, rate limiting, sub-routes
│       ├── books.ts               # The five /books endpoints and trimming hooks
│       └── meta.ts                # GET /meta/genres
├── .env.example                   # Optional, non-secret configuration
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Getting Started

1. **Check the prerequisites.** You need Node.js 20 or newer. **No PostgreSQL setup is required for this example** — unlike the other Workshop 6 projects, there is no database role, database, `prisma migrate`, or `prisma generate` step, and no JWT secret to create. The collection is seeded in `src/data/seed-books.ts` when the process starts.

2. **Install the dependencies** from this directory:

```bash
cd Workshop6/Examples/rest-api-basics
npm install
```

3. **Optionally create a local environment file.** Every value has a working default, so this step is purely for experimentation:

```bash
cp .env.example .env
```

```dotenv
PORT=3010
HOST=0.0.0.0
CORS_ORIGIN=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15 minutes
```

`CORS_ORIGIN=true` reflects any requesting origin, which is acceptable for this public demo. For a real deployment, set one exact origin (for example `http://127.0.0.1:5173`).

4. **Start the development server.** `tsx watch` restarts it whenever a source file changes:

```bash
npm run dev
```

5. **Open the API explorer** at <http://127.0.0.1:3010/app/>. Visiting <http://127.0.0.1:3010/> redirects there automatically. Pick an endpoint in the left column, fill in the form, and send the request; the status code, timing, and raw JSON appear below.

6. **Useful extra commands:**

```bash
npm run typecheck   # TypeScript strict check, no output files
npm run build       # Compile to dist/
npm start           # Run the compiled version
```

### Exploring the Example

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| `GET` | `/api/books` | Search, filter, sort, and page through books | `200` |
| `GET` | `/api/books/:id` | Fetch one book | `200` |
| `POST` | `/api/books` | Add a book | `201` |
| `PATCH` | `/api/books/:id` | Partially update a book | `200` |
| `DELETE` | `/api/books/:id` | Remove a book | `204` (empty body) |
| `GET` | `/api/meta/genres` | List the genre vocabulary | `200` |

Run these in a second terminal while `npm run dev` is running.

1. **List the collection.** The response includes `message`, `data`, and `pagination`:

```bash
curl http://127.0.0.1:3010/api/books
```

```json
{
    "message": "Books retrieved successfully.",
    "data": [ /* page of books */ ],
    "pagination": { "page": 1, "limit": 10, "total": 9, "totalPages": 1 }
}
```

2. **Search, filter, sort, and paginate.** Parameters compose freely:

```bash
curl 'http://127.0.0.1:3010/api/books?search=tolkien&sort=title&page=1&limit=5'
curl 'http://127.0.0.1:3010/api/books?genre=Technology&available=true'
curl 'http://127.0.0.1:3010/api/books?sort=-publishedYear&limit=3'
```

`search` is case-insensitive and covers title, author, ISBN, and description. `sort` accepts `id`, `title`, `author`, `publishedYear`, and each of those prefixed with `-` for descending order. `limit` is capped at 50.

3. **Fetch one resource:**

```bash
curl http://127.0.0.1:3010/api/books/3
curl -i http://127.0.0.1:3010/api/books/999    # 404 Not Found
```

4. **Create a book.** The server assigns `id`; an unavailable `copies` count of zero defaults `available` to `false`:

```bash
curl -i -X POST http://127.0.0.1:3010/api/books \
    -H 'Content-Type: application/json' \
    -d '{
        "title": "The Left Hand of Darkness",
        "author": "Ursula K. Le Guin",
        "isbn": "978-0-441-47812-5",
        "genre": "Fiction",
        "publishedYear": 1969,
        "copies": 2,
        "description": "A diplomat on a frozen world questions gender and loyalty."
    }'
```

Expect `201 Created`. Repeating the same request returns `409 Conflict` because the ISBN already exists — hyphen placement and capitalisation are ignored when comparing.

5. **See validation errors.** Fastify's schema runs before the handler, and the central error handler normalises Ajv's output:

```bash
curl -i -X POST http://127.0.0.1:3010/api/books \
    -H 'Content-Type: application/json' \
    -d '{"title": "   ", "author": "Someone"}'
```

```json
{
    "message": "Validation failed.",
    "errors": [
        { "field": "title", "message": "must match pattern \"\\S\"" },
        { "field": "isbn", "message": "must have required property 'isbn'" }
    ]
}
```

6. **Partially update a book.** Only the fields you send are changed; an empty body fails with `400`:

```bash
curl -X PATCH http://127.0.0.1:3010/api/books/1 \
    -H 'Content-Type: application/json' \
    -d '{"copies": 6, "available": true}'
```

7. **Delete a book.** A successful delete has no response body at all:

```bash
curl -i -X DELETE http://127.0.0.1:3010/api/books/9
```

8. **List metadata and trigger the rate limit:**

```bash
curl http://127.0.0.1:3010/api/meta/genres
```

After 100 API requests in 15 minutes (the default), the next one returns `429` with `{ "message": "Too many requests. Please wait a moment and try again." }`. Restart the server or lower `RATE_LIMIT_MAX` in `.env` to experiment.

9. **Reset everything.** Stop the server with `Ctrl+C` and run `npm run dev` again. The original nine books and the id counter are restored from `src/data/seed-books.ts`.

### Workshop Objective

This example isolates the REST fundamentals before databases, authentication, or file uploads add extra moving parts. As you work through it, notice how the same small set of conventions — resource URLs, correct methods and status codes, validated input, stable envelopes, and a single error handler — makes both the curl walkthrough and the browser explorer predictable. The layered route → controller → service split is the same shape used by the larger Workshop 6 applications, so the habits transfer directly when you move on to the Prisma-backed examples.
