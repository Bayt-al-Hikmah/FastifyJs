# Role-Based Access Control (Workshop 4 Solution)

This solution implements **Task 2 of Workshop 4**. It extends the Task Management API with Role-Based Access Control (RBAC), introducing a third role: `MANAGER`.

It establishes a three-tier permission model in which managers can oversee tasks across the organization without receiving the destructive system administration permissions reserved for administrators.

### What This Solution Demonstrates

- **Three-Tier Role Model:** Extends the Prisma `Role` enum to support `USER`, `MANAGER`, and `ADMIN`.
- **Permission Matrix Enforcement:**
  - `USER`: Can create, view, update, and delete their own tasks.
  - `MANAGER`: Can create, update, and delete their own tasks and view all organization tasks (`GET /api/tasks`). Cannot manage users.
  - `ADMIN`: Has full access to create, view, update, and delete any task. Has exclusive access to administrative user management (`GET /api/admin/users`).
- **Parameterized Authorization Hook:** Implements a reusable Fastify pre-handler decorator that accepts allowed roles, such as `fastify.authorize('ADMIN')` or `fastify.authorize('MANAGER', 'ADMIN')`.
- **Database Migrations for Enums:** Demonstrates how to modify PostgreSQL enums and apply schema changes using Prisma Migrate.
- **Resource Ownership Scoping:** Dynamically filters task queries using `createdById` for regular users while granting global task visibility to managers and administrators.

### Project Structure

- `prisma/schema.prisma` — Defines the `Role` enum (`USER`, `MANAGER`, `ADMIN`), `User`, and `Task` models.
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

Follow these steps in order to configure the project, prepare the database, and start the application.

#### Install Dependencies

Open a terminal in the project root directory and install the required dependencies:

```bash
npm install
```

#### Create the Database and Database User

PostgreSQL provides a default administrative account named `postgres`.

Switch to this account and open the PostgreSQL interactive terminal:

```bash
sudo -u postgres psql
```

You should now see a PostgreSQL prompt similar to:

```text
postgres=#
```

Create a dedicated database user:

```sql
CREATE ROLE w4_task2_rbac_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;
```

Create the database and assign ownership to the new user:

```sql
CREATE DATABASE w4_task2_rbac
OWNER w4_task2_rbac_user;
```

Exit PostgreSQL:

```sql
\q
```

You have now created a dedicated database and user for the application.

#### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a secure secret for JWT signing:

```bash
openssl rand -base64 32
```

Copy the generated secret and open the `.env` file:

```bash
nano .env
```

Configure the following environment variables:

```env
DATABASE_URL="postgresql://w4_task2_rbac_user:change_me@localhost:5432/w4_task2_rbac?schema=public"

JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
```

Replace `change_me` with the PostgreSQL password you created and `YOUR_GENERATED_SECRET_HERE` with the generated JWT secret.

Save the file and exit the editor.

#### Run Database Migrations

Now that PostgreSQL is running and the environment variables are configured, initialize the database


```bash
npx prisma migrate dev --name add_manager_role
```

This command applies the Prisma schema changes to PostgreSQL and creates a migration named `add_manager_role`.

Generate Prisma Client:

```bash
npx prisma generate
```

Your database schema and Prisma Client are now ready.

#### Start the Development Server

Start the Fastify development server:

```bash
npm run dev
```

The API should now be available at:

```text
http://127.0.0.1:3000
```

Keep this terminal running while testing the API. Open another terminal for the following steps.

---

### Exploring the Solution

We will simulate an organization with three users:

- **Regular User:** Has access only to their own tasks.
    
- **Manager:** Can oversee all organization tasks but cannot manage users.
    
- **Administrator:** Has full task permissions and access to user management.
    

#### Register Three Users

First, we need to create three user accounts.

Open a terminal and register a regular user:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Regular User", "email": "user@example.com", "password": "Password123"}'
```

Register a manager:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Team Manager", "email": "manager@example.com", "password": "Password123"}'
```

Register an administrator:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "System Admin", "email": "admin@example.com", "password": "Password123"}'
```

All three accounts are initially registered with the default `USER` role.

#### Assign Roles in PostgreSQL

We now need to promote the manager and administrator accounts to their respective roles.

Open a new terminal and connect to the application database:

```bash
psql -h localhost -U w4_task2_rbac_user -d w4_task2_rbac
```

Enter the PostgreSQL password when prompted.

You should now be connected to the application database.

**Important:** The following SQL assumes Prisma uses its default table and column names, without custom mappings.

First, verify that the three accounts exist:

```sql
SELECT id, name, email, role
FROM "User"
ORDER BY id;
```

Promote the manager:

```sql
UPDATE "User"
SET role = 'MANAGER'
WHERE email = 'manager@example.com';
```

Promote the administrator:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'admin@example.com';
```

Verify that the roles were updated correctly:

```sql
SELECT id, name, email, role
FROM "User"
ORDER BY id;
```

The expected result should look similar to:

```text
 id |     name      |         email          |   role
----+---------------+------------------------+---------
  1 | Regular User  | user@example.com       | USER
  2 | Team Manager  | manager@example.com    | MANAGER
  3 | System Admin  | admin@example.com      | ADMIN
```

The IDs are examples; your actual IDs may differ.

Exit PostgreSQL:

```sql
\q
```

#### Log In and Obtain Authentication Tokens

Before testing the permissions, each user must authenticate and obtain a JWT access token.

Log in as the regular user:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password123"}'
```

Log in as the manager:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@example.com", "password": "Password123"}'
```

Log in as the administrator:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Password123"}'
```

Each request should return an authentication token.

Copy the returned tokens and store them in your terminal:

```bash
export USER_TOKEN="USER_JWT_TOKEN"
export MANAGER_TOKEN="MANAGER_JWT_TOKEN"
export ADMIN_TOKEN="ADMIN_JWT_TOKEN"
```

Replace each placeholder with its corresponding token.

These environment variables allow us to reuse the tokens in subsequent HTTP requests.

#### Create Tasks to Test Resource Visibility

To demonstrate the difference between regular users, managers, and administrators, we first need tasks created by different users.

**A. Create a Task as the Regular User**

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "User Private Task", "description": "This task belongs to the regular user"}'
```

**B. Create a Task as the Manager**

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Manager Task", "description": "This task belongs to the manager"}'
```

**C. Create a Task as the Administrator**

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Admin Task", "description": "This task belongs to the administrator"}'
```

We now have three tasks created by three different users.

Keep their returned IDs if you want to perform additional tests.

#### Test Task Visibility

All three users will now request the task list using the same endpoint:

`GET /api/tasks`

However, the results will depend on their roles.

**A. Regular User**

```bash
curl -X GET http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $USER_TOKEN"
```

Expected behavior:

The regular user receives only tasks they created.

In our example, this includes:

```json
[
  {
    "title": "User Private Task"
  }
]
```

**B. Manager**

```bash
curl -X GET http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

Expected behavior:

The manager receives all organization tasks, including tasks created by other users.

This includes:

- User Private Task
    
- Manager Task
    
- Admin Task
    

**C. Administrator**

```bash
curl -X GET http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected behavior:

The administrator also receives all organization tasks.

This demonstrates how the API dynamically scopes database queries according to the authenticated user's role.

#### Test Administrative User Management

Now we will test the administrative endpoint:

`GET /api/admin/users`

This endpoint is restricted to administrators.

**A. Access as a Regular User**

```bash
curl -X GET http://127.0.0.1:3000/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN"
```

Expected result:

```text
403 Forbidden
```

The regular user does not have permission to access the user directory.

**B. Access as a Manager**

```bash
curl -X GET http://127.0.0.1:3000/api/admin/users \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

Expected result:

```text
403 Forbidden
```

Although managers can oversee organization-wide tasks, they cannot manage or access the administrative user directory.

**C. Access as an Administrator**

```bash
curl -X GET http://127.0.0.1:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected result:

```text
200 OK
```

The administrator receives the list of registered users.

This confirms that administrative user management is restricted to the `ADMIN` role.

---

### Permission Matrix

The following table summarizes the permissions implemented in this solution.

|Operation|USER|MANAGER|ADMIN|
|---|---|---|---|
|Create own tasks|Yes|Yes|Yes|
|View own tasks|Yes|Yes|Yes|
|View all tasks|No|Yes|Yes|
|Update own tasks|Yes|Yes|Yes|
|Update any task|No|No|Yes|
|Delete own tasks|Yes|Yes|Yes|
|Delete any task|No|No|Yes|
|Access user directory|No|No|Yes|

### Workshop Objective

By completing this task, you have learned how to implement multi-tier Role-Based Access Control (RBAC), extend PostgreSQL enums through Prisma migrations, differentiate between resource visibility and operational authority, and enforce authorization using reusable Fastify pre-handlers.

You have also learned how to apply role-based database filtering and protect administrative endpoints from unauthorized access.