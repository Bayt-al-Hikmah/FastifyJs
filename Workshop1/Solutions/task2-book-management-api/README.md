# Book Management API (Workshop 1 Task 2 Solution)

This solution implements the **book management API** exercise. It reads books from an in-memory collection, supports a `summary=true` mode, and accepts new books through a validated JSON request body.

Creating a book returns the stored resource with a generated ID and the HTTP status `201 Created`.

### What You'll Learn

- **Request bodies:** Read parsed JSON from `request.body` with a typed `Body` generic.
- **Body validation:** Require string `title` and `author` fields and a positive numeric `price`.
- **Resource creation:** Generate an ID, store the book, and return the created resource.
- **`201 Created`:** Use the correct status code for a successful `POST`.
- **Summary mode:** Return only the title and author when `summary=true` is present.
- **Parameter validation:** Use JSON Schema for both URL and query parameters.
- **Response contracts:** Define separate success and `404` response schemas.
- **In-memory state:** Understand that new books disappear when the server restarts.

### Project Structure

- `src/app.ts` — Creates the application and registers the books plugin under `/api`.
- `src/routes/books.ts` — Book type, fake database, GET and POST schemas, and handlers.
- `src/server.ts` — Starts the server on port `3000`.
- `tsconfig.json` and `package.json` — TypeScript and npm configuration.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Run the Application**

```bash
npm run dev
```

The server starts at `http://127.0.0.1:3000`.

### Exploring the Example

**1. Read a book**

```bash
curl -i http://127.0.0.1:3000/api/books/201
```

```json
{
    "id": "201",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "price": 35
}
```

**2. Request a summary**

```bash
curl -i "http://127.0.0.1:3000/api/books/201?summary=true"
```

```json
{
    "title": "Clean Code",
    "author": "Robert C. Martin"
}
```

**3. Create a book**

```bash
curl -i -X POST http://127.0.0.1:3000/api/books \
    -H "Content-Type: application/json" \
    -d '{"title":"The Pragmatic Programmer","author":"David Thomas","price":40}'
```

The response is `201 Created` and includes the generated ID:

```json
{
    "id": "203",
    "title": "The Pragmatic Programmer",
    "author": "David Thomas",
    "price": 40
}
```

The new book is available at `GET /api/books/203` until the server restarts.

**4. Test validation**

```bash
curl -i -X POST http://127.0.0.1:3000/api/books \
    -H "Content-Type: application/json" \
    -d '{"title":"Missing Price","author":"Someone"}'
```

Passing zero or a negative price also fails:

```bash
curl -i -X POST http://127.0.0.1:3000/api/books \
    -H "Content-Type: application/json" \
    -d '{"title":"Bad Price","author":"Someone","price":-5}'
```

Both requests return `400 Bad Request` before the handler runs.

| Step | What to Explore |
|---|---|
| `GET /api/books/201` | Full book representation. |
| `?summary=true` | A reduced response shape. |
| `POST /api/books` | Typed body parsing and a generated ID. |
| Invalid body | JSON Schema rejects missing or wrong fields. |
| Unknown ID | The handler returns `404 Not Found`. |

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | List the book endpoints. | None |
| GET | `/api/books/:bookId` | Return a book or a summary. | None |
| POST | `/api/books` | Create a book from a validated JSON body. | None |

### Workshop Objective

This task moves beyond retrieval and introduces a write operation. By the end, you should be able to validate a JSON request body, create a resource safely, return `201 Created`, and keep the response schema consistent with the stored data.
