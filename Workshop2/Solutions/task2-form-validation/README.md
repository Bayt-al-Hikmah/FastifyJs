# Form Validation (Workshop 2 Task 2 Solution)

This solution takes the contact-form idea from Task 1 and reworks it around **JSON Schema validation** and **CSRF protection**. Visitors pitch a story to **The Margin**, a fictional independent magazine. Fastify validates the submitted fields declaratively, trims input before validation, verifies a signed CSRF token, stores valid pitches in memory, and redirects with the Post/Redirect/Get pattern.

The interface is a warm, editorial design with preserved input, per-field schema errors, a success notice, a queue of recent pitches with masked email addresses, and a styled `403` page for blocked submissions.

### What You'll Learn

- **JSON Schema:** Describe required fields, types, lengths, patterns, and forbidden extra properties in one place.
- **Content-type schemas:** Validate `application/x-www-form-urlencoded` and `application/json` bodies with the same schema.
- **`attachValidation`:** Keep schema errors in `request.validationError` so the route can render HTML instead of JSON.
- **`allErrors`:** Configure Ajv to report every invalid field, not just the first one.
- **`preValidation`:** Normalize values before the schema runs, so whitespace-only text cannot slip through.
- **Per-field error mapping:** Turn Ajv issue paths into messages beside the matching inputs.
- **CSRF protection:** Generate a token with `reply.generateCsrf()` and verify it with `fastify.csrfProtection`.
- **Cookies:** Let `@fastify/cookie` hold the CSRF secret for the browser session.
- **Correct hook order:** Parse the body, trim it, validate it, then check the token in `preHandler`.
- **Status codes:** Return `400` for schema failures, `403` for invalid tokens, and `303` after success.

### Project Structure

```text
task2-form-validation/
├── src/
│   ├── lib/
│   │   └── pitch-store.ts        # Pitches, masking, and view models
│   ├── plugins/
│   │   ├── pitch-store.ts        # Decorates Fastify with the store
│   │   ├── security.ts           # Cookies + CSRF protection
│   │   ├── static.ts             # Serves public/ at /static/
│   │   └── views.ts              # Handlebars layout and partials
│   ├── routes/
│   │   └── pitch.ts              # Schema, GET /, and POST /
│   ├── app.ts                    # Builds the application and error pages
│   └── server.ts                 # Starts the server
├── views/
│   ├── layouts/main.hbs
│   ├── partials/
│   │   ├── footer.hbs
│   │   ├── navbar.hbs
│   │   └── pitch-row.hbs
│   ├── error.hbs
│   ├── forbidden.hbs
│   ├── index.hbs
│   └── not-found.hbs
├── public/
│   ├── css/style.css
│   └── images/logo.svg
├── package.json
└── tsconfig.json
```

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Run the Application**

```bash
npm run dev
```

**3. Open the Form**

Visit:

```text
http://127.0.0.1:3000
```

The other scripts are useful for checking and building the project:

```bash
npm run typecheck
npm run build
npm start
```

If port `3000` is busy, set another one:

```bash
PORT=3100 npm run dev
```

### Exploring the Solution

| Step | What to Explore |
|---|---|
| View page source | The hidden `_csrf` input contains a signed token, and the response sets an HttpOnly `_csrf` cookie. |
| Submit an empty form | Ajv reports every required field because the app enables `allErrors`. |
| Enter only spaces | `preValidation` trims the body first, so whitespace-only values fail the length rules. |
| Enter `Al` and `not-an-email` | Both field-specific messages appear together instead of one generic JSON error. |
| Submit a valid pitch | The pitch is stored in memory and the browser is redirected to `/?submitted=1`. |
| Refresh the confirmation | The pitch is not sent twice because the POST already redirected. |
| Send JSON to `POST /` | The same schema and token check apply to `application/json`. |
| Post without `_csrf` | The CSRF hook rejects the request with a styled `403` page before storage. |
| Change the hidden token | The token no longer matches the cookie secret, so the request is blocked. |
| Restart the server | In-memory pitches and the CSRF secret reset, demonstrating why sessions need durable storage. |

You can also test the form without a browser. First load the page and keep its cookie:

```bash
curl -c cookies.txt http://127.0.0.1:3000/ -o page.html
```

Extract the token from the rendered hidden field and submit it with the same cookie jar:

```bash
TOKEN=$(grep -o 'name="_csrf" value="[^"]*"' page.html | sed 's/.*value="//;s/"//')

curl -i -b cookies.txt -X POST http://127.0.0.1:3000/ \
    --data-urlencode "_csrf=$TOKEN" \
    --data-urlencode "name=Ada Lovelace" \
    --data-urlencode "email=ada@example.com" \
    --data-urlencode "subject=The last letterpress" \
    --data-urlencode "message=Could we discuss a photo essay about the workshop?"
```

Now try the same POST without `_csrf`, or without `cookies.txt`. The response is `403 Forbidden` and no pitch is stored.

### How the Request Flows

```text
POST /
  │
  ├─ @fastify/formbody          parse URL-encoded fields
  ├─ preValidation              trim name, email, subject, message
  ├─ JSON Schema validation     record issues in request.validationError
  ├─ preHandler                 verify _csrf against the cookie secret
  └─ handler
       ├─ invalid schema  → 400 + form with per-field messages
       ├─ invalid token   → 403 + styled security page
       └─ valid           → store pitch, redirect 303
```

The order matters. The token lives in the body, so it can only be checked after parsing. Trimming must happen before validation so that length rules apply to normalized text. Validation runs before the CSRF hook, and `attachValidation` lets the handler decide how to present schema failures.

### Workshop Objective

By the end of this solution, you should be able to replace hand-written field checks with a declarative JSON Schema, keep validation friendly in a server-rendered page, and explain why a valid form body is not enough without a matching CSRF token.
