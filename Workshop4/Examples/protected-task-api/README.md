# Protected Task API (Workshop 4 Example)

This example is the **complete authenticated task API** for Workshop 4. It combines registration, login, JWTs, Argon2id password hashing, Prisma-backed users, ownership checks, role-based access control, input and output schemas, rate limiting, and a set of Fastify lifecycle hooks.

The API is intentionally JSON-only. It is the reference architecture for the Workshop 4 solutions: a regular `USER` can manage their own tasks, while an `ADMIN` can see every task and list users.

### What You'll Learn

- **Authentication plugin:** Register `@fastify/jwt`, decorate `authenticate`, and expose `authorize(...roles)`.
- **Bearer tokens:** Protect routes with `preHandler` and reject missing or invalid tokens with `401`.
- **Database-backed identity:** Resolve `sub` from the token to a fresh user row on every request.
- **Ownership:** Derive `createdById` from `request.currentUser`, never from the request body.
- **Scoped queries:** Combine `id` and `createdById` in one query so another user's task looks like `404`.
- **RBAC:** Let `ADMIN` bypass ownership checks and access `/api/admin/users`.
- **Task CRUD:** List with pagination, create, read, update, and delete tasks.
- **Status enum:** Restrict task state to `TODO`, `IN_PROGRESS`, or `DONE`.
- **Safe response schemas:** Strip password hashes and unknown fields from outgoing JSON.
- **Rate limits:** Throttle registration and login without throttling the whole API.
- **Lifecycle logging:** Observe requests with `onRequest`, `onSend`, `onResponse`, `onReady`, and `onClose`.

### Project Structure

```text
protected-task-api/
├── prisma/
│   └── schema.prisma            # User, Task, Role, TaskStatus
├── src/
│   ├── lib/
│   │   ├── password.ts          # Argon2id helpers
│   │   └── prisma-errors.ts     # P2002 detection
│   ├── plugins/
│   │   ├── auth.ts              # JWT + authenticate + authorize
│   │   └── prisma.ts
│   ├── routes/
│   │   ├── auth.ts              # register, login
│   │   ├── users.ts             # /me
│   │   └── tasks.ts             # task CRUD + admin users
│   ├── types/
│   │   ├── auth.ts
│   │   ├── fastify.d.ts
│   │   └── fastify-jwt.d.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
├── prisma7.config.ts
└── tsconfig.json
```

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on `localhost:5432`.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database**

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE w4_protected_task_api_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w4_protected_task_api
OWNER w4_protected_task_api_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
openssl rand -base64 32
```

```env
DATABASE_URL="postgresql://w4_protected_task_api_user:change_me@localhost:5432/w4_protected_task_api?schema=public"
JWT_SECRET="paste-the-generated-value-here"
```

**4. Create the Tables and Generate Prisma Client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Start the API**

```bash
npm run dev
```

### Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public, 3/hour | Create an account |
| `POST` | `/api/auth/login` | Public, 5/minute | Get a 15-minute bearer token |
| `GET` | `/api/users/me` | Authenticated | Current user |
| `GET` | `/api/tasks?page=1&limit=20` | Authenticated | Own tasks (`ADMIN`: all tasks) |
| `POST` | `/api/tasks` | Authenticated | Create a task owned by the caller |
| `GET` | `/api/tasks/:id` | Owner or `ADMIN` | Read one task |
| `PATCH` | `/api/tasks/:id` | Owner or `ADMIN` | Update title, description, or status |
| `DELETE` | `/api/tasks/:id` | Owner or `ADMIN` | Delete a task |
| `GET` | `/api/admin/users` | `ADMIN` | List users without password hashes |

### Trying It with curl

Register and log in:

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/register \
    -H 'content-type: application/json' \
    -d '{
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "correct-horse-battery-staple"
    }'

TOKEN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'content-type: application/json' \
    -d '{
        "email": "ada@example.com",
        "password": "correct-horse-battery-staple"
    }' | jq -r '.accessToken')
```

Create and list tasks:

```bash
curl -i -X POST http://127.0.0.1:3000/api/tasks \
    -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' \
    -d '{
        "title": "Write the authentication notes",
        "description": "Cover hashing, tokens, and ownership."
    }'

curl -s http://127.0.0.1:3000/api/tasks?page=1\&limit=10 \
    -H "authorization: Bearer $TOKEN"
```

Update and delete:

```bash
curl -i -X PATCH http://127.0.0.1:3000/api/tasks/1 \
    -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' \
    -d '{"status":"IN_PROGRESS"}'

curl -i -X DELETE http://127.0.0.1:3000/api/tasks/1 \
    -H "authorization: Bearer $TOKEN"
```

Failure paths:

```bash
# No token → 401
curl -i http://127.0.0.1:3000/api/tasks

# Another user's task → 404, not 403, so existence is not confirmed
curl -i http://127.0.0.1:3000/api/tasks/999 \
    -H "authorization: Bearer $TOKEN"

# Non-admin calling the admin route → 403
curl -i http://127.0.0.1:3000/api/admin/users \
    -H "authorization: Bearer $TOKEN"
```

### Exploring the Example

| Try this | What to notice |
|---|---|
| Create a task | `createdById` comes from the token and cannot be overridden by the body. |
| List tasks | A `USER` sees only rows they created; pagination defaults to page 1 and 20 rows. |
| Fetch another user's task | The scoped query returns no row, so the API responds `404`. |
| Update a task | Only `title`, `description`, and `status` are accepted. |
| Send an empty PATCH body | `minProperties: 1` rejects it with `400`. |
| Delete a task | The response is `204 No Content`. |
| Promote a user to `ADMIN` | Use Prisma Studio to change the role, then log in again. |
| Call `/api/admin/users` as admin | The list excludes password hashes. |
| Reuse an old token after a role change | The role is read from the database on each request. |
| Exceed the login limit | The route returns `429` for the rest of the minute. |

### Permission Model

```text
USER
  ├─ list/get/update/delete only tasks they created
  └─ cannot list users

ADMIN
  ├─ list/get/update/delete every task
  └─ list all users

Ownership is always taken from request.currentUser.
The client never supplies createdById.
```

### Workshop Objective

By the end of this example, you should be able to protect a JSON API with JWTs, load a trustworthy identity from the database, enforce ownership inside Prisma queries, add role checks only where they belong, and keep sensitive fields out of responses.
