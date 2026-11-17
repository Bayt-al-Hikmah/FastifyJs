# Community Events API (Workshop 6 Example)

A complete Prisma-backed Community Events API built with Fastify 5, TypeScript, and the Workshop 6 patterns: layered routes/services/controllers, JWT authentication, owner-scoped mutations, JSON Schema validation, central error handling, private signature-checked cover storage, and capacity-safe registrations. The same server also hosts a polished “Gather” frontend at `http://127.0.0.1:3000/app/` with a public gallery, organizer studio, and member dashboard.

All API responses use the `{ message, data }` envelope; successful operations with no body return `204`, validation failures return an `errors` array, and all other failures return a single `message`.

### What You'll Learn

- **Fastify application structure** — app assembly, plugins, route prefixes, and a separate server entry point.
- **Prisma 7 with PostgreSQL** — models, enums, indexes, cascade rules, migrations, and the `pg` adapter.
- **Layered architecture** — thin routes, controllers, services, serializers, and reusable libraries.
- **JSON Schema validation** — strict request bodies/query strings with `additionalProperties: false` and helpful error messages.
- **JWT authentication** — 15-minute access tokens, hashed passwords, and login/registration rate limits.
- **Role-based authorization** — `MEMBER` and `ORGANIZER` accounts, plus ownership checks derived from the token.
- **Public versus private resources** — anonymous browsing of published events and token-protected organizer drafts.
- **Pagination and filtering** — search, category filters, page metadata, and reusable list serializers.
- **Private file storage** — randomized storage names, `file-type` signature sniffing, size/MIME checks, and authenticated streaming downloads.
- **Transactional integrity** — capacity-safe registration with a conditional count increment and duplicate detection.
- **Accessible Fetch UI** — real forms and labels, `aria-live` regions, object-URL previews, toasts, and responsive dialogs.
- **Central error handling** — consistent API errors for validation, authentication, authorization, Prisma failures, and uploads.

### Project Structure

```text
Workshop6/Examples/community-events-api/
├── package.json
├── tsconfig.json
├── prisma7.config.ts
├── .env.example
├── .gitignore
├── prisma/
│   └── schema.prisma
├── storage/
│   └── event-covers/
│       └── .gitkeep
├── src/
│   ├── app.ts                         # Fastify app, CORS, rate limits, errors, static /app/
│   ├── server.ts                      # Starts the HTTP listener
│   ├── config/env.ts                  # Validated environment configuration
│   ├── lib/
│   │   ├── api-error.ts               # ApiError and error helpers
│   │   ├── pagination.ts              # Pagination parsing and metadata
│   │   ├── password.ts                # Argon2 password hashing/verification
│   │   ├── prisma-errors.ts           # Prisma error-code translation
│   │   ├── serializers.ts             # User, event, cover, and registration DTOs
│   │   └── media-storage.ts           # Signed private cover storage
│   ├── plugins/
│   │   ├── prisma.ts                  # Prisma client and adapter lifecycle
│   │   ├── auth.ts                    # JWT verify/sign and authorize helpers
│   │   ├── multipart.ts               # Upload limits and file validation
│   │   └── static.ts                  # Serves public/ at /app/
│   ├── schemas/
│   │   ├── common-schemas.ts          # Shared enums, id, and pagination schemas
│   │   ├── auth-schemas.ts
│   │   ├── event-schemas.ts
│   │   └── registration-schemas.ts
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── event-service.ts
│   │   └── registration-service.ts
│   ├── controllers/
│   │   ├── auth-controller.ts
│   │   ├── event-controller.ts
│   │   └── registration-controller.ts
│   ├── routes/
│   │   ├── auth.ts                    # /api/auth/*
│   │   └── events.ts                  # /api/events/*, /api/me/*
│   └── types/
│       ├── auth.ts
│       ├── fastify.d.ts
│       └── fastify-jwt.d.ts
└── public/
    ├── index.html                     # Gather dashboard markup
    ├── css/style.css                  # Indigo/violet responsive theme
    └── js/
        ├── api.js                     # Fetch helper with Bearer tokens
        ├── ui.js                      # Toasts, dialogs, and DOM helpers
        ├── state.js                   # Client session state
        ├── auth.js                    # Register/login/me forms
        ├── events.js                  # Gallery, filters, and loading
        ├── organizer.js               # Create/edit/publish/delete/upload
        ├── member.js                  # Registration and my-registrations panel
        ├── detail.js                  # Event detail dialog
        └── main.js                    # UI orchestration
```

### Getting Started

1. Install dependencies from this directory (Node.js 20 or newer is required):

```bash
cd Workshop6/Examples/community-events-api
npm install
```

2. Create the dedicated PostgreSQL role and database. The role needs `CREATEDB` so Prisma can create the shadow database during development, and the database must be owned by that role:

```bash
sudo -i -u postgres psql
```

```sql
CREATE ROLE w6_events_user WITH LOGIN PASSWORD 'change_me' CREATEDB;
CREATE DATABASE w6_community_events OWNER w6_events_user;
```

Exit `psql` with `\q`.

3. Copy the environment template and generate a JWT secret:

```bash
cp .env.example .env
openssl rand -base64 32
```

4. Put the generated value into `.env`. These are the development values used by this example (replace the JWT secret with your generated string):

```dotenv
DATABASE_URL="postgresql://w6_events_user:change_me@localhost:5432/w6_community_events?schema=public"
JWT_SECRET="replace_with_the_value_from_openssl_rand_base64_32"
FRONTEND_ORIGIN=""
HOST="127.0.0.1"
PORT="3000"
NODE_ENV="development"
```

Leave `FRONTEND_ORIGIN` blank for the bundled `/app/` UI. Set it to `http://127.0.0.1:5173` only when calling this API from the separate Task 4 frontend.

5. Create the tables and generate the Prisma 7 client:

```bash
npx prisma migrate dev --name init_community_events
npx prisma generate
```

6. Start the API in watch mode:

```bash
npm run dev
```

7. Open the frontend at [http://127.0.0.1:3000/app/](http://127.0.0.1:3000/app/), or check the API at [http://127.0.0.1:3000/api/events](http://127.0.0.1:3000/api/events).

Uploaded cover files are written to `storage/event-covers/`, which is kept in Git with a `.gitkeep` file and ignored otherwise. The directory is created automatically if it is missing.

### Exploring the Example

#### Endpoint reference

All paths below are relative to `http://127.0.0.1:3000`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a `MEMBER` or `ORGANIZER` account |
| `POST` | `/api/auth/login` | Public | Exchange credentials for a 15-minute JWT |
| `GET` | `/api/auth/me` | Token | Read the current user profile |
| `GET` | `/api/events` | Public | List published events with `search`, `category`, `page`, and `limit` |
| `GET` | `/api/events/:eventId` | Public | Read a published event; organizer drafts appear in `/api/me/events` |
| `GET` | `/api/events/:eventId/cover` | Public/owner | Stream a cover image; drafts require the owner's token |
| `GET` | `/api/me/events` | Organizer token | List the signed-in organizer's own events |
| `POST` | `/api/events` | Organizer token | Create a `DRAFT` event owned by the token's user |
| `PATCH` | `/api/events/:eventId` | Owner token | Update fields including `status: 'PUBLISHED'` |
| `DELETE` | `/api/events/:eventId` | Owner token | Delete an event and its cover (`204`) |
| `PUT` | `/api/events/:eventId/cover` | Owner token | Upload a JPEG/PNG/WebP cover in the `cover` field (max 5 MB) |
| `DELETE` | `/api/events/:eventId/cover` | Owner token | Remove the cover (`204`) |
| `POST` | `/api/events/:eventId/registrations` | Token | Register for an event if capacity remains |
| `DELETE` | `/api/events/:eventId/registrations/me` | Token | Cancel the current user's registration (`204`) |
| `GET` | `/api/me/registrations` | Token | List the current user's registrations |

#### curl walkthrough

Set a base URL and register an organizer. The optional `role` field defaults to `MEMBER`, so it must be sent explicitly to create events:

```bash
BASE_URL=http://127.0.0.1:3000

curl -sS -X POST "$BASE_URL/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d '{
        "username": "riley_organizer",
        "email": "riley@example.com",
        "password": "a-long-demo-password",
        "role": "ORGANIZER"
    }'
```

Log in and capture the token:

```bash
curl -sS -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"riley@example.com","password":"a-long-demo-password"}'
```

Copy the returned `data.accessToken` value:

```bash
ORGANIZER_TOKEN='paste_the_token_here'

curl -sS "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN"
```

Create a draft event. Ownership comes from the token, never from the request body:

```bash
curl -sS -X POST "$BASE_URL/api/events" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{
        "title": "Riverside Cleanup",
        "description": "Join neighbours for a morning of litter picking and coffee.",
        "location": "Riverside Park",
        "startsAt": "2027-06-20T09:00:00.000Z",
        "capacity": 40,
        "category": "VOLUNTEER"
    }'
```

Copy the returned `data.event.id`, publish it, then browse and filter the public gallery:

```bash
EVENT_ID=1

curl -sS -X PATCH "$BASE_URL/api/events/$EVENT_ID" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"status":"PUBLISHED"}'

curl -sS "$BASE_URL/api/events?search=river&category=VOLUNTEER&page=1&limit=10"

curl -sS "$BASE_URL/api/events/$EVENT_ID"
```

Upload a private cover. The response contains a download URL that streams the file after ownership/visibility checks:

```bash
curl -sS -X PUT "$BASE_URL/api/events/$EVENT_ID/cover" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN" \
    -F 'cover=@/path/to/cover.jpg;type=image/jpeg'

curl -sS -o cover.jpg "$BASE_URL/api/events/$EVENT_ID/cover"
```

Register a member and reserve a place. A second registration for the same account returns `409`, and a full event also returns `409`:

```bash
curl -sS -X POST "$BASE_URL/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d '{
        "username": "sam_member",
        "email": "sam@example.com",
        "password": "a-long-demo-password"
    }'

curl -sS -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"sam@example.com","password":"a-long-demo-password"}'
```

```bash
MEMBER_TOKEN='paste_the_member_token_here'

curl -sS -X POST "$BASE_URL/api/events/$EVENT_ID/registrations" \
    -H "Authorization: Bearer $MEMBER_TOKEN"

curl -sS "$BASE_URL/api/me/registrations" \
    -H "Authorization: Bearer $MEMBER_TOKEN"

curl -sS -o /dev/null -w '%{http_code}\n' \
    -X DELETE "$BASE_URL/api/events/$EVENT_ID/registrations/me" \
    -H "Authorization: Bearer $MEMBER_TOKEN"
```

Finish the organizer flow by editing, removing the cover, and deleting the event. Successful `204` responses have no body:

```bash
curl -sS -X PATCH "$BASE_URL/api/events/$EVENT_ID" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"capacity":60,"description":"Updated description with more detail for attendees."}'

curl -sS -o /dev/null -w '%{http_code}\n' \
    -X DELETE "$BASE_URL/api/events/$EVENT_ID/cover" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN"

curl -sS -o /dev/null -w '%{http_code}\n' \
    -X DELETE "$BASE_URL/api/events/$EVENT_ID" \
    -H "Authorization: Bearer $ORGANIZER_TOKEN"
```

#### Frontend walkthrough

1. Open [http://127.0.0.1:3000/app/](http://127.0.0.1:3000/app/) and browse the public gallery. Search by title or location and filter by category; the gallery shows loading, empty, and error states.
2. Use **Register** and choose **Organizer** to create a dashboard account, or switch to **Log in** for an existing account. The active session is shown in the sidebar.
3. In **My events**, create a draft, then use **Edit** to set its details and **Publish** when it is ready. Only published events appear in the public gallery.
4. Use the cover control in the editor to upload a JPEG, PNG, or WebP image. Previews and detail covers are loaded through `fetch` with the Bearer token and rendered as object URLs, because a plain `<img src>` cannot send authorization headers.
5. Register a separate `MEMBER` account, choose **My registrations**, and register for a published event. Watch the remaining-places count decrease; cancel to release the place.
6. Open any event card to see the accessible detail dialog with the full description, date, location, capacity, and registration/ownership actions. Toasts confirm successful operations and API errors appear inline next to the relevant form.

### Workshop Objective

This example brings together the complete Workshop 6 backend and frontend toolchain: resource-oriented endpoints, strict validation, JWT identity, role and ownership enforcement, Prisma transactions, private media, and an accessible Fetch-driven UI. Study the flow from `routes/` through `services/` to `public/js/` to see how one domain model is exposed consistently to API clients and browser users while keeping authorization, validation, and error handling centralized on the server.
