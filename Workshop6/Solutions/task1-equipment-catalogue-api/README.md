# Equipment Catalogue API (Workshop 6 Solution)

This solution builds a Prisma-backed REST API for managing a shared equipment catalogue. Visitors can browse and filter public catalogue metadata, authenticated users can add items and manage the items they own, and administrators can manage every record. Private reference photos are signature-checked, stored under server-generated UUID names, and delivered through an authenticated streaming endpoint. The bundled **Kitbase** dashboard at `/app/` demonstrates the same API with Fetch, accessible forms, and a calm teal/steel interface.

### What You'll Learn

- **Resource-Oriented Routing:** Model a catalogue with `/equipment`, `/equipment/:id`, and an image subresource.
- **Consistent Response Envelopes:** Return `{ message, data }` for successes and safe `{ message }` errors with `204` for deletes.
- **JSON Schema Validation:** Validate params, query strings, and bodies with `additionalProperties: false` and partial-update rules.
- **Pagination and Filtering:** Combine case-insensitive search, enum filters, sorting, and pagination metadata.
- **JWT Authentication:** Issue short-lived access tokens and verify them with an `authenticate` preHandler decorator.
- **Role-Based Authorization:** Bootstrap `ADMIN` accounts with `ADMIN_EMAILS` and gate mutations on roles plus ownership.
- **Ownership Safety:** Derive `ownerId` from the verified token and include it in Prisma `where` clauses.
- **Prisma 7 Driver Adapters:** Connect to PostgreSQL with `@prisma/adapter-pg` and the generated Prisma Client.
- **Secure Multipart Uploads:** Stream files to private staging, verify binary signatures with `file-type`, and store bytes outside `public/`.
- **Authenticated Private Downloads:** Stream images from database-derived storage keys with `nosniff` and private cache headers.
- **Centralised Error Handling:** Normalise validation, Prisma, multipart, and unexpected errors in one place.
- **Fetch-Driven Dashboard:** Build a responsive, accessible UI with loading states, error messages, filter chips, and modal-free editing.

### Project Structure

- `prisma/schema.prisma` — `User`, `Equipment`, `Role`, `EquipmentCategory`, and `Availability` definitions.
- `prisma/migrations/` — Initial PostgreSQL migration for the catalogue tables and indexes.
- `prisma7.config.ts` — Prisma 7 configuration with the PostgreSQL `DATABASE_URL` and migrations path.
- `src/config/storage.ts` — Private upload roots and the UUID storage-key pattern.
- `src/config/uploads.ts` — 5 MB limit, allowed image MIME types, and extension mapping.
- `src/lib/api-error.ts` — Route-level error carrying a status code and safe client message.
- `src/lib/pagination.ts` — Shared pagination metadata builder.
- `src/lib/password.ts` — Argon2id hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma known-error detection helper.
- `src/lib/roles.ts` — `ADMIN_EMAILS` bootstrap role mapping.
- `src/lib/image-storage.ts` — Staging, signature validation, UUID storage, cleanup, and deletion helpers.
- `src/lib/serializers.ts` — Public equipment views that hide storage keys.
- `src/plugins/prisma.ts` — Prisma Client lifecycle and the `fastify.prisma` decorator.
- `src/plugins/auth.ts` — JWT signing, `authenticate`, and `authorize` decorators.
- `src/plugins/cors.ts` — Explicit origin allowlist from `FRONTEND_ORIGIN`.
- `src/plugins/multipart.ts` — Single-file multipart limits.
- `src/plugins/static.ts` — Serves the Kitbase dashboard at `/app/`.
- `src/schemas/auth.ts` — Registration and login JSON Schema.
- `src/schemas/equipment.ts` — Catalogue params, query, create, and update JSON Schema.
- `src/routes/auth.ts` — Register, login, and profile endpoints with stricter auth rate limits.
- `src/routes/equipment.ts` — Public reads, protected CRUD, and private image routes.
- `src/app.ts` — Plugin registration, hooks, central error handler, and not-found handler.
- `src/server.ts` — Server startup and graceful shutdown.
- `public/index.html` — Semantic Kitbase dashboard markup.
- `public/css/style.css` — Responsive teal/steel theme with accessible focus states.
- `public/js/api.js` — Reusable Fetch helper with Bearer-token injection and `.status`/`.details` errors.
- `public/js/app.js` — Dashboard controller for auth, filters, CRUD, upload, and previews.
- `var/uploads/.gitkeep` — Keeps the private upload root in version control.
- `package.json` — Fastify 5, Prisma 7, scripts, and pinned `allowScripts`.

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
CREATE ROLE w6_equipment_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w6_equipment
OWNER w6_equipment_user;

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
DATABASE_URL="postgresql://w6_equipment_user:change_me@localhost:5432/w6_equipment?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
ADMIN_EMAILS="admin@kitbase.local"
UPLOAD_DIR="./var/uploads"
FRONTEND_ORIGIN=""
HOST="127.0.0.1"
PORT="3011"
```

`ADMIN_EMAILS` is a comma-separated bootstrap list. An account registered with one of those email addresses receives the `ADMIN` role; every other account receives `USER`. This is a workshop convenience, not a production provisioning system.

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_equipment
npx prisma generate
```

The generated client is written to `src/generated/` and is intentionally not committed.

**5. Start the Server**

```bash
npm run dev
```

Open the Kitbase dashboard at `http://127.0.0.1:3011/app/`. The API root is `http://127.0.0.1:3011/api`.

### Exploring the Solution

**1. Using the Interactive Dashboard**

- Open `http://127.0.0.1:3011/app/`.
- Choose **Browse without signing in** to explore the public catalogue.
- Register as `USER`, or register with an email listed in `ADMIN_EMAILS` to become an `ADMIN`.
- Add an equipment item, then open it to edit details or upload a reference photo.
- Use the search field, category select, and availability select to filter the catalogue.
- Open an item with a photo while signed in to load its private image preview.

**2. Endpoint Overview**

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create an account | Public |
| `POST` | `/api/auth/login` | Obtain a 15-minute Bearer token | Public |
| `GET` | `/api/auth/me` | Read the current profile | Authenticated |
| `GET` | `/api/equipment` | Search, filter, and paginate the catalogue | Public |
| `GET` | `/api/equipment/:id` | Read one catalogue item | Public |
| `POST` | `/api/equipment` | Add an item (`ownerId` comes from the token) | Authenticated |
| `PATCH` | `/api/equipment/:id` | Update an owned item | Owner or `ADMIN` |
| `DELETE` | `/api/equipment/:id` | Delete an owned item | Owner or `ADMIN` |
| `PUT` | `/api/equipment/:id/image` | Upload or replace a private image | Owner or `ADMIN` |
| `DELETE` | `/api/equipment/:id/image` | Remove image metadata and bytes | Owner or `ADMIN` |
| `GET` | `/api/equipment/:id/image` | Stream the private image | Authenticated |

**3. Testing with `curl`**

Register a demo user:

```bash
curl -X POST http://127.0.0.1:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex Rivera","email":"alex@example.com","password":"change_me_long"}'
```

Log in and store the token:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"change_me_long"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.accessToken')
```

Create an item:

```bash
curl -X POST http://127.0.0.1:3011/api/equipment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cordless drill","description":"18 V driver with two batteries","category":"TOOLS","availability":"AVAILABLE","quantity":3}'
```

List, search, and filter:

```bash
curl 'http://127.0.0.1:3011/api/equipment?search=drill&category=TOOLS&availability=AVAILABLE&page=1&limit=12'
```

Update and delete:

```bash
curl -X PATCH http://127.0.0.1:3011/api/equipment/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"availability":"ON_LOAN","quantity":2}'

curl -X DELETE http://127.0.0.1:3011/api/equipment/1 \
  -H "Authorization: Bearer $TOKEN"
```

Upload, download, and remove a private image:

```bash
curl -X PUT http://127.0.0.1:3011/api/equipment/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/drill.jpg"

curl -X GET http://127.0.0.1:3011/api/equipment/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -o drill-download.jpg

curl -X DELETE http://127.0.0.1:3011/api/equipment/1/image \
  -H "Authorization: Bearer $TOKEN"
```

Only JPEG, PNG, and WebP signatures up to 5 MB are accepted. A guessed or forged filename cannot influence the storage path because the server validates the binary signature and assigns a UUID key.

### Workshop Objective

By building and studying this solution, you will practise the complete Workshop 6 workflow: designing resource-oriented endpoints, validating requests with JSON Schema, applying JWT authentication and ownership rules, persisting data with Prisma, protecting private uploads, normalising errors, and consuming the API from a polished Fetch-driven frontend. The same patterns transfer directly to the other Workshop 6 solutions.
