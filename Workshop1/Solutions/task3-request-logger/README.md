# Request Logger Plugin (Workshop 1 Task 3 Solution)

This solution turns request logging and response timing into a reusable **Fastify plugin**. The plugin records a start time in `onRequest`, adds an `X-Response-Time` header in `onSend`, and logs the completed request in `onResponse`.

It also includes a deliberately slow route so the timing difference is easy to see.

### What You'll Learn

- **Reusable plugins:** Package shared request behavior behind `fastify-plugin`.
- **Request decoration:** Add a typed `startTime` property to every request.
- **`onRequest`:** Capture the beginning of the request lifecycle.
- **`onSend`:** Set a response header before the response leaves the server.
- **`onResponse`:** Log the final status code and duration after delivery.
- **Plugin options:** Accept a configurable response-header name.
- **Timing measurement:** Use `performance.now()` instead of wall-clock timestamps.
- **Route coverage:** Apply a plugin at the root scope so it covers every route.
- **Structured logging:** Log objects with method, URL, status, and duration fields.

### Project Structure

- `src/plugins/request-logger.ts` — The reusable logging and timing plugin.
- `src/routes/items.ts` — A small in-memory items API.
- `src/routes/demo.ts` — A slow route that makes the timing header meaningful.
- `src/app.ts` — Registers the plugin and route plugins.
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

**1. Check the response header**

```bash
curl -i http://127.0.0.1:3000/api/items
```

Look for:

```text
x-response-time: 0.842 ms
```

The exact value changes on every request.

**2. Compare a slow handler**

```bash
curl -i http://127.0.0.1:3000/api/demo/slow
```

The route waits 120 milliseconds, so the header is noticeably larger:

```json
{
    "message": "This handler deliberately waited before responding.",
    "waitedMs": 120
}
```

**3. Test a missing item**

```bash
curl -i http://127.0.0.1:3000/api/items/999
```

The plugin still applies: the `404` response receives a timing header and an `onResponse` log entry.

**4. Change the header name**

In `src/app.ts`, register the plugin with a custom name:

```typescript
fastify.register(requestLoggerPlugin, {
    headerName: 'x-request-duration'
})
```

Restart the server and confirm that the new header appears. This shows how plugin options make shared functionality reusable.

| Step | What to Explore |
|---|---|
| `GET /api/items` | Collection response with timing. |
| `GET /api/items/1` | Single item response. |
| `GET /api/items/999` | Error responses are timed too. |
| `GET /api/demo/slow` | A larger, obvious duration. |
| Terminal logs | Start, send, and completion entries for each request. |

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | Describe the demo. | None |
| GET | `/api/items` | List all items. | None |
| GET | `/api/items/:itemId` | Return one item or `404`. | None |
| GET | `/api/demo/slow` | Wait before responding to demonstrate timing. | None |

### Workshop Objective

This exercise shows how lifecycle hooks can remove repeated work from route handlers. A single plugin can observe every request, measure it, add a header, and log the result without changing any individual route.
