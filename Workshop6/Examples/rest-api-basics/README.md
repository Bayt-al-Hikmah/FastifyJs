# Community Library API (Workshop 6 Example)

This example is a complete, database-free REST API built with Fastify 5 and
TypeScript. It exposes a small **Community Library** collection of books and
serves an interactive API explorer at the root URL.

The goal is to practise REST design without the extra setup of a database:
resource-oriented URLs, HTTP method semantics, JSON Schema validation,
consistent response envelopes, meaningful status codes, pagination, filtering,
CORS, and rate limiting.

All data lives in memory, so the collection resets every time the server
restarts. That makes the example safe to experiment with: create a book, break
a request on purpose, delete a title, and restart to get the seed data back.

## What You'll Learn

- **Resource-oriented URLs** — `/api/books` is a collection and
  `/api/books/:id` is one member of that collection.
- **HTTP method semantics** — `GET` reads, `POST` creates, `PATCH` partially
  updates, and `DELETE` removes.
- **JSON Schema validation** — params, query strings, and request bodies are
  validated before a handler runs.
- **Consistent JSON envelopes** — successful responses use `data` and `meta`;
  errors use `error.code`, `error.message`, and `error.details`.
- **Status codes with meaning** — `201 Created`, `204 No Content`, `404 Not
  Found`, `409 Conflict`, `422 Unprocessable Entity`, and `429 Too Many
  Requests` each describe a distinct outcome.
- **Pagination, search, filtering, and sorting** — collection queries are
  bounded and return pagination metadata.
- **Rate limiting and CORS** — reads and writes have separate limits, and
  cross-origin access can be restricted with environment variables.
- **API-first exploration** — the static UI sends real requests, so the API can
  be tested independently of any frontend framework.

## Project Structure

```text
rest-api-basics/
├── public/
│   ├── css/
│   │   └── style.css           # Explorer layout, cards, forms, response viewer
│   ├── js/
│   │   └── app.js              # Endpoint definitions and fetch calls
│   └── index.html              # Static API explorer
├── src/
│   ├── controllers/
│   │   └── book-controller.ts  # HTTP request/response handling
│   ├── data/
│   │   └── seed-books.ts       # In-memory starter collection
│   ├── lib/
│   │   └── api-error.ts        # Small typed error class
│   ├── routes/
│   │   └── books.ts            # Routes, schemas, and rate-limit config
│   ├── schemas/
│   │   └── book-schemas.ts     # JSON Schemas for params, query, and bodies
│   ├── services/
│   │   └── book-service.ts     # Collection logic and business rules
│   ├── types/
│   │   └── book.ts             # Shared TypeScript types
│   ├── app.ts                  # Fastify application, CORS, errors, static UI
│   ├── config.ts               # Environment configuration
│   └── server.ts               # Process entry point
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

The route → controller → service split is intentional. Routes describe the HTTP
contract, controllers translate between HTTP and the service, and the service
owns the in-memory data and business rules.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables (optional)**

   The API has safe defaults, so this step is optional. To customise the port,
   host, or allowed frontend origins:

   ```bash
   cp .env.example .env
   ```

   The default values are:

   ```env
   PORT=3010
   HOST=127.0.0.1
   FRONTEND_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"
   NODE_ENV="development"
   ```

   The API explorer is served from the same origin, so it works without any
   CORS configuration. `FRONTEND_ORIGIN` accepts a comma-separated list and is
   only needed when a separate frontend consumes the API. If the variable is
   empty, the demo reflects any origin; restrict it in a real deployment.

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open the explorer**

   Visit <http://127.0.0.1:3010>. The page lists every endpoint, provides
   try-it forms, and renders the status, headers, and JSON body of each
   response.

5. **Build for a production-style run (optional)**

   ```bash
   npm run build
   npm start
   ```

   The compiled server still serves `public/` relative to the project root.

## Exploring the Example

### Endpoints

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| `GET` | `/api/books` | List books with pagination, search, category filtering, and sorting. | `200` |
| `GET` | `/api/books/:id` | Retrieve one book by numeric ID. | `200` |
| `POST` | `/api/books` | Create a book and return a `Location` header. | `201` |
| `PATCH` | `/api/books/:id` | Partially update allowed book fields. | `200` |
| `DELETE` | `/api/books/:id` | Remove a book. | `204` |

There is no authentication in this example. Authentication and ownership are
introduced in the `community-events-api` example.

### Collection query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page to return. Starts at 1. |
| `limit` | integer | `10` | Page size. Maximum 50. |
| `search` | string | — | Case-insensitive match on title, author, or description. |
| `category` | enum | — | One of `FICTION`, `NON_FICTION`, `SCIENCE`, `HISTORY`, `POETRY`, `CHILDREN`, `TECHNOLOGY`. |
| `sort` | enum | `newest` | `newest`, `oldest`, `title`, `author`, or `year`. |

Unknown query parameters are rejected by the schema instead of being silently
ignored.

### Response envelopes

A successful collection request returns an array in `data` and context in
`meta`:

```json
{
    "data": [
        {
            "id": 1,
            "title": "The Left Hand of Darkness",
            "author": "Ursula K. Le Guin",
            "category": "FICTION",
            "description": "An envoy visits a frozen world...",
            "publishedYear": 1969,
            "isbn": "9780441478125",
            "totalCopies": 4,
            "availableCopies": 2,
            "addedAt": "2026-09-02T09:15:00.000Z",
            "updatedAt": "2026-10-18T14:30:00.000Z"
        }
    ],
    "meta": {
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 14,
            "totalPages": 2,
            "hasNextPage": true,
            "hasPreviousPage": false
        },
        "filters": {
            "search": null,
            "category": null
        },
        "sort": "newest"
    }
}
```

A single-resource request returns the object directly in `data`:

```json
{
    "data": {
        "id": 3,
        "title": "The Pragmatic Programmer"
    }
}
```

An error always uses the same shape:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed.",
        "details": [
            {
                "field": "author",
                "message": "must have required property 'author'"
            }
        ]
    }
}
```

`details` is `null` when there is nothing useful to add, as in a simple `404`.

### Status code map

| Status | When it is used |
|---|---|
| `200 OK` | A read or update succeeded and a body is returned. |
| `201 Created` | A book was created. The response also has a `Location` header. |
| `204 No Content` | A book was deleted. The response body is empty. |
| `400 Bad Request` | The JSON body is missing or malformed. |
| `404 Not Found` | The requested book or API route does not exist. |
| `409 Conflict` | A second book uses the same ISBN. |
| `413 Payload Too Large` | The request body exceeds Fastify's limit. |
| `415 Unsupported Media Type` | A non-JSON content type was sent to a JSON endpoint. |
| `422 Unprocessable Entity` | JSON Schema validation failed, or a business rule was violated. |
| `429 Too Many Requests` | A client exceeded a read or write rate limit. |

### Pagination and filtering

Pagination is applied after search and category filtering, so `meta.pagination.total`
always describes the filtered collection:

```bash
curl "http://127.0.0.1:3010/api/books?search=le%20guin&category=FICTION&sort=title&page=1&limit=5"
```

`page` values beyond the last page return an empty `data` array and consistent
metadata. A negative or non-numeric page is rejected with `422`.

### Trying It with curl

List the first three books:

```bash
curl "http://127.0.0.1:3010/api/books?limit=3"
```

Search for a word and filter by category:

```bash
curl "http://127.0.0.1:3010/api/books?search=systems&category=SCIENCE"
```

Retrieve one book:

```bash
curl "http://127.0.0.1:3010/api/books/3"
```

Create a book and inspect the `Location` header:

```bash
curl -i -X POST http://127.0.0.1:3010/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Creative Act",
    "author": "Rick Rubin",
    "category": "NON_FICTION",
    "description": "A short book about attention, preparation, and making things.",
    "publishedYear": 2023,
    "isbn": "9780593652886",
    "totalCopies": 3,
    "availableCopies": 3
  }'
```

Partially update the new book:

```bash
curl -X PATCH http://127.0.0.1:3010/api/books/15 \
  -H "Content-Type: application/json" \
  -d '{
    "totalCopies": 5,
    "availableCopies": 4
  }'
```

Delete the book and confirm the empty `204` response:

```bash
curl -i -X DELETE http://127.0.0.1:3010/api/books/15
```

Try a validation failure:

```bash
curl -X POST http://127.0.0.1:3010/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"x"}'
```

The API responds with `422` and a list of the invalid or missing fields.

### What to try in the explorer

| Area | Experiment |
|---|---|
| Endpoint list | Switch between the five operations. The URL preview updates as you edit fields. |
| Search and filters | Filter by category, then combine it with a search term and a non-default sort. |
| Pagination | Request page 2, then a page beyond the end and compare the metadata. |
| Validation | Send a short description, a negative copy count, or an unknown field. |
| Business rules | Create a book with `availableCopies` greater than `totalCopies`. |
| Conflicts | Create two books with the same ISBN and observe the `409`. |
| Create and delete | Create a book, open it from the shelf, patch it, then delete it and refresh. |
| Rate limiting | Repeatedly send writes until the `429` response appears. |
| Status and headers | Watch the status badge and the `Location` header after a `201`. |

### REST principles demonstrated

- **Client-server separation** — the browser only renders data; the API owns
  validation and collection rules.
- **Stateless requests** — every request contains everything the server needs.
  No request depends on hidden per-client state.
- **Uniform interface** — stable resource URLs, standard methods, predictable
  JSON shapes, and meaningful status codes.
- **Resource identification** — IDs appear in the URL, not in a custom action
  name such as `/getBook`.
- **Safe and idempotent methods** — `GET` does not modify state, and repeating
  the same `PATCH` or `DELETE` has the same intended effect.
- **Cacheable reads** — collection and item reads can be cached by an
  intermediary when the application adds explicit cache headers.

### Rate limiting and CORS

Read routes allow 120 requests per minute per client. Create, update, and delete
routes allow 30 requests per minute. The plugin returns a `429` response in the
same error envelope and exposes rate-limit headers when CORS allows the browser
to read them.

CORS is configured from `FRONTEND_ORIGIN`. With the example value, a Vite
frontend at `http://localhost:5173` can call the API directly. Credentials are
disabled because this API does not use cookies. Remember that CORS is enforced
by browsers, not by `curl`, and it is not an authentication mechanism.

## Workshop Objective

This example isolates the REST layer from the database and authentication so
the API contract is easy to see. Once the request methods, schemas, envelopes,
status codes, and pagination rules are clear, the
[`community-events-api`](../community-events-api) example adds PostgreSQL,
Prisma, JWT authentication, ownership authorization, registrations, and file
uploads without changing those fundamentals.
