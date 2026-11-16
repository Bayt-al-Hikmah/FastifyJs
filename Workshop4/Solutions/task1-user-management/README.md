# Authentication and User Management (Workshop 4 Solution)

This solution implements **Task 1** of Workshop 4. It extends the Task Management API with authenticated profile management routes (`GET /api/users/me` and `PATCH /api/users/me`), allowing users to inspect and safely update their profile details (name and email) while strictly preventing privilege escalation or exposure of sensitive credentials.

### What This Solution Demonstrates

- **Authenticated Profile Retrieval (`GET /api/users/me`):** Authenticates the caller via JWT and returns the current user profile from PostgreSQL via the `fastify.authenticate` pre-handler.
- **Safe Profile Updates (`PATCH /api/users/me`):** Users can update their name and email address. The schema restricts input to `additionalProperties: false`, strictly disallowing self-promotion (`role` field is ignored or rejected).
- **Email Normalization & Sanitization:** Pre-validation hooks trim whitespace and lowercases email addresses before database operations.
- **Prisma Error Handling:** Catches unique-constraint violations (`P2002`) gracefully when an email address is already claimed, returning a clean HTTP `409 Conflict`.
- **Identity Synchronization:** Automatically refreshes `request.currentUser` in-flight after profile mutations to keep downstream request hooks consistent.
- **Credential Protection:** Passwords are hashed with Argon2id; password hashes are never returned by any profile endpoint or database query.

### Project Structure

- `prisma/schema.prisma` — PostgreSQL schema defining `User`, `Role`, and `Task` models with relations.
- `prisma7.config.ts` — Prisma 7 configuration file with driver adapter support.
- `src/lib/password.ts` — Argon2id password hashing and constant-time verification.
- `src/lib/prisma-errors.ts` — Helper to detect Prisma-specific error codes (e.g. `P2002`).
- `src/plugins/auth.ts` — `@fastify/jwt` setup, JWT decorators, and `authenticate` / `authorize` pre-handlers.
- `src/plugins/prisma.ts` — Prisma client lifecycle plugin using `@prisma/adapter-pg`.
- `src/routes/auth.ts` — `/api/auth/register` and `/api/auth/login` endpoints with rate limiting.
- `src/routes/users.ts` — `/api/users/me` (GET, PATCH) profile management.
- `src/routes/tasks.ts` — `/api/tasks` CRUD endpoints and `/api/admin/users` list.
- `src/app.ts` — Fastify application factory, plugins, global hooks, and error handling.
- `src/server.ts` — Entry point that boots the HTTP server on `http://127.0.0.1:3000`.
- `.env.example` — Environment variable template with database connection string and JWT secret.
- `package.json` — Scripts and dependencies.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database and Role**

```bash
sudo -i -u postgres psql
```

Create a dedicated role and database:

```sql
CREATE ROLE w4_task1_user_management_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w4_task1_user_management
OWNER w4_task1_user_management_user;

\q
```

**3. Configure Environment Variables**

```bash
cp .env.example .env
```

Generate a secure 32-byte secret for JWT signing:

```bash
openssl rand -base64 32
```

Edit `.env` and configure `DATABASE_URL` and `JWT_SECRET`:

```env
DATABASE_URL="postgresql://w4_task1_user_management_user:change_me@localhost:5432/w4_task1_user_management?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

The server listens on `http://127.0.0.1:3000`.

### Exploring the Solution

The profile management endpoints can be tested using `curl`:

**1. Register a New Account**

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Martin", "email": "alice@example.com", "password": "SuperSecretPassword123"}'
```

**2. Log In to Receive a JWT**

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "SuperSecretPassword123"}'
```

Copy the `token` from the JSON response.

**3. Retrieve Profile (`GET /api/users/me`)**

```bash
export TOKEN="your_jwt_token_here"

curl -X GET http://127.0.0.1:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "id": 1,
  "name": "Alice Martin",
  "email": "alice@example.com",
  "role": "USER"
}
```

**4. Update Profile Name and Email (`PATCH /api/users/me`)**

```bash
curl -X PATCH http://127.0.0.1:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice M. Cooper", "email": "alice.cooper@example.com"}'
```

Response:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "Alice M. Cooper",
    "email": "alice.cooper@example.com",
    "role": "USER",
    "createdAt": "2026-11-16T10:00:00.000Z"
  }
}
```

**5. Verify Privilege Escalation is Prevented**

Attempting to submit `"role": "ADMIN"` returns `400 Bad Request` because `updateProfileSchema` rejects unpermitted fields:

```bash
curl -X PATCH http://127.0.0.1:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "role": "ADMIN"}'
```

### Workshop Objective

By completing this task, you have learned how to build authenticated profile routes, apply JSON Schema validation and preValidation hooks for sanitization, prevent privilege escalation attacks, and catch database constraints safely in Fastify.
