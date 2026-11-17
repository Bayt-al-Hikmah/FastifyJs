# Field Notes Fetch Client (Workshop 6 Example)

A small "Field Notes" journal that teaches the browser side of a REST API without the distraction of a database. One Fastify process serves a tiny in-memory notes API and a polished dashboard whose JavaScript demonstrates the Fetch API patterns from Workshop 6: a reusable request helper, `response.ok`, `204` handling, safe DOM rendering, validation errors, search/filtering, and `FormData` uploads.

Everything runs on a single port (`3020`), so `http://127.0.0.1:3020/app/` is the UI and `http://127.0.0.1:3020/api/notes` is the API.

### What You'll Learn

- **Reusable `apiRequest` helper** — one function handles headers, JSON parsing, and errors for every request.
- **`response.ok`** — Fetch resolves on HTTP errors, so every response must be checked explicitly.
- **204 No Content** — successful deletes have no body and must never be passed to `response.json()`.
- **JSON request bodies** — `JSON.stringify()` plus an automatic `Content-Type: application/json`.
- **GET / POST / PATCH / DELETE** — the four verbs used by a complete journal UI.
- **Query strings** — `search` and `topic` filters are built with `URLSearchParams`.
- **Error metadata** — `.status` and `.details` on thrown errors carry HTTP status and field-level validation messages.
- **Safe DOM rendering** — cards are built with `createElement()` and `textContent`, never `innerHTML` with API data.
- **Loading, empty, and error states** — `aria-live` regions keep the interface understandable at every stage.
- **`FormData` uploads** — the browser sets `multipart/form-data` and its boundary; we do not set `Content-Type`.
- **Signature-checked images** — the server verifies JPEG/PNG/WebP magic bytes and stores files with generated names.
- **Response envelopes** — consistent `{ message, data }` success bodies and `{ message, errors }` validation failures.

### Project Structure

```text
Workshop6/Examples/fetch-client/
├── package.json                  # ESM project, Fastify 5, multipart, static, file-type
├── tsconfig.json                 # NodeNext module/resolution, strict TypeScript
├── .env.example                  # Host, port, CORS origin, upload directory
├── .gitignore                    # Ignores node_modules, dist, .env, uploaded images
├── var/uploads/.gitkeep          # Keeps the private upload directory in git
├── src/
│   ├── config.ts                 # Environment-driven settings and image allowlist
│   ├── app.ts                    # Plugins, static UI, error handler, 404 handler
│   ├── server.ts                 # Starts the HTTP server
│   ├── types/note.ts             # Note, input, update, and stored image types
│   ├── lib/
│   │   ├── api-error.ts          # ApiError type and response helpers
│   │   └── image-store.ts        # Signature checks, private storage, cleanup
│   ├── services/note-service.ts  # In-memory notes, search, filter, CRUD
│   └── routes/notes.ts           # JSON Schema validation and all API endpoints
└── public/
    ├── index.html                # Semantic, accessible dashboard markup
    ├── css/style.css             # Paper-journal theme, cards, responsive layout
    └── js/
        ├── api.js                # The reusable apiRequest helper (the star)
        ├── notes.js              # DOM rendering, forms, filters, upload, states
        └── main.js               # Event wiring and startup
```

### Getting Started

**This project is database-free.** There is no PostgreSQL role, database, migration, or Prisma client to create. Notes live in memory and reset to the seed data whenever the server restarts. Uploaded images are the only files written to disk.

1. Install the dependencies:

```bash
cd Workshop6/Examples/fetch-client
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. The defaults are already correct for local work. They are:

```dotenv
HOST="127.0.0.1"
PORT="3020"
CORS_ORIGIN="*"
UPLOAD_DIR="./var/uploads"
```

There is no `JWT_SECRET` because this example's API is intentionally public — the focus is the browser-side Fetch code. `CORS_ORIGIN="*"` is fine for learning; in production set it to the exact frontend origin (or remove CORS entirely when the API and UI share an origin, as they do here).

4. Start the development server:

```bash
npm run dev
```

   You should see a log line stating that private image storage is ready and that the server is listening on `http://127.0.0.1:3020`.

5. Open the dashboard at **http://127.0.0.1:3020/app/**. The root URL `/` redirects there automatically. Use `npm run build` to compile to `dist/`, `npm start` to run the compiled version, and `npm run typecheck` to check types without emitting files.

### Exploring the Example

Open the UI first and try a full round trip: search for "garden", filter by a topic, select a note, edit it, save, attach a small PNG/JPEG/WebP image, then delete it. Watch the status regions change between loading, empty, success, and error states.

You can also exercise the API directly:

| Step | Action | Request |
|---|---|---|
| 1 | List all notes | `GET /api/notes` |
| 2 | Search | `GET /api/notes?search=light` |
| 3 | Filter by topic | `GET /api/notes?topic=Gardening` |
| 4 | Get one note | `GET /api/notes/3` |
| 5 | Get available topics | `GET /api/meta/topics` |
| 6 | Create a note | `POST /api/notes` with JSON |
| 7 | Update a note | `PATCH /api/notes/:id` with JSON |
| 8 | Upload an image | `POST /api/notes/:id/image` with `multipart/form-data` |
| 9 | View an image | `GET /api/notes/:id/image` |
| 10 | Delete a note | `DELETE /api/notes/:id` → `204` |

```bash
# 1. List notes — the response is { "message": "...", "data": { "notes": [...], "total": 6 } }
curl http://127.0.0.1:3020/api/notes

# 2. Search and filter (both work together)
curl 'http://127.0.0.1:3020/api/notes?search=light&topic=Photography'

# 3. One note
curl http://127.0.0.1:3020/api/notes/3

# 6. Create a note
curl -X POST http://127.0.0.1:3020/api/notes \
    -H 'Content-Type: application/json' \
    -d '{"title":"River walk","body":"The path is dry after the rain.","topic":"Field Craft"}'

# 7. Update only the fields you want to change (minProperties: 1)
curl -X PATCH http://127.0.0.1:3020/api/notes/7 \
    -H 'Content-Type: application/json' \
    -d '{"title":"River walk, revised"}'

# 8. Upload an image. curl supplies the multipart boundary (-F), just as the
#    browser does for FormData. Never set Content-Type manually in the browser.
curl -X POST http://127.0.0.1:3020/api/notes/7/image \
    -F 'image=@/path/to/photo.jpg'

# 9. Fetch the stored image (streamed from a server-generated storage name)
curl http://127.0.0.1:3020/api/notes/7/image --output note-image.jpg

# 10. Delete — no response body, so the client helper returns null for 204
curl -i -X DELETE http://127.0.0.1:3020/api/notes/7
```

A validation failure shows the field-level envelope that the UI renders next to the form:

```json
{
    "message": "Validation failed.",
    "errors": [
        { "field": "title", "message": "must NOT have fewer than 1 characters" }
    ]
}
```

Uploaded images are written to `var/uploads/` with server-generated UUID names. The server checks the file's binary signature with `file-type`, allows only JPEG/PNG/WebP up to 5 MB, and never trusts the client filename or declared MIME type. Uploading again replaces the old image, and deleting a note removes its image file.

### Workshop Objective

This example isolates the front-end lessons of Workshop 6: the API is deliberately small, public, and in-memory so that all attention stays on how a browser consumes it. By the end you should be able to explain why Fetch requires an explicit `response.ok` check, why a `204` needs special handling, how a single `apiRequest` helper removes repetition, how field errors travel from JSON Schema to the DOM, and how `FormData` lets the browser build a correct multipart upload without a hand-written `Content-Type` header. These are the same patterns used in the larger Prisma-backed examples later in the workshop.
