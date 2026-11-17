# Pet Adoption API (Workshop 6 Solution)

This solution builds a Prisma-backed REST API for a pet adoption shelter. Visitors can browse public pet listings with search, species and status filters, while staff accounts manage listings and private photos. The bundled **Pawprint** dashboard at `/app/` uses Fetch and a warm amber/rose theme to present pet cards, filter chips, a detail panel, staff forms, and authenticated image previews.

### What You'll Learn

- **Resource-Oriented Routing:** Model adoption listings with `/pets`, `/pets/:id`, and an image subresource.
- **Consistent Response Envelopes:** Return `{ message, data }` for successes and safe `{ message }` errors with `204` for deletes.
- **JSON Schema Validation:** Validate params, query strings, and bodies with enum constraints and `minProperties: 1` for updates.
- **Pagination and Filtering:** Combine case-insensitive name search, species/status filters, and pagination metadata.
- **JWT Authentication:** Issue 15-minute Bearer tokens and load the current user from PostgreSQL on every protected request.
- **Role-Based Authorization:** Bootstrap `STAFF` accounts with `STAFF_EMAILS` and use an `authorize('STAFF')` decorator.
- **Owner-Staff Safety:** Derive `shelterId` from the token and include it in every mutation `where` clause.
- **Prisma 7 Driver Adapters:** Connect to PostgreSQL with `@prisma/adapter-pg` and the generated Prisma Client.
- **Secure Multipart Uploads:** Stream photos to private staging, verify binary signatures with `file-type`, and store bytes under UUID keys.
- **Authenticated Private Downloads:** Stream photos from database-derived storage keys with `nosniff` and private cache headers.
- **Centralised Error Handling:** Normalise validation, Prisma, multipart, and unexpected errors in one place.
- **Fetch-Driven Dashboard:** Build a responsive, accessible UI with loading states, error messages, filter chips, and safe `textContent` rendering.

### Project Structure

- `prisma/schema.prisma` — `User`, `Pet`, `Role`, `Species`, and `PetStatus` definitions.
- `prisma/migrations/` — Initial PostgreSQL migration for users, pets, and indexes.
- `prisma7.config.ts` — Prisma 7 configuration with the PostgreSQL `DATABASE_URL` and migrations path.
- `src/config/storage.ts` — Private upload roots and the UUID storage-key pattern.
- `src/config/uploads.ts` — 5 MB limit, allowed image MIME types, and extension mapping.
- `src/lib/api-error.ts` — Route-level error carrying a status code and safe client message.
- `src/lib/pagination.ts` — Shared pagination metadata builder.
- `src/lib/password.ts` — Argon2id hashing and verification.
- `src/lib/prisma-errors.ts` — Prisma known-error detection helper.
- `src/lib/roles.ts` — `STAFF_EMAILS` bootstrap role mapping.
- `src/lib/image-storage.ts` — Staging, signature validation, UUID storage, cleanup, and deletion helpers.
- `src/lib/serializers.ts` — Public pet views that hide storage keys.
- `src/plugins/prisma.ts` — Prisma Client lifecycle and the `fastify.prisma` decorator.
- `src/plugins/auth.ts` — JWT signing, `authenticate`, and `authorize` decorators.
- `src/plugins/cors.ts` — Explicit origin allowlist from `FRONTEND_ORIGIN`.
- `src/plugins/multipart.ts` — Single-file multipart limits.
- `src/plugins/static.ts` — Serves the Pawprint dashboard at `/app/`.
- `src/schemas/auth.ts` — Registration and login JSON Schema.
- `src/schemas/pet.ts` — Pet params, query, create, and update JSON Schema.
- `src/routes/auth.ts` — Register, login, and profile endpoints with stricter auth rate limits.
- `src/routes/pets.ts` — Public reads, staff-only CRUD, and private image routes.
- `src/app.ts` — Plugin registration, hooks, central error handler, and not-found handler.
- `src/server.ts` — Server startup and graceful shutdown.
- `public/index.html` — Semantic Pawprint dashboard markup.
- `public/css/style.css` — Responsive amber/rose theme with accessible focus states.
- `public/js/api.js` — Reusable Fetch helper with Bearer-token injection and `.status`/`.details` errors.
- `public/js/app.js` — Dashboard controller for auth, chips, CRUD, upload, and previews.
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
CREATE ROLE w6_pets_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w6_pets
OWNER w6_pets_user;

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
DATABASE_URL="postgresql://w6_pets_user:change_me@localhost:5432/w6_pets?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
STAFF_EMAILS="staff@pawprint.local"
UPLOAD_DIR="./var/uploads"
FRONTEND_ORIGIN=""
HOST="127.0.0.1"
PORT="3012"
```

`STAFF_EMAILS` is a comma-separated bootstrap list. An account registered with one of those email addresses receives the `STAFF` role; every other account receives `VISITOR`. This is a workshop convenience, not a production provisioning system.

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_pets
npx prisma generate
```

The generated client is written to `src/generated/` and is intentionally not committed.

**5. Start the Server**

```bash
npm run dev
```

Open the Pawprint dashboard at `http://127.0.0.1:3012/app/`. The API root is `http://127.0.0.1:3012/api`.

### Exploring the Solution

**1. Using the Interactive Dashboard**

- Open `http://127.0.0.1:3012/app/` and browse the public pet gallery.
- Use the species and status filter chips, or search by name.
- Register with an email listed in `STAFF_EMAILS` to sign in as `STAFF`.
- Add a pet from the staff panel, then open its card to edit status or upload a photo.
- Only the staff member who listed a pet can edit, delete, or manage that pet's photo.
- Sign in as a visitor or staff member to view private photo previews.

**2. Endpoint Overview**

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create an account | Public |
| `POST` | `/api/auth/login` | Obtain a 15-minute Bearer token | Public |
| `GET` | `/api/auth/me` | Read the current profile | Authenticated |
| `GET` | `/api/pets` | Search, filter, and paginate pets | Public |
| `GET` | `/api/pets/:id` | Read one pet (`404` when missing) | Public |
| `POST` | `/api/pets` | List a pet (`shelterId` comes from the token) | `STAFF` |
| `PATCH` | `/api/pets/:id` | Update an owned listing | Owning `STAFF` |
| `DELETE` | `/api/pets/:id` | Delete an owned listing | Owning `STAFF` |
| `PUT` | `/api/pets/:id/image` | Upload or replace a private photo | Owning `STAFF` |
| `DELETE` | `/api/pets/:id/image` | Remove photo metadata and bytes | Owning `STAFF` |
| `GET` | `/api/pets/:id/image` | Stream the private photo | Authenticated |

Public listing metadata never exposes the storage key. Visitors can browse cards and details, but photo bytes require authentication.

**3. Testing with `curl`**

Register a visitor and a staff account:

```bash
curl -X POST http://127.0.0.1:3012/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jamie Fox","email":"jamie@example.com","password":"change_me_long"}'

curl -X POST http://127.0.0.1:3012/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Morgan Lee","email":"staff@pawprint.local","password":"change_me_long"}'
```

Log in as staff and store the token:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3012/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@pawprint.local","password":"change_me_long"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.accessToken')
```

List a pet:

```bash
curl -X POST http://127.0.0.1:3012/api/pets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Willow","species":"DOG","age":3,"description":"Gentle and house-trained.","status":"AVAILABLE"}'
```

Browse and filter without authentication:

```bash
curl 'http://127.0.0.1:3012/api/pets?search=willow&species=DOG&status=AVAILABLE&page=1&limit=12'

curl 'http://127.0.0.1:3012/api/pets/1'
```

Update and delete:

```bash
curl -X PATCH http://127.0.0.1:3012/api/pets/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PENDING"}'

curl -X DELETE http://127.0.0.1:3012/api/pets/1 \
  -H "Authorization: Bearer $TOKEN"
```

Upload, download, and remove a private photo:

```bash
curl -X PUT http://127.0.0.1:3012/api/pets/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/willow.jpg"

curl -X GET http://127.0.0.1:3012/api/pets/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -o willow-download.jpg

curl -X DELETE http://127.0.0.1:3012/api/pets/1/image \
  -H "Authorization: Bearer $TOKEN"
```

Only JPEG, PNG, and WebP signatures up to 5 MB are accepted. A guessed or forged filename cannot influence the storage path because the server validates the binary signature and assigns a UUID key.

### Workshop Objective

By building and studying this solution, you will practise designing public and protected REST endpoints, validating requests with JSON Schema, applying JWT roles and ownership rules, persisting relational data with Prisma, protecting private uploads, normalising errors, and consuming the API from a polished Fetch-driven frontend. These are the same transferable patterns used throughout Workshop 6.
