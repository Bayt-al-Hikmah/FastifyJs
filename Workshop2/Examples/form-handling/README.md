# Form Handling (Workshop 2 Example)

This example is a complete **server-rendered guestbook** that focuses on one question: what actually happens when a browser submits an HTML form? It uses Fastify, TypeScript, Handlebars, and `@fastify/formbody` to parse an `application/x-www-form-urlencoded` body, validate it by hand, store valid entries in memory, and redirect with Post/Redirect/Get.

The design is a warm, paper-like guestbook for an open studio. A short explanation panel tracks each step of the request from browser to server, and recent entries appear below the form with their original messages and signing times.

### What You'll Learn

- **HTML form submission:** Send a `POST` request without JavaScript using the browser's built-in form behavior.
- **`@fastify/formbody`:** Register a parser for `application/x-www-form-urlencoded` so fields appear in `request.body`.
- **Manual validation:** Trim values and collect a separate error for each field.
- **Preserved input:** Re-render the form with what the visitor typed after a failed submission.
- **Post/Redirect/Get:** Redirect with `303` after success so refreshing cannot add the same note twice.
- **In-memory storage:** Keep entries in a small class that lives as long as the server process.
- **View models:** Convert stored records into display-friendly shapes before rendering.
- **Handlebars layout and partials:** Share the header and footer, and reuse a card partial for each entry.
- **Static assets:** Serve the stylesheet and logo from `public/` under `/static/`.
- **HTML escaping:** Rely on Handlebars double braces to escape user-submitted text.

### Project Structure

```text
form-handling/
├── src/
│   ├── lib/
│   │   └── message-store.ts      # Entries, dates, and view models
│   ├── plugins/
│   │   ├── message-store.ts      # Decorates Fastify with the store
│   │   ├── static.ts             # Serves public/ at /static/
│   │   └── views.ts              # Handlebars layout and partials
│   ├── routes/
│   │   └── guestbook.ts          # GET / and POST /
│   ├── app.ts                    # Builds the application
│   └── server.ts                 # Starts the server
├── views/
│   ├── layouts/main.hbs
│   ├── partials/
│   │   ├── footer.hbs
│   │   ├── message-card.hbs
│   │   └── navbar.hbs
│   ├── error.hbs
│   ├── index.hbs
│   └── not-found.hbs
├── public/
│   ├── css/style.css
│   └── images/mark.svg
├── package.json
└── tsconfig.json
```

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Start the Development Server**

```bash
npm run dev
```

**3. Open the Guestbook**

Visit:

```text
http://127.0.0.1:3000
```

To run on a different port:

```bash
PORT=3100 npm run dev
```

The remaining scripts check and build the project:

```bash
npm run typecheck
npm run build
npm start
```

### Exploring the Example

| Try this | What to notice |
|---|---|
| Sign with a valid name and note | The entry is stored and the browser is redirected to `/?submitted=1`. |
| Refresh after signing | No duplicate appears, because the POST redirected instead of rendering directly. |
| Submit a two-letter name | A field error appears and the note you typed is preserved. |
| Submit only spaces | The server trims the values first, so the entry is rejected. |
| Submit a note over 200 characters | The extended `maxlength` blocks it in the browser; a direct request is still rejected on the server. |
| Inspect the form in DevTools | The body is sent as URL-encoded key/value pairs, not JSON. |
| Use `curl` with invalid data | The server responds with `400` and renders the same HTML form. |
| Visit an unknown URL | A styled `404` page is returned. |
| Restart the server | Seed entries return because the store is in memory only. |

You can submit without a browser:

```bash
curl -i -X POST http://127.0.0.1:3000/ \
    --data-urlencode "name=Ada Lovelace" \
    --data-urlencode "message=The letterpress demo was worth the trip."
```

The response is a `303 See Other` with a `Location: /?submitted=1` header. Send a short name instead to see a `400` response with the rendered form.

### Where to Look Next

This example deliberately validates by hand so the flow stays visible. The Workshop 2 solutions show the next steps:

- `Solutions/task1-contact-form` expands manual validation into a four-field form.
- `Solutions/task2-form-validation` replaces the checks with JSON Schema and adds CSRF protection.

### Workshop Objective

By the end of this example, you should be able to trace a browser form from the HTML element, through URL encoding and Fastify's body parser, into validated application data, and back to a rendered page or redirect.
