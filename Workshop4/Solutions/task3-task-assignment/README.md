# Task Assignment System (Workshop 4 Solution)

This solution implements **Task 3 of Workshop 4**. It extends the Task Management API with task delegation and assignment capabilities.

It introduces a dedicated endpoint (`PATCH /api/tasks/:id/assign`), separates the **creator** of a task (`createdById`) from its **responsible assignee** (`assigneeId`), and establishes granular, relationship-based authorization rules.

### What This Solution Demonstrates

- **Separation of Creator and Assignee:** Distinguishes between the user who created a task and the user responsible for completing it.
- **Dedicated Assignment Endpoint (`PATCH /api/tasks/:id/assign`):** Restricts task assignment to managers and administrators using `fastify.authorize('MANAGER', 'ADMIN')`.
- **Target User Verification:** Ensures that the requested `assigneeId` belongs to an existing user before updating the task.
- **Immutable Provenance:** Assigning a task never changes its original `createdById`.
- **Granular Relationship-Based Authorization:**
  - **Visibility:** Regular users can see tasks they created OR tasks assigned to them (`createdById: user.id OR assigneeId: user.id`).
  - **Partial Editing Permissions:** Assignees who did not create a task can only update its status (`TODO`, `IN_PROGRESS`, or `DONE`). Attempts to modify the title or description are rejected.
  - **Deletion Restrictions:** Assignees cannot delete assigned tasks unless they are also the creator or an administrator.
  - **Managers and Administrators:** Can view all tasks and assign or reassign tasks across users.

### Project Structure

- `prisma/schema.prisma` — Defines the `User` and `Task` models, including the dual relationships `createdTasks` and `assignedTasks`.
- `prisma7.config.ts` — Prisma 7 configuration.
- `src/lib/password.ts` — Argon2id password utilities.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/plugins/auth.ts` — JWT authentication, user identity decorator, and role-based authorization hook.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle plugin.
- `src/routes/auth.ts` — Authentication routes (`/api/auth/register`, `/api/auth/login`).
- `src/routes/users.ts` — Profile management (`/api/users/me`).
- `src/routes/tasks.ts` — Task CRUD operations, task assignment (`PATCH /api/tasks/:id/assign`), and `/api/admin/users`.
- `src/app.ts` — Fastify application factory and lifecycle hooks.
- `src/server.ts` — Server entry point.
- `.env.example` — Environment configuration template.
- `package.json` — Dependencies and scripts.



### Getting Started

Follow these steps in order to configure the project, prepare the database, and start the application.

#### Install Dependencies

Open a terminal in the project root directory and install the required dependencies:

```bash
npm install
```

#### Create the Database and Database User

PostgreSQL provides a default administrative user named `postgres`.

First, switch to the PostgreSQL administrative account and open its interactive SQL terminal:

```bash
sudo -u postgres psql
```

You should now be inside the PostgreSQL terminal. The prompt will look similar to:

```text
postgres=#
```

Create a dedicated database user:

```sql
CREATE ROLE w4_task3_task_assignment_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;
```

Create the database and assign ownership to the new user:

```sql
CREATE DATABASE w4_task3_task_assignment
OWNER w4_task3_task_assignment_user;
```

Exit the PostgreSQL terminal:

```sql
\q
```

You have now created a database and a dedicated user that your application will use to connect to it.

#### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a secure secret for JWT signing:

```bash
openssl rand -base64 32
```

Copy the generated value and open `.env`:

```bash
nano .env
```

Configure the environment variables:

```env
DATABASE_URL="postgresql://w4_task3_task_assignment_user:change_me@localhost:5432/w4_task3_task_assignment?schema=public"

JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
```

Replace `change_me` with the actual PostgreSQL password and `YOUR_GENERATED_SECRET_HERE` with the secret you generated.

Save the file and exit the editor.

#### Run Database Migrations

Now that PostgreSQL is running and the environment variables are configured, initialize the database schema using Prisma.

Run:

```bash
npx prisma migrate dev --name init_task_assignment
```

This command creates the database tables based on your Prisma schema and records the migration.

Generate Prisma Client:

```bash
npx prisma generate
```

Your database is now ready.

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


### Exploring the Solution

We will simulate a real task delegation workflow involving three users:

- **Alice:** Creates a task.
- **Bob:** Receives and completes the assigned task.
- **Carol:** Acts as the manager responsible for assigning tasks.

#### Register the Users

We first need to create three user accounts.

Open a terminal and register Alice:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Creator", "email": "alice@example.com", "password": "Password123"}'
```

Register Bob:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Assignee", "email": "bob@example.com", "password": "Password123"}'
```

Register Carol:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Carol Manager", "email": "carol@example.com", "password": "Password123"}'
```

All three accounts are initially created with the default `USER` role.

#### Promote Carol to Manager

We need to change Carol's role from `USER` to `MANAGER`.

First, connect to the application database using the credentials configured in `.env`:

```bash
psql -h localhost -U w4_task3_task_assignment_user -d w4_task3_task_assignment
```

Enter the PostgreSQL password when prompted.

You should now be connected to the application database.

**Important:** The following SQL assumes that Prisma uses its default table and column names, without custom mappings.

Find Carol's record:

```sql
SELECT * FROM "User" WHERE email = 'carol@example.com';
```

Update her role:

```sql
UPDATE "User"
SET role = 'MANAGER'
WHERE email = 'carol@example.com';
```

Verify the change:

```sql
SELECT id, name, email, role
FROM "User"
WHERE email = 'carol@example.com';
```

Exit PostgreSQL:

```sql
\q
```

Carol can now access endpoints restricted to managers.

#### 3. Log In and Obtain Authentication Tokens

Before making authenticated requests, each user must log in and obtain a JWT access token.

Log in as Alice:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123"}'
```

Log in as Bob:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "Password123"}'
```

Log in as Carol:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "carol@example.com", "password": "Password123"}'
```

Each request should return an authentication token.

Copy the returned tokens and store them in your terminal:

```bash
export ALICE_TOKEN="ALICE_JWT_TOKEN"
export BOB_TOKEN="BOB_JWT_TOKEN"
export CAROL_TOKEN="CAROL_JWT_TOKEN"
```

Replace each placeholder with the corresponding token returned by the API.

These environment variables allow us to reuse the tokens without manually copying them into every request.

#### Retrieve User IDs

Before creating and assigning tasks, we need to know the IDs of Alice and Bob.

Reconnect to PostgreSQL:

```bash
psql -h localhost -U w4_task3_task_assignment_user -d w4_task3_task_assignment
```

Retrieve their records:

```sql
SELECT id, name, email, role
FROM "User"
ORDER BY id;
```

Identify Alice's and Bob's IDs.

For this example, we will assume:

- Alice has ID `1`.
- Bob has ID `2`.

**Note:** These IDs are examples. Your actual IDs may differ depending on the database records.

Exit PostgreSQL:

```sql
\q
```

#### Create a Task as Alice

Alice will create a new task that will later be assigned to Bob.

Send the following request:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Draft Technical Documentation", "description": "Write API docs for the assignment system"}'
```

The API should return the newly created task.

Its important fields will look similar to:

```json
{
  "id": 1,
  "title": "Draft Technical Documentation",
  "description": "Write API docs for the assignment system",
  "status": "TODO",
  "createdById": 1,
  "assigneeId": null
}
```

Notice the following:

- `createdById` contains Alice's ID because she created the task.
- `assigneeId` is `null` because nobody has been assigned yet.

Keep the returned task ID. We will use it in the next step.

#### Assign the Task to Bob as Manager Carol

Carol is responsible for delegating the task.

First, use Carol's authentication token to send an assignment request.

Assuming the task ID is `1` and Bob's user ID is `2`:

```bash
curl -X PATCH http://127.0.0.1:3000/api/tasks/1/assign \
  -H "Authorization: Bearer $CAROL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": 2}'
```

The expected response is:

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

This demonstrates the separation between task ownership and task responsibility.

Alice remains the original creator, while Bob becomes the person responsible for completing the task.

#### Verify Assignee Permissions as Bob

Now we will test the permissions assigned to Bob.

**A. View the Assigned Task**

Send:

```bash
curl -X GET http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $BOB_TOKEN"
```

Bob should be able to see task `1` because he is its assignee, even though Alice originally created it.

**B. Update the Task Status**

Bob is allowed to update the status of tasks assigned to him.

Send:

```bash
curl -X PATCH http://127.0.0.1:3000/api/tasks/1 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

The request should succeed.

**C. Attempt to Modify the Task Title**

Bob should not be allowed to modify the task's title because he is not its creator.

Try:

```bash
curl -X PATCH http://127.0.0.1:3000/api/tasks/1 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hacked Title"}'
```

Expected result:

```json
{
  "message": "Assignees may only update the task status"
}
```

The API should return `403 Forbidden`.

**D. Attempt to Delete the Task**

Bob is also not allowed to delete a task that was created by someone else.

Try:

```bash
curl -X DELETE http://127.0.0.1:3000/api/tasks/1 \
  -H "Authorization: Bearer $BOB_TOKEN"
```

Expected result: `403 Forbidden`.

This confirms that being responsible for completing a task does not automatically grant ownership or full control over it.


### Workshop Objective

By completing this task, you have learned how to implement resource delegation, maintain immutable audit provenance (`createdById`) alongside mutable assignment (`assigneeId`), and enforce multi-dimensional authorization rules based on user roles and resource ownership.

You have also practiced implementing dedicated API endpoints, validating database relationships, managing JWT authentication, and testing access-control rules through HTTP requests.