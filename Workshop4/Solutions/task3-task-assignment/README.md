# Task Assignment System (Workshop 4 Solution)

This solution implements **Task 3** of Workshop 4. It extends the Task Management API with task delegation and assignment capabilities. It introduces a dedicated endpoint (`PATCH /api/tasks/:id/assign`), separates the **creator** of a task (`createdById`) from its **responsible assignee** (`assigneeId`), and establishes granular, relationship-based authorization rules.

### What This Solution Demonstrates

- **Separation of Creator and Assignee:** Distinguishes between the user who authored the task and the user assigned to complete it.
- **Dedicated Assignment Endpoint (`PATCH /api/tasks/:id/assign`):** Restricted to managers and administrators (`fastify.authorize('MANAGER', 'ADMIN')`).
- **Target User Verification:** Ensures the requested `assigneeId` corresponds to an existing user in the database before updating the record.
- **Immutable Provenance:** Assigning a task never modifies its original `createdById` creator.
- **Granular Relationship-Based Authorization:**
  - **Visibility:** Regular users see tasks they authored OR tasks assigned to them (`{ createdById: user.id } OR { assigneeId: user.id }`).
  - **Partial Editing Permissions:** Assignees who did not create the task are restricted to updating its `status` (`TODO`, `IN_PROGRESS`, `DONE`); attempts to edit the `title` or `description` are rejected.
  - **Deletion Restrictions:** Assignees cannot delete assigned tasks unless they are also the creator or an administrator.
  - **Managers & Administrators:** Can view all tasks and reassign tasks across users.

### Project Structure

- `prisma/schema.prisma` — Schema with `User` and `Task` models, defining dual relationships: `createdTasks` and `assignedTasks`.
- `prisma7.config.ts` — Prisma 7 configuration file.
- `src/lib/password.ts` — Argon2id password utilities.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/plugins/auth.ts` — JWT authentication, user identity decorator, and role-based authorization hook.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle plugin.
- `src/routes/auth.ts` — Authentication routes (`/api/auth/register`, `/api/auth/login`).
- `src/routes/users.ts` — Profile management (`/api/users/me`).
- `src/routes/tasks.ts` — Task CRUD, assignment route (`PATCH /api/tasks/:id/assign`), and `/api/admin/users`.
- `src/app.ts` — Fastify application factory and lifecycle hooks.
- `src/server.ts` — Server entry point.
- `.env.example` — Configuration template.
- `package.json` — Dependencies and scripts.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database and Role**

```bash
sudo -i -u postgres
psql
```

Create a dedicated role and database:

```sql
CREATE ROLE w4_task3_task_assignment_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w4_task3_task_assignment
OWNER w4_task3_task_assignment_user;

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
DATABASE_URL="postgresql://w4_task3_task_assignment_user:change_me@localhost:5432/w4_task3_task_assignment?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_task_assignment
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

### Exploring the Solution

**1. Register Users and Elevate Manager**

Register two regular users (e.g. Alice and Bob) and one manager (Carol):

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Creator", "email": "alice@example.com", "password": "Password123"}'

curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Assignee", "email": "bob@example.com", "password": "Password123"}'

curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Carol Manager", "email": "carol@example.com", "password": "Password123"}'
```

Elevate Carol in `psql`:

```sql
UPDATE users SET role = 'MANAGER' WHERE email = 'carol@example.com';
```

**2. Create a Task as Alice**

Log in as Alice to obtain `ALICE_TOKEN`, then create a task:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Draft Technical Documentation", "description": "Write API docs for the assignment system"}'
```

The returned task has `createdById: 1` and `assigneeId: null`.

**3. Assign Task to Bob as Manager Carol**

Log in as Carol to obtain `CAROL_TOKEN`. Assign task ID 1 to Bob (user ID 2):

```bash
curl -X PATCH http://127.0.0.1:3000/api/tasks/1/assign \
  -H "Authorization: Bearer $CAROL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": 2}'
```

Response:
```json
{
  "message": "Task assigned successfully",
  "task": {
    "id": 1,
    "title": "Draft Technical Documentation",
    "description": "Write API docs for the assignment system",
    "status": "TODO",
    "createdById": 1,
    "assigneeId": 2
  }
}
```

Notice that `createdById` remains `1`, while `assigneeId` is now `2`.

**4. Verify Assignee Permissions as Bob**

Log in as Bob (`BOB_TOKEN`):

- **View Assigned Task:** `GET /api/tasks` returns task 1 because Bob is the assignee.
- **Update Status:** `PATCH /api/tasks/1` with `{"status": "IN_PROGRESS"}` succeeds.
- **Prohibited Title Modification:** `PATCH /api/tasks/1` with `{"title": "Hacked Title"}` returns `403 Forbidden` with `"Assignees may only update the task status"`.
- **Prohibited Deletion:** `DELETE /api/tasks/1` returns `403 Forbidden`.

### Workshop Objective

By completing this task, you have learned how to implement resource delegation, maintain immutable audit provenance (`createdById`) alongside mutable assignment (`assigneeId`), and enforce multi-dimensional authorization rules based on user roles and resource ownership.
