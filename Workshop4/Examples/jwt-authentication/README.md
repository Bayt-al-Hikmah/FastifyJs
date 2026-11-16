# JWT Authentication (Workshop 4 Example)

This example is a small, complete **authentication API** built with Fastify. Users register with an email and password, the password is hashed with Argon2id before it reaches PostgreSQL, login returns a signed JWT, and a protected endpoint verifies that token before returning the current user.

The project is a JSON API rather than a rendered website. It focuses on the pieces that make token authentication safe: password hashing, a strong signing secret, short token lifetimes, database-backed identity checks, rate limits, and responses that never include password hashes.

### What You'll Learn

- **Argon2id:** Hash passwords with a memory-hard algorithm and a unique salt.
- **Registration:** Validate input, normalize email, hash the password, and store a safe subset of the user.
- **Login:** Compare a submitted password with the stored hash and issue a JWT.
- **JWT signing:** Sign an HS256 token with a `sub` claim and a 15-minute expiry.
- **`@fastify/jwt`:** Verify bearer tokens and expose the decoded payload.
- **Authentication hook:** Decorate Fastify with a reusable `authenticate` pre-handler.
- **Fresh identity:** Load the current user from PostgreSQL on every authenticated request.
- **Rate limiting:** Limit registration and login attempts per route.
- **Timing-aware login:** Perform a dummy hash check for unknown accounts.
- **Safe responses:** Return public user fields and never the password hash.
- **JSON Schema responses:** Constrain what leaves the API, not just what enters it.

### Project Structure

```text
jwt-authentication/
├── prisma/
│   └── schema.prisma            # User + Role enum
├── src/
│   ├── lib/
│   │   ├── password.ts          # Argon2id hash and verify
│   │   └── prisma-errors.ts     # P2002 detection
│   ├── plugins/
│   │   ├── auth.ts              # JWT, authenticate, authorize
│   │   └── prisma.ts            # PrismaClient + PostgreSQL adapter
│   ├── routes/
│   │   ├── auth.ts              # /register, /login, /me
│   │   └── protected.ts         # /profile
│   ├── types/
│   │   ├── auth.ts
│   │   ├── fastify.d.ts
│   │   └── fastify-jwt.d.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
├── prisma7.config.ts
└── tsconfig.json
```

### Prerequisites

- Node.js 20 or newer.
- PostgreSQL 14 or newer on `localhost:5432`.
- `openssl` (or another way to generate a random secret).

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database**

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE w4_jwt_authentication_user
WITH LOGIN PASSWORD 'change_me';

CREATE DATABASE w4_jwt_authentication
OWNER w4_jwt_authentication_user;

\q
```

**3. Configure the Environment**

```bash
cp .env.example .env
```

Generate a secret and put it in `.env`:

```bash
openssl rand -base64 32
```

```env
DATABASE_URL="postgresql://w4_jwt_authentication_user:change_me@localhost:5432/w4_jwt_authentication?schema=public"
JWT_SECRET="paste-the-generated-value-here"
```

The auth plugin refuses to start if `JWT_SECRET` is missing or shorter than 32 bytes.

**4. Create the Table and Generate Prisma Client**

The example has a schema but no committed migration yet, so create the first migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Start the API**

```bash
npm run dev
```

The API listens on `http://127.0.0.1:3000` by default.

### Endpoints

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | 3 per hour | Create an account |
| `POST` | `/api/auth/login` | No | 5 per minute | Return a bearer token |
| `GET` | `/api/auth/me` | Bearer | — | Return the current user |
| `GET` | `/api/protected/profile` | Bearer | — | Example protected resource |

### Trying It with curl

Register a user. Passwords must be 15–128 characters:

```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/register \
    -H 'content-type: application/json' \
    -d '{
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "correct-horse-battery-staple"
    }'
```

Log in and keep the token. This example uses `jq`; you can also copy the value by hand:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'content-type: application/json' \
    -d '{
        "email": "ada@example.com",
        "password": "correct-horse-battery-staple"
    }' | jq -r '.accessToken')
```

Call an authenticated route:

```bash
curl -i http://127.0.0.1:3000/api/auth/me \
    -H "authorization: Bearer $TOKEN"

curl -i http://127.0.0.1:3000/api/protected/profile \
    -H "authorization: Bearer $TOKEN"
```

Try the failure paths:

```bash
# Missing token → 401 + WWW-Authenticate: Bearer
curl -i http://127.0.0.1:3000/api/protected/profile

# Wrong password → 401
curl -i -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'content-type: application/json' \
    -d '{"email":"ada@example.com","password":"wrong-password"}'

# Duplicate email → 409
curl -i -X POST http://127.0.0.1:3000/api/auth/register \
    -H 'content-type: application/json' \
    -d '{
        "name": "Ada Again",
        "email": "ada@example.com",
        "password": "another-long-password"
    }'
```

### Exploring the Example

| Try this | What to notice |
|---|---|
| Register successfully | The response contains public user fields, never `passwordHash`. |
| Inspect the database | Run `npx prisma studio`; only the Argon2id hash is stored. |
| Register the same email twice | Prisma `P2002` becomes a `409` with a friendly message. |
| Log in with a wrong password | The response is the same `401` as an unknown email. |
| Decode the JWT | The payload contains `sub` and timing claims; authorization data is loaded from the database. |
| Reuse the token | It works until the 15-minute expiry. |
| Delete the user, then reuse the token | `authenticate` finds no row and rejects the token with `401`. |
| Exceed login attempts | The route returns `429` until the one-minute window resets. |
| Send an unknown body field | JSON Schema rejects it with `400`. |

### Design Notes

- **Only the user ID travels in the token.** Name, email, and role are re-read from PostgreSQL, so a stale token cannot preserve an outdated role.
- **The password never leaves the server.** Registration hashes before `prisma.user.create()`.
- **A dummy hash protects timing.** Unknown emails still perform an Argon2id verification.
- **Secrets are validated at startup.** A weak or missing `JWT_SECRET` is a hard failure, not a warning.
- **Rate limiting is per route.** Global rate limiting is disabled; only the sensitive auth routes opt in.

### Workshop Objective

By the end of this example, you should understand the full registration and login cycle, why passwords are hashed with Argon2id, how a JWT is issued and verified, and why an authenticated request should still consult the database before trusting an identity.
