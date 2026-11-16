# Role-Based Access Control (Workshop 4 Solution)

This solution implements **Task 2** of Workshop 4. It extends the Task Management API with Role-Based Access Control (RBAC), introducing a third tier: the `MANAGER` role. It models role hierarchies where managers can oversee tasks across the organization without granting them destructive system administration permissions.

### What This Solution Demonstrates

- **Three-Tier Role Model:** Extends the Prisma `Role` enum to support `USER`, `MANAGER`, and `ADMIN`.
- **Permission Matrix Enforcement:**
  - `USER`: Create, view, update, and delete own tasks.
  - `MANAGER`: Create, update, delete own tasks; view all organization tasks (`GET /api/tasks`); cannot manage users.
  - `ADMIN`: Full access to create, view, update, and delete any task; exclusive access to administrative user management (`GET /api/admin/users`).
- **Parameterized `authorize` Hook:** Fastify pre-handler decorator accepting allowed roles: `fastify.authorize('ADMIN')` or `fastify.authorize('MANAGER', 'ADMIN')`.
- **Database Migrations for Enums:** Illustrates PostgreSQL enum alterations and migrations via Prisma Migrate.
- **Resource Ownership Scoping:** Queries dynamically filter by `createdById` for standard users while granting global visibility to managers and administrators.

### Project Structure

- `prisma/schema.prisma` — Schema with `Role` enum (`USER`, `MANAGER`, `ADMIN`), `User`, and `Task` models.
- `prisma7.config.ts` — Prisma configuration with PostgreSQL driver adapter.
- `src/lib/password.ts` — Argon2id password hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/plugins/auth.ts` — JWT authentication, `currentUser` decoration, and role-based `authorize(...)` hook.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle management.
- `src/routes/auth.ts` — User registration and login routes.
- `src/routes/users.ts` — `/api/users/me` profile management.
- `src/routes/tasks.ts` — Role-aware task management and `/api/admin/users` user directory.
- `src/app.ts` — Application composition and global hooks.
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
CREATE ROLE w4_task2_rbac_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w4_task2_rbac
OWNER w4_task2_rbac_user;

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
DATABASE_URL="postgresql://w4_task2_rbac_user:change_me@localhost:5432/w4_task2_rbac?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name add_manager_role
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

### Exploring the Solution

**1. Register Three Users**

Create a normal user, a manager, and an administrator:

```bash
# Register User
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Regular User", "email": "user@example.com", "password": "Password123"}'

# Register Manager
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Team Manager", "email": "manager@example.com", "password": "Password123"}'

# Register Admin
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "System Admin", "email": "admin@example.com", "password": "Password123"}'
```

**2. Assign Roles in PostgreSQL**

In `psql`, elevate the manager and admin users:

```bash
psql -U w4_task2_rbac_user -d w4_task2_rbac -h localhost
```

```sql
UPDATE users SET role = 'MANAGER' WHERE email = 'manager@example.com';
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
\q
```

**3. Log In and Test Access**

Log in with each account to obtain JWT tokens.

- **Viewing all tasks (`GET /api/tasks`):**
  - Standard user receives only tasks they created.
  - Manager receives all tasks across the company.
  - Admin receives all tasks across the company.
- **Accessing User Directory (`GET /api/admin/users`):**
  - Standard user: receives `403 Forbidden`.
  - Manager: receives `403 Forbidden`.
  - Admin: receives `200 OK` with the list of registered users.

### Workshop Objective

By completing this task, you have learned how to structure multi-tier role-based access control (RBAC), alter database enums via Prisma migrations, differentiate between resource visibility and operational authority, and enforce authorization using reusable Fastify pre-handlers.
