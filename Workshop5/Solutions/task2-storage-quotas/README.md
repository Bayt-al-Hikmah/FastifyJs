# User Storage Quotas (Workshop 5 Solution)

This solution implements **Task 2** of Workshop 5. It enforces **per-user storage quotas** and **task-level attachment constraints** within the Task Management API. It sets a strict 100 MB total storage ceiling per user, limits individual files to 10 MB, and caps any single task at a maximum of 10 attachments. The solution calculates real-time storage usage via database aggregations, prevents concurrent uploads from exceeding quotas, updates accounted storage upon file deletion, and provides a dedicated quota inspection endpoint (`GET /api/users/me/storage-quota`).

### What This Solution Demonstrates

- **Per-User Storage Quota (100 MB):** Aggregates the total byte size of stored attachments owned by the authenticated user (`_sum.size`) and rejects uploads that would breach the 100 MB ceiling.
- **Task Attachment Limit (10 Files):** Checks existing attachments on the target task (`count`) and prevents users from exceeding 10 attachments per task.
- **Pre-Stream & Streaming Size Guardrails:** Checks existing usage before streaming starts, and tracks cumulative bytes during multi-file streaming to abort immediately if quota is breached mid-upload.
- **Storage Reclaiming on Deletion:** When an attachment is deleted via `DELETE /api/attachments/:id`, its physical file is unlinked and the database record is removed, immediately freeing up the user's storage quota.
- **Quota Diagnostic Endpoint (`GET /api/users/me/storage-quota`):** Returns the caller's used bytes, quota limit, remaining storage, and total attachment count.
- **Interactive Quota Meter:** An interactive web dashboard at `/app/` featuring a real-time storage meter displaying percentage consumed and available headroom.

### Project Structure

- `prisma/schema.prisma` — Schema with `User`, `Task`, and `Attachment` models.
- `prisma7.config.ts` — Prisma configuration file with driver adapter support.
- `src/config/uploads.ts` — Quota limits (`USER_STORAGE_QUOTA_BYTES = 100 MB`, `MAX_ATTACHMENT_SIZE = 10 MB`, `MAX_ATTACHMENTS_PER_TASK = 10`).
- `src/lib/attachment-validation.ts` — File extension rules, MIME verification, and magic byte checking.
- `src/lib/storage-files.ts` — Private filesystem operations and stream piping.
- `src/lib/password.ts` — Argon2id password hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/plugins/auth.ts` — JWT authentication and role checks.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle management.
- `src/plugins/static.ts` — Serves the dashboard frontend from `public/`.
- `src/routes/attachments.ts` — Quota-aware multi-upload, listing, download, deletion, and `GET /users/me/storage-quota`.
- `src/routes/tasks.ts` — Task CRUD routes.
- `src/routes/auth.ts` — Authentication routes (`/register`, `/login`).
- `src/routes/users.ts` — Profile management routes (`/me`).
- `public/` — Interactive web application (HTML, CSS, JS) mounted at `/app/`.
- `package.json` — Dependencies and scripts.

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
CREATE ROLE w5_task2_storage_quotas_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task2_storage_quotas
OWNER w5_task2_storage_quotas_user;

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
DATABASE_URL="postgresql://w5_task2_storage_quotas_user:change_me@localhost:5432/w5_task2_storage_quotas?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
UPLOAD_DIR="./var/uploads"
HOST="127.0.0.1"
PORT="3000"
USER_STORAGE_QUOTA_MB="100"
MAX_ATTACHMENT_SIZE_MB="10"
MAX_ATTACHMENTS_PER_TASK="10"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_quotas
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Visit the dashboard in your browser: `http://127.0.0.1:3000/app/`.

### Workshop Objective

By completing this task, you have learned how to enforce multi-tiered resource quotas (per-file, per-task, and per-user), perform efficient database aggregations to compute live storage footprints, and ensure that disk deletions correctly restore account capacity.
