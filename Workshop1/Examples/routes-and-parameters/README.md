# Routes and Parameters (Workshop 1 Example)

This example organizes a small JSON API into **Fastify route plugins** and demonstrates **URL parameters**, **query parameters**, and **JSON Schema validation**.

It contains a user greeting route, a search route, and a product route with an optional stock field. All API routes are registered under the `/api` prefix.

### What You'll Learn

- **Route plugins:** Group related endpoints in separate files with `FastifyPluginAsync`.
- **URL parameters:** Read a variable path segment such as `:username` or `:productId` from `request.params`.
- **Query parameters:** Read optional values such as `?query=fastify` and `?includeStock=true` from `request.query`.
- **Route prefixes:** Apply `/api` once with `fastify.register(plugin, { prefix: '/api' })`.
- **Runtime validation:** Reject bad input with JSON Schema before the route handler runs.
- **Enum validation:** Restrict `includeStock` to the strings `"true"` and `"false"`.
- **Response schemas:** Control the serialized JSON shape for success and error responses.
- **Conditional responses:** Include `inStock` only when the client explicitly asks for it.
- **Status codes:** Return `404 Not Found` for an unknown product and `400 Bad Request` for invalid input.

### Project Structure

- `src/app.ts` — Builds the application, registers the route plugins, and defines the root index route.
- `src/routes/users.ts` — `GET /api/users/:username`.
- `src/routes/search.ts` — `GET /api/search?query=...`.
- `src/routes/products.ts` — `GET /api/products/:productId?includeStock=true`.
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

**User greeting**

```bash
curl -i http://127.0.0.1:3000/api/users/Alice
```

```json
{
    "message": "Hello, Alice!"
}
```

Change `Alice` to `Bob` and the same route returns a different message.

**Search with a query string**

```bash
curl -i "http://127.0.0.1:3000/api/search?query=nodejs+tutorials"
```

```json
{
    "message": "You are searching for: nodejs tutorials"
}
```

Without a query value, the handler returns a hint instead:

```bash
curl -i http://127.0.0.1:3000/api/search
```

**Product lookup**

```bash
curl -i http://127.0.0.1:3000/api/products/100
```

```json
{
    "id": "100",
    "name": "Laptop",
    "price": 1200
}
```

Ask for stock information:

```bash
curl -i "http://127.0.0.1:3000/api/products/100?includeStock=true"
```

```json
{
    "id": "100",
    "name": "Laptop",
    "price": 1200,
    "inStock": true
}
```

**Missing and invalid resources**

```bash
curl -i http://127.0.0.1:3000/api/products/999
curl -i "http://127.0.0.1:3000/api/products/100?includeStock=invalid"
```

The first request returns `404` with `{ "error": "Product not found" }`. The second is rejected by Fastify's JSON Schema validation with `400 Bad Request` before the handler runs.

| Step | What to Explore |
|---|---|
| Static route | `GET /` returns a small index of the API routes. |
| URL parameter | The username becomes part of the response. |
| Optional query | `/api/search` works with or without `query`. |
| Enum validation | Only `true` or `false` is accepted for `includeStock`. |
| Response serialization | Unlisted properties are removed by the response schema. |
| Missing data | A fake database lookup returns `undefined`, which becomes a `404`. |

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | List the available API routes. | None |
| GET | `/api/users/:username` | Return a greeting for a username. | None |
| GET | `/api/search` | Echo a search term from `?query=`. | None |
| GET | `/api/products/:productId` | Return a product, optionally with `inStock`. | None |

### Workshop Objective

By the end of this example, you should understand how Fastify matches dynamic routes, exposes request data through `params` and `query`, and validates that data at runtime. You should also be able to split related endpoints into plugins and apply a shared URL prefix.
