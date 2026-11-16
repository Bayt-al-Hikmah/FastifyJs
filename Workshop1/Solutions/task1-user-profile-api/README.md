# User Profile API (Workshop 1 Task 1 Solution)

This solution implements the **user profile API** exercise using hardcoded data, Fastify 5, and TypeScript. A profile can be requested by username, and an optional `details=true` query parameter expands the response with the user's email address and role.

### What You'll Learn

- **Typed profile data:** Model a user profile with a TypeScript type and a `Record<string, UserProfile>` fake database.
- **URL parameters:** Identify the user with `/api/profile/:username`.
- **Optional query parameters:** Read `details` from `request.query` and compare it to the string `'true'`.
- **Conditional responses:** Return a basic profile or an extended profile from the same handler.
- **JSON Schema validation:** Accept only `true` or `false` for the `details` query value.
- **Response schemas:** Describe both the basic and extended response shapes with optional properties.
- **404 handling:** Return a clear error when the requested user does not exist.
- **Plugin structure:** Keep the profile endpoint in its own route plugin and register it with the `/api` prefix.

### Project Structure

- `src/app.ts` — Creates the application and registers the profile plugin under `/api`.
- `src/routes/profile.ts` — Profile type, fake user data, schemas, and the route handler.
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

**Basic profile**

```bash
curl -i http://127.0.0.1:3000/api/profile/Alice
```

```json
{
    "username": "Alice"
}
```

**Extended profile**

```bash
curl -i "http://127.0.0.1:3000/api/profile/Alice?details=true"
```

```json
{
    "username": "Alice",
    "email": "alice@example.com",
    "role": "admin"
}
```

Try `details=false` and confirm that only the username is returned. Query values are strings, so the handler uses `request.query.details === 'true'` rather than a truthiness check.

**Unknown user**

```bash
curl -i http://127.0.0.1:3000/api/profile/Unknown
```

Expected result: `404 Not Found` with `{ "error": "User not found" }`.

**Invalid query value**

```bash
curl -i "http://127.0.0.1:3000/api/profile/Alice?details=yes"
```

Fastify rejects the request with `400 Bad Request` because the schema allows only `"true"` or `"false"`.

| Step | What to Explore |
|---|---|
| `GET /api/profile/Bob` | A second user from the fake database. |
| `?details=true` | Adds `email` and `role` to the response. |
| `?details=false` | Returns only `username`. |
| Unknown username | The lookup returns `undefined`, so the handler sends `404`. |
| Response schema | `additionalProperties: false` prevents unexpected fields. |

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | List the profile endpoints. | None |
| GET | `/api/profile/:username` | Return a basic profile. | None |
| GET | `/api/profile/:username?details=true` | Return an extended profile. | None |

### Workshop Objective

This exercise reinforces the relationship between URL parameters, query parameters, and JSON Schema. By the end, you should be able to validate an optional query value at runtime and return different response shapes without breaking the response contract.
