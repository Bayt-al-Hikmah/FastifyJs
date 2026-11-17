# Learning Resource API (Workshop 6 Solution)

This solution implements **Task 3: Learning Resource API**. Instructors create, update, publish, and delete their own learning resources; students browse only the published catalogue. Built with Fastify 5, TypeScript, Prisma 7, and PostgreSQL, it combines JWT role checks with ownership checks derived from the token, a role-aware visibility rule for drafts, and signature-checked private attachment storage. A polished "Open Shelf" dashboard at `/app/` exercises every endpoint with Fetch.

### What You'll Learn

- **Role-Based Authorization:** `INSTRUCTOR` and `STUDENT` roles chosen at registration and enforced with an `authorize(...roles)` preHandler.
- **Ownership in Database Queries:** Update and delete use `instructorId` from the verified token inside the Prisma `where` clause, so changing an ID in the URL cannot target another instructor's work.
- **Publication Visibility Rules:** `GET /resources` returns only `PUBLISHED` rows; an instructor can additionally read their own drafts, while a student's request for a draft returns `404` rather than `403`.
- **Consistent Response Envelopes:** Success uses `{ "message": "...", "data": { ... } }`, lists add `pagination`, validation failures use a field-level `errors` array, and deletions return `204`.
- **JSON Schema Validation:** Params, query strings, and bodies use `additionalProperties: false`, defaults for pagination, and `minProperties: 1` on PATCH bodies.
- **Layered Architecture:** Separate config, plugins, schemas, services (libraries), routes, and server modules keep the code readable and testable.
- **Private Media Storage:** Uploads stream to `var/uploads/staging`, are validated with `file-type` magic-byte detection, and move to `var/uploads/objects` under a server-generated UUID.
- **Authenticated Streaming Downloads:** The storage key comes from the database row, and responses set `X-Content-Type-Options: nosniff` plus `Cache-Control: private, no-store`.
- **Compensating Cleanup:** A failed database write removes the newly stored object, and replacing or deleting an attachment removes the previous file.
- **Centralized Error Handling:** One `setErrorHandler` maps validation, Prisma `P2002`/`P2025`, multipart size errors, and unknown 500s to safe messages without stack traces.
- **CORS and Rate Limiting:** `@fastify/cors` trusts a single `FRONTEND_ORIGIN`, while API-only rate limits protect the whole API with stricter limits on register, login, and uploads.
- **Accessible Fetch Frontend:** A responsive ES-module dashboard with semantic forms, labels, live regions, loading/empty states, focus styles, and `textContent` rendering.

### Project Structure

- `prisma/schema.prisma` — `User`, `Resource`, and `Attachment` models with `Role`, `ResourceType`, and `PublicationStatus` enums.
- `prisma7.config.ts` — Prisma 7 configuration with the PostgreSQL driver adapter.
- `prisma/migrations/` — Initial SQL migration and migration lock file.
- `src/config/` — Environment, upload limits, and private storage paths.
- `src/types/` — Auth types plus Fastify and JWT module augmentations.
- `src/lib/` — Password hashing, Prisma error detection, pagination, serializers, visibility rules, and media validation/storage helpers.
- `src/plugins/` — Prisma connection lifecycle, JWT authentication and roles, multipart limits, and static dashboard hosting.
- `src/schemas/` — Reusable JSON Schema fragments for auth, resources, lists, and errors.
- `src/routes/auth.ts` — Registration, login, and `/auth/me`.
- `src/routes/resources.ts` — Public catalogue, subjects, instructor studio, and resource CRUD.
- `src/routes/attachments.ts` — Private attachment upload, replacement, removal, and streaming download.
- `src/app.ts` — Plugin registration, central error handler, not-found handler, CORS, and rate limiting.
- `src/server.ts` — Server entry point and graceful shutdown.
- `public/` — "Open Shelf" dashboard served at `/app/`.
- `package.json` / `tsconfig.json` — ESM + NodeNext dependencies and scripts.

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
CREATE ROLE w6_resources_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w6_resources
OWNER w6_resources_user;

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

Edit `.env`:

```env
DATABASE_URL="postgresql://w6_resources_user:change_me@localhost:5432/w6_resources?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
FRONTEND_ORIGIN="http://127.0.0.1:3013"
UPLOAD_DIR="./var/uploads"
HOST="127.0.0.1"
PORT="3013"
```

The role/password pair above is for local study only; use a strong secret in any shared environment.

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_learning_resources
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Open the dashboard at `http://127.0.0.1:3013/app/`.

### A Note on Role-Based Visibility

Roles are self-selected at registration in this teaching project so both flows can be tried without a separate admin step. In production, role assignment must be an out-of-band administrative action.

- The public list (`GET /api/resources`) always filters `status: 'PUBLISHED'`.
- `GET /api/resources/:id` adds `OR instructorId = current user` only when the token belongs to an `INSTRUCTOR`; otherwise a draft produces `404`, exactly like a missing ID.
- The attachment download endpoint reuses the same visibility rule, so a student cannot bypass the detail rule by guessing a resource ID.
- Instructor-only writes check ownership inside the Prisma `where` clause, never in application code after fetching an arbitrary row.

### Exploring the Solution

| Step | Action | Endpoint |
|---|---|---|
| 1 | Register an instructor | `POST /api/auth/register` with `role: "INSTRUCTOR"` |
| 2 | Register a student | `POST /api/auth/register` with `role: "STUDENT"` |
| 3 | Log in and save the token | `POST /api/auth/login` |
| 4 | Create a draft | `POST /api/resources` |
| 5 | List your drafts | `GET /api/me/resources` |
| 6 | Upload an attachment | `PUT /api/resources/1/attachment` |
| 7 | Download the attachment | `GET /api/resources/1/attachment/download` |
| 8 | Publish the resource | `PATCH /api/resources/1` with `{ "status": "PUBLISHED" }` |
| 9 | Browse and filter the catalogue | `GET /api/resources?search=algebra&subject=Math&type=VIDEO&page=1&limit=9` |
| 10 | Try a draft as a student | `GET /api/resources/2` → `404` |
| 11 | Remove the attachment | `DELETE /api/resources/1/attachment` |
| 12 | Delete the resource | `DELETE /api/resources/1` → `204` |

Register an instructor:

```bash
curl -X POST http://127.0.0.1:3013/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.edu","password":"a-very-long-demo-password","role":"INSTRUCTOR"}'
```

Log in and store the token:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3013/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.edu","password":"a-very-long-demo-password"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.accessToken')
```

Create a draft:

```bash
curl -X POST http://127.0.0.1:3013/api/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Introduction to Relational Thinking","description":"A guided tour of tables, keys, and joins.","subject":"Computer Science","type":"VIDEO"}'
```

Upload and download a private attachment:

```bash
curl -X PUT http://127.0.0.1:3013/api/resources/1/attachment \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@handout.png"

curl http://127.0.0.1:3013/api/resources/1/attachment/download \
  -H "Authorization: Bearer $TOKEN" \
  -o handout.png
```

Publish, then browse as a student:

```bash
curl -X PATCH http://127.0.0.1:3013/api/resources/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PUBLISHED"}'

curl "http://127.0.0.1:3013/api/resources?search=relational&limit=9"
```

### Workshop Objective

This solution shows how REST design decisions work together: roles and token-derived ownership protect writes, a shared visibility fragment protects reads, validation and envelopes make the API predictable for any client, and private media storage keeps untrusted files out of the public web root. The Open Shelf dashboard demonstrates that a frontend can stay simple when the API contract is explicit.
