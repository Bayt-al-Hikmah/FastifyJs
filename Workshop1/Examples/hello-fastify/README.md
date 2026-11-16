# Hello Fastify (Workshop 1 Example)

This example creates the smallest useful **Fastify 5** application with **TypeScript**. It builds the server in `app.ts`, starts it in `server.ts`, and exposes a root greeting and a health-check route.

The application demonstrates the project setup, module configuration, application factory, and route definition pattern used throughout the rest of the course.

### What You'll Learn

- **Application factory:** Keep `buildApp()` separate from server startup so the app can be tested without opening a network port.
- **Fastify initialization:** Create an instance with `Fastify({ logger: true })` and read structured request logs in the terminal.
- **TypeScript ESM:** Run `.ts` files directly with `tsx` and use `.js` extensions in local imports.
- **Route handlers:** Return a JavaScript object and let Fastify serialize it as JSON.
- **JSON Schema responses:** Describe the exact shape of outgoing JSON with a response schema.
- **Health checks:** Expose a tiny endpoint that reports service status and uptime.
- **npm scripts:** Use `dev`, `build`, `start`, and `typecheck` for a normal development workflow.
- **Local networking:** Bind the server to `127.0.0.1:3000` so it is only reachable from the local machine.

### Project Structure

- `src/app.ts` — Creates and configures the Fastify instance and its two routes.
- `src/server.ts` — Starts the HTTP server and handles startup errors.
- `tsconfig.json` — TypeScript compiler configuration for an ESM Node.js project.
- `package.json` — Dependencies and development scripts.
- `README.md` — This guide.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Run the Application**

```bash
npm run dev
```

The server starts at `http://127.0.0.1:3000`. `tsx watch` restarts it whenever a source file changes.

**3. Stop the Server**

Press `Ctrl + C` in the terminal.

### Exploring the Example

| Step | Request | What You Should See |
|---|---|---|
| Greeting | `curl -i http://127.0.0.1:3000/` | `200 OK` and a JSON object containing `message`, `service`, and `documentation`. |
| Health check | `curl -i http://127.0.0.1:3000/health` | `200 OK`, `status: "ok"`, and the process uptime in seconds. |
| Request log | Watch the terminal while sending a request | Fastify logs the method, URL, status code, and response time. |
| Unknown route | `curl -i http://127.0.0.1:3000/missing` | Fastify's default `404 Not Found` JSON response. |

The root response looks similar to this:

```json
{
    "message": "Hello, World!",
    "service": "hello-fastify",
    "documentation": "Try GET /health for a status check."
}
```

The response schema uses `additionalProperties: false`, so Fastify serialization only sends the properties described in the schema. This is a useful habit: the handler cannot accidentally leak an extra field.

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | Return a greeting and endpoint hint. | None |
| GET | `/health` | Report service status and uptime. | None |

### Workshop Objective

This example establishes the basic Fastify and TypeScript workflow that later examples build on. By the end, you should be comfortable creating an application factory, defining a route, returning JSON, and starting the server through an npm script.
