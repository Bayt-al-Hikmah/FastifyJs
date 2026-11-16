# Contact Form (Workshop 2 Task 1 Solution)

This solution builds a complete **server-rendered contact form** with Fastify, TypeScript, Handlebars, and `@fastify/formbody`. Visitors submit a name, email address, subject, and message; the server trims every value, validates it by hand, stores valid inquiries in memory, and redirects with the Post/Redirect/Get pattern.

The visual design is a small print studio called **Northwind**. The form includes inline errors, preserved input, a success notice, recent inquiries with masked email addresses, and a short explanation of the server-side flow.

### What You'll Learn

- **HTML forms:** Submit an `application/x-www-form-urlencoded` body with the `POST` method.
- **`@fastify/formbody`:** Parse encoded fields into `request.body`.
- **Manual validation:** Trim values and collect per-field errors in one object.
- **Preserving input:** Re-render the form with the values the visitor typed.
- **Post/Redirect/Get:** Redirect with `303` after a successful submission so refreshing cannot resend it.
- **In-memory store:** Keep inquiries in a small class while the server runs.
- **Server-rendered UI:** Use a shared layout, partials, and a page-specific template.
- **Static assets:** Serve CSS and the logo from `public/` at `/static/`.
- **Status codes:** Return `400` for invalid input and `404` for unknown pages.
- **Accessible feedback:** Connect labels, hints, errors, and `aria-invalid` attributes.

### Project Structure

```text
task1-contact-form/
├── src/
│   ├── lib/
│   │   └── contact-store.ts      # Inquiries, masking, and view models
│   ├── plugins/
│   │   ├── contact-store.ts      # Decorates Fastify with the store
│   │   ├── static.ts             # Serves public/ at /static/
│   │   └── views.ts              # Handlebars layout and partials
│   ├── routes/
│   │   └── contact.ts            # GET / and POST /
│   ├── app.ts                    # Builds the application
│   └── server.ts                 # Starts the server
├── views/
│   ├── layouts/main.hbs
│   ├── partials/
│   │   ├── footer.hbs
│   │   ├── inquiry-row.hbs
│   │   └── navbar.hbs
│   ├── error.hbs
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

### Exploring the Solution

| Step | What to Explore |
|---|---|
| Submit an empty form | Every field returns a clear validation error and the page keeps its values. |
| Enter only spaces | The server trims the values first, so whitespace-only input is rejected. |
| Enter an invalid email | The email check rejects addresses without a local part, `@`, or domain. |
| Submit a valid note | The inquiry is stored in memory and the browser is redirected to `/?submitted=1`. |
| Refresh the confirmation page | The note is not submitted twice because the POST already redirected. |
| Inspect recent notes | The newest inquiries appear with masked email addresses and a short preview. |
| Restart the server | In-memory inquiries reset, demonstrating why databases matter. |
| Visit an unknown path | A styled `404` page is rendered instead of a raw Fastify error. |

You can also test the form without a browser:

```bash
curl -i -X POST http://127.0.0.1:3000/ \
    --data-urlencode "name=Ada Lovelace" \
    --data-urlencode "email=ada@example.com" \
    --data-urlencode "subject=A book about algorithms" \
    --data-urlencode "message=Could we discuss a small print run next month?"
```

### Workshop Objective

By the end of this solution, you should understand how a browser form becomes structured data on the server, how to validate that data safely, and how to render useful feedback without losing the visitor's work.
