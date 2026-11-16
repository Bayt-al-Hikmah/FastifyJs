# Request Lifecycle (Workshop 1 Example)

This example makes Fastify's **request lifecycle** visible. A shared plugin records each hook as a request moves through parsing, validation, handling, serialization, and response delivery, then exposes the collected stages in the `X-Lifecycle` response header.

It also demonstrates **plugin encapsulation** by comparing a route in the parent scope with a route inside a plugin that adds its own hook.

### What You'll Learn

- **Lifecycle order:** See `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend`, and `onResponse` execute in order.
- **Custom request state:** Decorate `FastifyRequest` with a `lifecycle` array and a timing value.
- **`fastify-plugin`:** Share hooks with the parent scope instead of hiding them inside one plugin.
- **Encapsulation:** Register a plugin-local `preHandler` that only affects routes in its own plugin.
- **Response headers:** Add `X-Lifecycle` and `X-Response-Time` from an `onSend` hook.
- **Error hooks:** Throw an intentional error and observe `onError` logging.
- **Structured logs:** Follow the hook names and durations in the terminal output.
- **Request isolation:** Create a fresh lifecycle array for every request so state cannot leak between requests.

### Project Structure

- `src/app.ts` — Builds the application, installs a safe error handler, and registers routes.
- `src/plugins/lifecycle.ts` — Shared lifecycle hooks wrapped with `fastify-plugin`.
- `src/plugins/encapsulated.ts` — A scoped plugin with its own `preHandler` and an error route.
- `src/routes/demo.ts` — Two ordinary routes registered under `/api`.
- `src/server.ts` — Starts the server on port `3000`.
- `tsconfig.json` and `package.json` — Project configuration and scripts.

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

**1. Inspect a normal route**

```bash
curl -i http://127.0.0.1:3000/api/demo
```

Look for these headers:

```text
x-lifecycle: onRequest -> preParsing -> preValidation -> preHandler -> preSerialization -> onSend
x-response-time: 1.234 ms
```

The JSON body also contains the lifecycle array. Because `onResponse` runs after the response is sent, it is logged but cannot appear in the response headers.

**2. Compare an encapsulated route**

```bash
curl -i http://127.0.0.1:3000/api/encapsulated
```

The `X-Lifecycle` header now includes `encapsulated:preHandler` after the shared `preHandler`. That hook was registered inside `encapsulated.ts`, so it does not affect `/api/demo`.

**3. Trigger the error path**

```bash
curl -i http://127.0.0.1:3000/api/encapsulated/error
```

The route throws on purpose. Fastify runs `onError`, logs the error, and the application error handler returns a safe `500` response without a stack trace.

**4. Watch the terminal**

Every hook writes a log line. The final `onResponse` entry includes the status code, total duration, and the full lifecycle array.

| Step | What to Explore |
|---|---|
| `GET /` | Overview of the demo and a hint about the headers. |
| `GET /api/demo` | Shared hooks only. |
| `GET /api/demo/ping` | A second route with the same shared lifecycle. |
| `GET /api/encapsulated` | Adds the plugin-local `preHandler`. |
| `GET /api/encapsulated/error` | Shows `onError` and centralized error handling. |

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | Describe the demo and its headers. | None |
| GET | `/api/demo` | Return a response after the shared lifecycle hooks. | None |
| GET | `/api/demo/ping` | Return a small ping response. | None |
| GET | `/api/encapsulated` | Run an extra plugin-local hook. | None |
| GET | `/api/encapsulated/error` | Trigger the error lifecycle. | None |

### Workshop Objective

This example turns the lifecycle diagram from the lecture into something you can observe directly. By comparing the two routes and their headers, you should understand how hook scope, `fastify-plugin`, and encapsulation affect which code runs for a request.
