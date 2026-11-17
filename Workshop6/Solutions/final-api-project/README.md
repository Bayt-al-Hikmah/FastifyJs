# Recipe Box (Workshop 6 Solution)

This is the final Workshop 6 project: **Recipe Box**, a complete API-driven application built with Fastify 5, TypeScript, Prisma 7, and PostgreSQL. Chefs draft, publish, edit, and illustrate their own recipes; members browse the published catalogue and keep a private favorites list. A polished "Mise" dashboard at `/app/` exercises every endpoint with Fetch.

### What You'll Learn

- **Resource Modeling:** `User`, `Recipe`, `Photo`, and `Favorite` entities with enums, one-to-one photo ownership, a composite favorite key, and cascade rules.
- **Role-Based Authorization:** `CHEF` and `MEMBER` roles chosen at registration and enforced with an `authorize(...roles)` preHandler.
- **Token-Derived Ownership:** Chef writes include `authorId` from the verified JWT in the Prisma `where` clause, so another chef's ID in the URL produces `404`.
- **Publication Visibility:** Public reads return only `PUBLISHED` recipes; a chef can additionally read their own drafts, while everyone else receives `404` for a draft.
- **Predictable Envelopes:** Success uses `{ "message": "...", "data": { ... } }`, lists add `pagination`, validation uses a field-level `errors` array, and deletions return `204`.
- **JSON Schema Validation:** Params, query strings, and bodies use `additionalProperties: false`, pagination defaults, `minProperties: 1` on PATCH, and `maxPrep` bounds.
- **Pagination and Filtering:** Search by title, summary, or ingredients; filter by category and maximum preparation time; paginate every collection.
- **Private Media Storage:** Photos stream to `var/uploads/staging`, are checked with `file-type` magic-byte detection, and move to `var/uploads/objects` under a server-generated UUID.
- **Authenticated Streaming Downloads:** The storage key is read from the database row, and responses set `X-Content-Type-Options: nosniff` plus `Cache-Control: private, no-store`.
- **Safe Cleanup:** A failed metadata write removes the new photo, and replacing or deleting a photo removes the previous object.
- **Centralized Error Handling:** One handler maps validation, Prisma `P2002`/`P2025`, multipart limits, and unknown failures to safe messages without stack traces.
- **Accessible Fetch Frontend:** A responsive ES-module dashboard with semantic forms, labels, live regions, loading/empty states, focus styles, and `textContent` rendering.

### Project Structure

- `prisma/schema.prisma` — Domain models, enums, indexes, and relations for the recipe box.
- `prisma/migrations/` — Initial SQL migration and migration lock file.
- `prisma7.config.ts` — Prisma 7 configuration with the PostgreSQL driver adapter.
- `src/config/` — Environment, upload limits, and private storage path configuration.
- `src/types/` — Auth types plus Fastify and JWT module augmentations.
- `src/lib/` — Password hashing, Prisma error detection, pagination, serializers, visibility rules, and media validation/storage helpers.
- `src/plugins/` — Prisma lifecycle, JWT authentication and roles, optional authentication, multipart limits, and static hosting.
- `src/schemas/` — Reusable JSON Schema fragments for auth, recipes, lists, and errors.
- `src/routes/auth.ts` — Registration, login, and `/auth/me`.
- `src/routes/recipes.ts` — Public catalogue, chef studio, detail, and recipe CRUD.
- `src/routes/favorites.ts` — Favorite toggle and `/me/favorites`.
- `src/routes/photos.ts` — Private photo upload, replacement, removal, and streaming download.
- `src/app.ts` — Plugin registration, central errors, not-found handler, CORS, and rate limits.
- `src/server.ts` — Server entry point and graceful shutdown.
- `public/` — "Mise" dashboard served at `/app/`.
- `package.json` / `tsconfig.json` — ESM + NodeNext dependencies and scripts.

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
CREATE ROLE w6_recipes_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w6_recipes
OWNER w6_recipes_user;

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
DATABASE_URL="postgresql://w6_recipes_user:change_me@localhost:5432/w6_recipes?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
FRONTEND_ORIGIN="http://127.0.0.1:3015"
UPLOAD_DIR="./var/uploads"
HOST="127.0.0.1"
PORT="3015"
```

The role/password pair above is for local study only; use a strong secret in any shared environment. `FRONTEND_ORIGIN` may be omitted when using the bundled dashboard because it is served by the same Fastify process.

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_recipe_box
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Open the dashboard at `http://127.0.0.1:3015/app/`.

### Exploring the Solution

Roles are self-selected at registration in this teaching project so both flows can be tried immediately. In production, role assignment must be an administrative action.

| Step | Action | Endpoint |
|---|---|---|
| 1 | Register a chef | `POST /api/auth/register` with `role: "CHEF"` |
| 2 | Register a member | `POST /api/auth/register` with `role: "MEMBER"` |
| 3 | Log in and save the token | `POST /api/auth/login` |
| 4 | Create a recipe draft | `POST /api/recipes` |
| 5 | List your drafts | `GET /api/me/recipes` |
| 6 | Upload a recipe photo | `PUT /api/recipes/1/photo` |
| 7 | Download the private photo | `GET /api/recipes/1/photo/download` |
| 8 | Publish the recipe | `PATCH /api/recipes/1` with `{ "status": "PUBLISHED" }` |
| 9 | Browse, search, and filter | `GET /api/recipes?search=lemon&category=DINNER&maxPrep=30` |
| 10 | Toggle a favorite | `POST /api/recipes/1/favorite` |
| 11 | List your favorites | `GET /api/me/favorites` |
| 12 | Remove a photo | `DELETE /api/recipes/1/photo` |
| 13 | Delete a recipe | `DELETE /api/recipes/1` → `204` |

Register a chef:

```bash
curl -X POST http://127.0.0.1:3015/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Chef","email":"ada@example.com","password":"a-very-long-demo-password","role":"CHEF"}'
```

Log in and store the token:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"a-very-long-demo-password"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.accessToken')
```

Create a draft:

```bash
curl -X POST http://127.0.0.1:3015/api/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Charred Lemon Pasta",
    "summary": "A bright weeknight pasta with blistered lemons and herbs.",
    "ingredients": "400g spaghetti\n2 lemons\n2 garlic cloves\nParsley\nOlive oil",
    "steps": "Boil the pasta until al dente.\nChar the lemon halves in a dry pan.\nToss with garlic, parsley, and olive oil.",
    "category": "DINNER",
    "prepMinutes": 25
  }'
```

Upload and download a private photo:

```bash
curl -X PUT http://127.0.0.1:3015/api/recipes/1/photo \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@pasta.jpg"

curl http://127.0.0.1:3015/api/recipes/1/photo/download \
  -H "Authorization: Bearer $TOKEN" \
  -o pasta-preview.jpg
```

Publish, browse, and favorite:

```bash
curl -X PATCH http://127.0.0.1:3015/api/recipes/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PUBLISHED"}'

curl "http://127.0.0.1:3015/api/recipes?search=lemon&category=DINNER&maxPrep=30"

curl -X POST http://127.0.0.1:3015/api/recipes/1/favorite \
  -H "Authorization: Bearer $TOKEN"

curl http://127.0.0.1:3015/api/me/favorites \
  -H "Authorization: Bearer $TOKEN"
```

**Dashboard walkthrough**

1. Open `/app/` and create a CHEF account, then sign in.
2. Open **Chef studio**, create a recipe, and use **Edit** to attach a JPG, PNG, or WEBP photo.
3. Use **Publish** in the studio list; the recipe now appears in **Recipe box**.
4. Sign out, register a MEMBER, and sign in.
5. Search or filter the box, open a recipe card, and use **Save** to add it to **My favorites**.
6. Reopen the card to read the ingredient and method lists, preview the photo, and download it through the authenticated route.

### Design Rationale

- **Resources:** A recipe owns at most one photo, and favorites are a composite key of user and recipe. This keeps metadata queries simple and prevents duplicate bookmarks at the database level.
- **Endpoints:** Public reads are separated from `/me/*` collections so visibility and ownership never depend on a client-supplied user ID. Photo and favorite operations sit under the recipe ID, making the URL hierarchy match the domain.
- **Public vs. protected:** Browsing and detail reads are public, but every write, favorite toggle, and photo download requires a JWT. `optionalAuthenticate` adds favorite state without forcing anonymous visitors to sign in.
- **Ownership:** Updates, deletes, and photo writes use `findFirst`/`updateManyAndReturn` with both the recipe ID and token-derived `authorId`. A mismatch is indistinguishable from a missing recipe.
- **Validation:** JSON Schema rejects unknown fields, bounds preparation time to 1–1440 minutes, and requires at least one changed field on PATCH. The central error handler converts AJV issues into field-level messages for the UI.
- **Uploads:** The ownership check happens before the multipart stream is read. The file is staged privately, checked for extension, declared MIME, and binary signature agreement, then renamed to a UUID object. Downloads resolve the storage key from the database and always set `nosniff` and private cache headers.

### Workshop Objective

Recipe Box brings the Workshop 6 concepts together in one application: layered Fastify code, Prisma relations, JWT authentication and roles, ownership-aware queries, validation envelopes, pagination and filtering, and secure private uploads. The Mise dashboard shows how a clean API contract makes a real frontend straightforward, while the design rationale explains why each security decision lives where it does.
