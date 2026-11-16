# Fastify Lifecycle Hooks and Encapsulation (Workshop 4 Solution)

This solution implements **Task 4** of Workshop 4. It demonstrates the execution flow of Fastify's request lifecycle hooks (`onRequest`, `preValidation`, `preHandler`, `onSend`, `onResponse`, and `onError`), application-level hooks (`onReady` and `onClose`), and the fundamental difference between standard encapsulated plugins and shared plugins created with `fastify-plugin`.

### What This Solution Demonstrates

- **Lifecycle Hook Ordering:** Observes hook execution sequence for incoming requests (`onRequest` -> `preValidation` -> `preHandler` -> handler -> `onSend` -> `onResponse`).
- **Timing & Metrics:** Captures request start time (`request.startedAt`) in `onRequest` and computes elapsed duration upon completion in `onResponse`.
- **Pre-Validation Input Normalization:** Uses `preValidation` to trim and normalize string inputs before JSON schema validation rules execute.
- **Response Mutation via `onSend`:** Appends custom diagnostic headers (`X-Application`, `X-Hook-Order`, and `X-Response-Time-Ms`) to outbound payloads.
- **Error Interception with `onError`:** Catches and logs uncaught exceptions without interfering with error handlers.
- **Server Lifecycle Hooks (`onReady` and `onClose`):** Performs initialization announcements and ensures clean graceful shutdown on `SIGINT` / `SIGTERM`.
- **Plugin Encapsulation Boundaries:** Compares an encapsulated plugin (where decorators are private to that plugin's scope) against a plugin wrapped in `fastify-plugin` (which exposes decorators to the parent instance).

### Project Structure

- `src/plugins/lifecycle.ts` — Registers global request/response lifecycle hooks and request decorators.
- `src/plugins/normal-plugin.ts` — Encapsulated plugin with private decorators and scoped routes (`/api/encapsulation/normal`).
- `src/plugins/shared-plugin.ts` — Shared plugin using `fastify-plugin` (`fp`) breaking encapsulation to expose global decorators.
- `src/routes/demo.ts` — Interactive endpoints demonstrating lifecycle order, normalization, error handling, and scope comparison.
- `src/types/fastify.d.ts` — TypeScript declaration merging for custom request and instance decorators.
- `src/app.ts` — Fastify application factory assembling plugins and routes.
- `src/server.ts` — Server entry point with graceful shutdown handling.
- `package.json` — Dependencies and scripts.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

*(Note: No database or `.env` configuration is required for this lifecycle demonstration).*

**2. Start the Server**

```bash
npm run dev
```

The server starts on `http://127.0.0.1:3000`. Watch your terminal output to view the logged lifecycle hook events.

### Exploring the Solution

Test the endpoints using `curl` and inspect both the HTTP responses and terminal logs:

**1. Explore Available Endpoints (`GET /api`)**

```bash
curl -X GET http://127.0.0.1:3000/api
```

**2. Observe Normal Execution Order (`GET /api/demo`)**

```bash
curl -i http://127.0.0.1:3000/api/demo
```

Notice the custom response headers added by `onSend`:
```http
X-Application: Fastify Hooks Demo
X-Hook-Order: onRequest -> preValidation -> preHandler -> onSend -> onResponse
X-Response-Time-Ms: 1
```

Check the terminal to see:
- `[onRequest] Incoming request`
- `[preHandler] Handler executing`
- `[onSend] Mutating outbound response headers`
- `[onResponse] Request completed in 1ms`

**3. Test Input Normalization in `preValidation` (`POST /api/users`)**

Send a username with leading and trailing whitespace:

```bash
curl -X POST http://127.0.0.1:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "   AdaLovelace   "}'
```

Response:
```json
{
  "message": "Username normalized by the preValidation hook",
  "username": "AdaLovelace"
}
```

The `preValidation` hook trimmed the whitespace before schema validation ran, preventing schema failure while sanitizing the payload.

**4. Trigger the Error Lifecycle (`GET /api/error`)**

```bash
curl -i http://127.0.0.1:3000/api/error
```

Observe `onError` in the server terminal logging the intentional exception details before the custom error handler formats the 500 response.

**5. Inspect Encapsulation vs Shared Plugins (`GET /api/encapsulation/compare`)**

```bash
curl http://127.0.0.1:3000/api/encapsulation/compare
```

Response:
```json
{
  "normalPluginDecoratorVisible": false,
  "sharedPluginDecoratorVisible": true,
  "sharedValue": "visible in the parent scope because of fastify-plugin"
}
```

This confirms that:
- Decorators added inside `normal-plugin.ts` remain strictly encapsulated within that plugin's scope.
- Decorators added inside `shared-plugin.ts` (wrapped with `fp`) are exposed to parent scopes and other sibling routes.

### Workshop Objective

By completing this task, you have gained practical understanding of Fastify's request and application lifecycles, how to write cross-cutting hooks, and how plugin encapsulation governs decorator and hook visibility across your backend application.
