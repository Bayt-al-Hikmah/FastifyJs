# Task Attachments (Workshop 5 Example)

This example demonstrates **secure file attachments** in a Fastify backend using PostgreSQL and Prisma. It implements the primary application built throughout the Workshop 5 lecture: users authenticate with JWT, create tasks, and attach documents or images (`POST /api/tasks/:id/attachments`). Uploads are processed as Node.js streams via `@fastify/multipart`, validated against real binary signatures (magic bytes) using `file-type`, stored privately under server-controlled UUIDs in `var/uploads/`, and delivered to authorized users through an authenticated streaming download endpoint with strict security headers.

### What You'll Learn

- **Multipart Stream Handling:** Receive single-file multipart payloads using `request.file()` without loading entire files into memory.
- **Binary Signature Inspection:** Inspect the initial bytes of uploaded content using `file-type` to detect disguised file extensions and verify authentic MIME types.
- **Server-Controlled Storage Keys:** Generate random UUID keys for stored files so client-supplied filenames never determine filesystem paths or cause path traversal vulnerabilities.
- **Compensating Cleanup:** Employ `try/finally` blocks to unlink staged files if validation, disk streaming, or Prisma database operations fail.
- **Authenticated Streaming Downloads (`GET /api/attachments/:id`):** Verify resource permissions before streaming private files from disk with `Content-Disposition`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`.
- **Relational Metadata Modeling:** Store attachment records in PostgreSQL linked to `Task` and `User` models with cascading constraints in Prisma.
- **Interactive Web Dashboard:** A responsive web interface at `/app/` providing registration, login, task management, drag-and-drop file upload, and secure download/deletion.

### Project Structure

- `prisma/schema.prisma` — Schema with `User`, `Role`, `Task`, and `Attachment` models.
- `prisma7.config.ts` — Prisma configuration file with driver adapter support.
- `src/lib/attachment-validation.ts` — MIME verification, extension policy, and magic byte checking.
- `src/lib/storage-files.ts` — Filesystem utilities (staging directories, atomic moves, unlinking).
- `src/lib/password.ts` — Argon2id password hashing and constant-time verification.
- `src/lib/prisma-errors.ts` — Prisma error handling helper.
- `src/config/uploads.ts` — Upload size limits (10 MB), allowed MIME types, and storage paths.
- `src/plugins/auth.ts` — JWT authentication, user identity decoration, and role checks.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle management.
- `src/plugins/static.ts` — Serves static dashboard assets.
- `src/plugins/views.ts` — Handlebars template engine registration.
- `src/routes/attachments.ts` — Attachment upload (`POST /tasks/:taskId/attachments`), listing, download, and deletion routes.
- `src/routes/tasks.ts` — Task CRUD endpoints.
- `src/routes/auth.ts` — User registration and login routes.
- `src/routes/users.ts` — Profile management routes (`/me`).
- `src/app.ts` — Application assembly, multipart configuration, and error handlers.
- `src/server.ts` — Server entry point.
- `public/` — Interactive frontend dashboard (HTML, CSS, JS) mounted at `/app/`.
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
CREATE ROLE w5_task_attachments_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task_attachments
OWNER w5_task_attachments_user;

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
DATABASE_URL="postgresql://w5_task_attachments_user:change_me@localhost:5432/w5_task_attachments?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
UPLOAD_DIR="./var/uploads"
HOST="127.0.0.1"
PORT="3000"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_task_attachments
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Visit the application in your browser: `http://127.0.0.1:3000/app/`.

### Exploring the Example

**1. Using the Interactive Web Dashboard**

- Open `http://127.0.0.1:3000/app/`.
- Register a user and log in.
- Create a new task.
- Attach an image (`.png`, `.jpg`), a `.pdf`, or a `.txt` file (up to 10 MB).
- Click **Upload attachment**.
- Download the attachment or delete it.

**2. Testing via `curl`**

Log in and obtain a JWT `TOKEN`:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123"}'
```

Create a sample task:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Review Invoice", "description": "Verify supplier invoice details"}'
```

Upload an attachment to Task ID 1:

```bash

curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.png"
```

Response:
```json
{
  "id": 1,
  "taskId": 1,
  "originalName": "invoice.txt",
  "mimeType": "text/plain",
  "extension": "txt",
  "size": 24,
  "createdAt": "2026-11-16T10:00:00.000Z"
}
```

Download the attachment:

```bash
curl -X GET http://127.0.0.1:3000/api/attachments/1 \
  -H "Authorization: Bearer $TOKEN" \
  -O -J
```

Delete the attachment:

```bash
curl -X DELETE http://127.0.0.1:3000/api/attachments/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Workshop Objective

By running and studying this example, you will understand how Fastify processes single multipart file uploads safely, how to inspect binary magic bytes to avoid relying on unvalidated client headers, and how to combine private filesystem storage with PostgreSQL metadata.
