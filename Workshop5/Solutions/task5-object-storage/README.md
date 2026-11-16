# Private Object Storage with Presigned URLs (Workshop 5 Solution)

This solution implements **Task 5** of Workshop 5. It replaces local filesystem storage with an **S3-compatible private object-storage service** (such as **MinIO** or AWS S3). It demonstrates the modern cloud architecture used by production applications: the Fastify backend generates short-lived, cryptographically signed presigned upload URLs, the browser/client uploads the binary payload directly to private object storage, the backend verifies the uploaded object's integrity via `HeadObjectCommand` before creating database records, and authorized users retrieve files via presigned download URLs or authenticated streaming.

### What This Solution Demonstrates

- **Direct-to-Storage Architecture:** Offloads high-bandwidth binary uploads from the Node.js application server directly to S3/MinIO.
- **Server-Controlled Object Keys:** Generates private keys (`tasks/:taskId/:uuid.:ext`) so clients cannot overwrite arbitrary objects or control bucket paths.
- **Short-Lived Presigned Upload URLs:** Issues temporary AWS Signature Version 4 URLs (valid for 5 minutes) via `@aws-sdk/s3-request-presigner` restricted to the target object key and MIME type.
- **Object Verification (`HeadObjectCommand`):** Before writing metadata to PostgreSQL, the backend verifies that the object exists in the private bucket and adheres to size constraints (<= 10 MB).
- **Private Bucket Isolation:** The object storage bucket has no public read or write permissions.
- **Authorized Presigned Downloads:** Issues short-lived presigned GET URLs (valid for 60 seconds) with `ResponseContentDisposition` forcing safe file downloads.
- **Direct Streaming Fallback:** Supports streaming files directly from S3 through Fastify with security headers (`nosniff`, `no-store`).
- **Synchronized Deletion:** Deleting an attachment purges the binary object from the S3 bucket before removing the database row.
- **Interactive Cloud Studio Dashboard:** Served at `/app/`, coordinating presigned URL acquisition, direct HTTP `PUT` upload to storage, server confirmation, and authenticated downloads.

### Project Structure

- `prisma/schema.prisma` — PostgreSQL schema with `User`, `Task`, and `Attachment` models (recording `bucket`, `storageKey`, `size`, `mimeType`).
- `prisma7.config.ts` — Prisma configuration file with driver adapter support.
- `src/config/s3.ts` — S3 client initialization, bucket configuration, and presigned expiration settings.
- `src/lib/s3-storage.ts` — High-level S3 operations (`createPresignedUploadUrl`, `verifyS3Object`, `createPresignedDownloadUrl`, `deleteS3Object`, `getS3ObjectStream`).
- `src/lib/password.ts` — Argon2id password utilities.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/plugins/auth.ts` — JWT authentication and role-based authorization hooks.
- `src/plugins/prisma.ts` — Prisma Client connection lifecycle management.
- `src/plugins/static.ts` — Serves the interactive dashboard from `public/`.
- `src/routes/attachments.ts` — Presigned upload flow, confirmation, listing, presigned download, streaming download, and deletion.
- `src/routes/tasks.ts` — Task CRUD routes.
- `src/routes/auth.ts` — Authentication routes (`/register`, `/login`).
- `src/routes/users.ts` — Profile management (`/me`).
- `public/` — Interactive web application (HTML, CSS, JS) mounted at `/app/`.
- `package.json` — Dependencies and scripts.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Start MinIO (Local S3 Storage)**

Run MinIO using Docker:

```bash
docker run -d \
  --name minio-task-storage \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

The MinIO web console is available at `http://localhost:9001`.

*(Note: The server will automatically create the bucket `task-attachments-private` on startup if it does not already exist).*

**3. Create the Database and Role**

```bash
sudo -i -u postgres
psql
```

Create a dedicated role and database:

```sql
CREATE ROLE w5_task5_object_storage_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task5_object_storage
OWNER w5_task5_object_storage_user;

\q
```

**4. Configure Environment Variables**

```bash
cp .env.example .env
```

Generate a secure 32-byte secret for JWT signing:

```bash
openssl rand -base64 32
```

Edit `.env`:

```env
DATABASE_URL="postgresql://w5_task5_object_storage_user:change_me@localhost:5432/w5_task5_object_storage?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
HOST="127.0.0.1"
PORT="3000"

S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="task-attachments-private"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_FORCE_PATH_STYLE="true"
```

**5. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_object_storage
npx prisma generate
```

**6. Start the Server**

```bash
npm run dev
```

Visit the dashboard in your browser: `http://127.0.0.1:3000/app/`.

### Exploring the Solution

**1. Using the Interactive Web Dashboard**

- Open `http://127.0.0.1:3000/app/`.
- Register and log in.
- Create a task.
- Select a file to attach and click **Upload attachments**.
- Observe the client requesting a presigned URL, streaming directly to MinIO/S3 via HTTP `PUT`, and notifying Fastify to register the verified object.
- Click the download button to retrieve the file via an authorized presigned URL.

**2. Testing the Presigned Flow via `curl`**

Log in and obtain a JWT `TOKEN`:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123"}'
```

**Step A: Request a Presigned Upload URL**

```bash
curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments/presign-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalName": "contract.pdf", "mimeType": "application/pdf"}'
```

Response:
```json
{
  "uploadUrl": "http://localhost:9000/task-attachments-private/tasks/1/018f...pdf?X-Amz-...",
  "storageKey": "tasks/1/018f3a5b-4c2d-4e9f-8a1c-92b8d4e7f1a2.pdf",
  "bucket": "task-attachments-private",
  "expiresInSeconds": 300
}
```

**Step B: Upload Binary Content Directly to S3 / MinIO**

```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @"contract.pdf"
```

**Step C: Confirm Upload with Backend**

```bash
curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments/confirm-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storageKey": "tasks/1/018f3a5b-4c2d-4e9f-8a1c-92b8d4e7f1a2.pdf",
    "originalName": "contract.pdf",
    "mimeType": "application/pdf"
  }'
```

Response:
```json
{
  "message": "Attachment confirmed and saved",
  "attachment": {
    "id": 1,
    "taskId": 1,
    "originalName": "contract.pdf",
    "storageKey": "tasks/1/018f3a5b-4c2d-4e9f-8a1c-92b8d4e7f1a2.pdf",
    "bucket": "task-attachments-private",
    "mimeType": "application/pdf",
    "size": 18450
  }
}
```

**Step D: Download via Presigned URL**

```bash
curl -X GET http://127.0.0.1:3000/api/attachments/1/presign-download \
  -H "Authorization: Bearer $TOKEN"
```

Use the returned `downloadUrl` to fetch the file directly from S3 without passing through the Fastify server.

### Workshop Objective

By completing this task, you have learned how to decouple application logic from binary file storage, generate and secure S3 presigned URLs, verify objects post-upload, and implement cloud-native object storage patterns in Fastify.
