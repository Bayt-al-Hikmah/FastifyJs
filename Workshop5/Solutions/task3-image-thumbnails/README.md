# Image Processing and Thumbnails (Workshop 5 Solution)

This solution implements **Task 3** of Workshop 5. It extends the Task Management API with **automated thumbnail generation** for JPEG and PNG attachments using the high-performance `sharp` image processing library. Original images and generated thumbnails are stored in separate private storage locations, protected against image decompression bombs ("pixel bombs"), stripped of privacy-sensitive EXIF metadata, and delivered through authenticated image routes.

### What This Solution Demonstrates

- **Asynchronous Image Processing:** Uses `sharp` to resize uploaded JPEG and PNG images to a maximum width of 300 pixels while preserving the original aspect ratio.
- **Decompression Bomb ("Pixel Bomb") Defense:** Limits allowed input pixels via `limitInputPixels: 24_000_000`, refusing to allocate memory for maliciously crafted miniature files with extreme dimensions.
- **Privacy Protection:** Strips EXIF geolocation, camera model, and personal metadata from generated preview thumbnails.
- **Dual Private Storage:** Preserves full-resolution originals under `var/uploads/originals` while saving optimized WebP/JPEG thumbnails under `var/uploads/thumbnails`.
- **Authenticated Thumbnail Delivery (`GET /api/attachments/:id/thumbnail`):** Streams the generated thumbnail with appropriate MIME types, cache headers, and ownership authorization.
- **Clean Fallback & Error Handling:** Gracefully handles corrupted image data and guarantees cleanup of staging files if processing fails.
- **Visual Interactive Dashboard:** Includes a frontend application served at `/app` where users can view interactive image galleries, full-resolution views, and preview cards.

### Project Structure

- `prisma/schema.prisma` — Database models storing image dimensions, thumbnail paths, and metadata.
- `prisma7.config.ts` — Prisma 7 configuration file.
- `src/lib/image-processing.ts` — Safe `sharp` processing, thumbnail generation, pixel bounds, and metadata stripping.
- `src/lib/password.ts` — Argon2id password hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma error handling helper.
- `src/config/uploads.ts` — Image dimensions, max input pixels (`24,000,000`), and storage paths.
- `src/plugins/auth.ts` — JWT authentication and role checks.
- `src/plugins/prisma.ts` — Prisma Client lifecycle plugin.
- `src/plugins/static.ts` — Serves static dashboard assets.
- `src/routes/attachments.ts` — Image upload, metadata listing, original download, and thumbnail endpoint.
- `src/routes/tasks.ts` — Task CRUD routes.
- `src/routes/auth.ts` — Authentication routes (`/register`, `/login`).
- `src/routes/users.ts` — User profile routes (`/me`).
- `public/app/` — Interactive gallery dashboard (`index.html`, `app.js`, `styles.css`).
- `package.json` — Scripts and dependencies.

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
CREATE ROLE w5_task3_image_thumbnails_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task3_image_thumbnails
OWNER w5_task3_image_thumbnails_user;

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
DATABASE_URL="postgresql://w5_task3_image_thumbnails_user:change_me@localhost:5432/w5_task3_image_thumbnails?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
UPLOAD_DIR="./var/uploads"
SHARP_CONCURRENCY="1"
MAX_INPUT_PIXELS="24000000"
```

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_thumbnails
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
- Register or log in.
- Create a task and upload an image file (e.g. `photo.jpg` or `diagram.png`).
- The dashboard immediately renders the generated 300px preview thumbnail.
- Clicking the thumbnail opens the full-resolution original image downloaded securely.

**2. Testing with `curl`**

Log in and obtain a JWT `TOKEN`:

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123"}'
```

Upload an image to Task ID 1:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.jpg"
```

Response:
```json
{
  "message": "Attachment uploaded and processed successfully",
  "attachment": {
    "id": 1,
    "originalName": "sample.jpg",
    "mimeType": "image/jpeg",
    "size": 154320,
    "hasThumbnail": true,
    "thumbnailUrl": "/api/attachments/1/thumbnail"
  }
}
```

Retrieve the thumbnail:

```bash
curl -X GET http://127.0.0.1:3000/api/attachments/1/thumbnail \
  -H "Authorization: Bearer $TOKEN" \
  -o thumbnail.jpg
```

Inspect the thumbnail dimensions (`identify thumbnail.jpg` or open in an image viewer) to verify it was scaled down to <= 300px width with metadata removed.

### Workshop Objective

By completing this task, you have learned how to integrate media processing into Fastify request flows, safely bound CPU and memory usage using `sharp`, strip tracking metadata, and manage separate storage pipelines for original and derivative assets.
