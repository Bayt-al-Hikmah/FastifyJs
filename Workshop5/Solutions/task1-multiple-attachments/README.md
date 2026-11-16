# Multiple Attachments (Workshop 5 Solution)

This solution implements **Task 1** of Workshop 5. It extends the Task Management API with support for uploading **multiple file attachments** in a single multipart request using Fastify's `request.files()` iterator. It validates file types through binary magic bytes, enforces per-file size limits (10 MB) and request batch limits (up to 5 files per request), stores files under randomized UUID keys outside the web root, records attachment metadata in PostgreSQL via Prisma, and guarantees complete cleanup of disk files if any operation in the batch fails.

### What This Solution Demonstrates

- **Streaming Multi-File Processing:** Uses `request.files()` to iterate asynchronously over multiple files in a single `multipart/form-data` payload.
- **Batch & File Constraints:** Limits requests to a maximum of 5 files per upload, with each file capped at 10 MB.
- **Binary Signature & MIME Validation:** Inspects real magic bytes using `file-type` to detect spoofed file extensions.
- **Atomic Rollback & Failure Cleanup:** If validation fails on the 3rd file, previously staged files for that request are immediately unlinked from disk before the transaction aborts.
- **Safe Private Storage:** Stored files are assigned random UUID keys in `var/uploads/` and can only be accessed through an authenticated download route.
- **Authenticated Downloads with Security Headers:** Downloads stream directly from private storage with `Content-Disposition: attachment; filename="sanitized_name"`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`.
- **Full Interactive Dashboard:** An interactive HTML/CSS/JavaScript client served under `/app/` allowing users to register, log in, create tasks, drag-and-drop multiple attachments, preview file lists, download, and delete files.

### Project Structure

- `prisma/schema.prisma` — PostgreSQL schema with `User`, `Task`, and `Attachment` models and cascading relations.
- `prisma7.config.ts` — Prisma 7 configuration file with driver adapter support.
- `src/lib/attachment-validation.ts` — File extension rules, MIME verification, and magic byte checks.
- `src/lib/storage-files.ts` — Private filesystem operations (atomic rename, safe deletion, stream piping).
- `src/lib/password.ts` — Argon2id password hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma error handling helper.
- `src/config/uploads.ts` — Allowed MIME types, extensions, maximum file counts, and size limits.
- `src/config/storage.ts` — Storage directory path resolution.
- `src/plugins/auth.ts` — JWT authentication and role-based authorization hooks.
- `src/plugins/prisma.ts` — Prisma Client lifecycle plugin.
- `src/plugins/static.ts` — Serves the interactive frontend located in `public/`.
- `src/plugins/views.ts` — Handlebars template support.
- `src/routes/attachments.ts` — Multi-file upload, list, download, and delete endpoints.
- `src/routes/tasks.ts` — Task CRUD routes.
- `src/routes/auth.ts` — Authentication routes (`/register`, `/login`).
- `src/routes/users.ts` — User profile routes (`/me`).
- `public/` — Interactive web application (HTML, CSS, JS) mounted at `/app/`.
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
CREATE ROLE w5_task1_attachments_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task1_attachments
OWNER w5_task1_attachments_user;

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
DATABASE_URL="postgresql://w5_task1_attachments_user:change_me@localhost:5432/w5_task1_attachments?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
UPLOAD_DIR="./var/uploads"
HOST="127.0.0.1"
PORT="3000"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_attachments
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Visit the dashboard in your browser: `http://127.0.0.1:3000/app/`.

### Exploring the Solution

**1. Using the Interactive Web Dashboard**

- Open `http://127.0.0.1:3000/app/`.
- Register a user and log in.
- Create a new task.
- Select up to 5 files at once (e.g. PDFs, PNGs, JPEGs, or text files).
- Click **Upload Attachments**.
- Observe the uploaded attachments with their size, type, and uploader information.
- Click any attachment to download it, or delete it with immediate feedback.

**2. Testing Multiple Uploads via `curl`**

First, register and log in to get your `TOKEN`:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123"}'
```

Create two sample files:

```bash
echo "Document One" > doc1.txt
echo "Document Two" > doc2.txt
```

Upload both files in a single request to Task ID 1:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@doc1.txt" \
  -F "files=@doc2.txt"
```

Response:
```json
{
  "message": "2 attachment(s) uploaded successfully",
  "attachments": [
    {
      "id": 1,
      "originalName": "doc1.txt",
      "mimeType": "text/plain",
      "size": 13,
      "createdAt": "2026-11-16T10:00:00.000Z"
    },
    {
      "id": 2,
      "originalName": "doc2.txt",
      "mimeType": "text/plain",
      "size": 13,
      "createdAt": "2026-11-16T10:00:00.000Z"
    }
  ]
}
```

**3. Download an Attachment**

```bash
curl -X GET http://127.0.0.1:3000/api/attachments/1 \
  -H "Authorization: Bearer $TOKEN" \
  -O -J
```

The file is saved with its original name `doc1.txt`.

### Workshop Objective

By completing this task, you have learned how to handle multiple file streams in Fastify, validate batch limits and binary signatures, execute atomic rollbacks on disk and database upon failure, and serve files securely through authenticated streaming.
