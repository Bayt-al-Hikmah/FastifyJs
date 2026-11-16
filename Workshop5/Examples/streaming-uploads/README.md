# Streaming Uploads (Workshop 5 Example)

This example demonstrates **Node.js stream-based file uploads** in Fastify using `@fastify/multipart`. Instead of buffering incoming uploads into memory or waiting for the entire payload to arrive before inspecting it, incoming file chunks are piped directly to disk through a custom `Transform` stream (`UploadMeter`). The stream enforces byte size limits on the fly, computes a cryptographic SHA-256 checksum in real-time, validates the file's binary magic bytes, and cleans up aborted staging files on failure.

### What You'll Learn

- **Streaming Multipart Processing:** Process file parts with `request.file()` without buffering entire files in memory.
- **Custom Transform Stream (`UploadMeter`):** A custom Node.js `Transform` stream that tracks transferred bytes and updates a SHA-256 hash incrementally.
- **Early Abort on Size Limit:** Instantly stops consuming and terminates the upload stream if the incoming file exceeds the 10 MB limit, protecting server memory and disk space.
- **Binary Signature Inspection:** Uses `file-type` on the initial stream chunks to identify genuine MIME types rather than relying on browser-reported headers or file extensions.
- **Safe Disk Staging & Atomic Persistence:** Writes incoming data to a temporary staging path under `var/uploads/staging` and moves the file into storage only after all integrity checks pass.
- **Failure Cleanup:** Ensures partial temporary files are removed from disk if the user disconnects, exceeds quotas, or fails validation.
- **Interactive Web Interface:** Server-rendered Handlebars interface with dynamic client-side progress updates, drag-and-drop support, download links, and file deletion.

### Project Structure

- `src/lib/upload-meter.ts` — Custom `Transform` stream for chunk-level byte metering and SHA-256 digest computation.
- `src/lib/file-validation.ts` — Extension allowlist, filename sanitization, and binary magic-number validation.
- `src/lib/upload-store.ts` — In-memory metadata storage, byte formatting, and view model generation.
- `src/lib/upload-errors.ts` — Domain error classes for upload limit, validation, and storage failures.
- `src/config/uploads.ts` — Storage directory paths and upload configuration limits.
- `src/plugins/views.ts` — `@fastify/view` plugin configured with Handlebars layouts and partials.
- `src/plugins/static.ts` — `@fastify/static` plugin serving CSS and frontend JavaScript.
- `src/routes/api.ts` — REST API endpoints for upload (`POST /api/uploads`), listing (`GET /api/uploads`), download (`GET /api/uploads/:id`), and deletion (`DELETE /api/uploads/:id`).
- `src/routes/pages.ts` — Server-rendered page route (`GET /`).
- `src/app.ts` — Fastify application factory assembling plugins, routes, and error handlers.
- `src/server.ts` — Server entry point listening on `http://127.0.0.1:3000`.
- `views/` — Handlebars templates for pages, layouts, and reusable components.
- `public/` — Static assets (CSS styles and client-side JavaScript for file uploads).
- `package.json` — Scripts and dependencies.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Start the Development Server**

```bash
npm run dev
```

The application is available at `http://127.0.0.1:3000`.

### Exploring the Example

**1. Using the Web Interface**

Open `http://127.0.0.1:3000` in your web browser:
- Drag and drop or browse to select an image (`.jpg`, `.png`, `.webp`), a PDF document, or a text file (`<= 10 MB`).
- Click **Upload File**. You can observe the upload progress, view the stored file card with its calculated SHA-256 checksum, download the file, or delete it.

**2. Testing via `curl`**

Create a test file:

```bash
echo "Hello Fastify streaming uploads" > test.txt
```

Upload the file via the API:

```bash
curl -X POST http://127.0.0.1:3000/api/uploads \
  -F "file=@test.txt"
```

Response:
```json
{
  "id": "e2f1a6b0-...",
  "originalName": "test.txt",
  "mimeType": "text/plain",
  "sizeBytes": 32,
  "sha256": "8f48...da2",
  "createdAt": "2026-11-16T10:00:00.000Z"
}
```

**3. Test Oversized Upload Rejection**

Generate a 12 MB file that exceeds the 10 MB limit:

```bash
truncate -s 12M oversized.bin
```

Attempt to upload:

```bash
curl -i -X POST http://127.0.0.1:3000/api/uploads \
  -F "file=@oversized.bin"
```

The `UploadMeter` stream terminates the pipeline early and returns `413 Payload Too Large` without storing the file on disk.

### Workshop Objective

By running and exploring this example, you will understand how Node.js streams interface with Fastify's multipart parser, how to perform byte metering and checksum calculation on the fly, and how to safeguard backend file storage against memory exhaustion and oversized uploads.
