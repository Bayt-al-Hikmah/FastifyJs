# Eventide Frontend Integration (Workshop 6 Solution)

Eventide is a polished, framework-free browser dashboard that consumes the **Community Events API** from `Workshop6/Examples/community-events-api`. It is a frontend-only solution to Task 4: every bullet is implemented with plain HTML, CSS, and ES modules, and every data change is applied to the DOM without page navigation. Because the UI runs on port `5173` and the API runs on port `3000`, the project is also a practical demonstration of Cross-Origin Resource Sharing (CORS) with a JWT Bearer token.

There is no backend, no package installation, and no build step in this folder. A small zero-dependency Node static server does nothing more than serve `public/` correctly.

### What You'll Learn

- **Fetch API**: retrieve resources with `fetch()`, inspect `response.ok`, and parse JSON safely.
- **Reusable API helper**: centralise Bearer tokens, JSON headers, `204` handling, and error normalisation in `api.js`.
- **DOM rendering**: build accessible cards and lists with `document.createElement` and `textContent`, never untrusted `innerHTML`.
- **Create forms**: send JSON from a real form and refresh only the affected regions after a successful response.
- **Validation errors**: turn the API's `errors: [{ field, message }]` array into readable messages and field highlights.
- **Search and filtering**: debounce a search box and combine it with a category filter and an "own events" scope.
- **Authenticated updates**: PATCH your own events, publish/unpublish them, and see the gallery update immediately.
- **Authenticated deletion**: DELETE your own events with a confirmation step and in-place list refresh.
- **FormData uploads**: append a cover to `FormData` and let the browser set the multipart boundary — no manual `Content-Type`.
- **Private images**: fetch a protected image with the token and use an object URL, because a plain `<img src>` cannot send `Authorization`.
- **CORS**: understand origins, preflight requests, and why the API must allow `http://127.0.0.1:5173`.
- **In-memory tokens**: keep the access token out of `localStorage` and explain the refresh-on-reload trade-off.

### Project Structure

```text
task4-frontend-integration/
├── README.md                    # This guide
├── package.json                 # One "start" script, zero dependencies
├── server.mjs                   # Zero-dependency static server for public/ on port 5173
└── public/
    ├── index.html               # Semantic dashboard: gallery, auth, studio, edit panel, dialog
    ├── css/
    │   └── style.css            # Eventide theme: dark plum + coral, responsive, accessible
    └── js/
        ├── config.js            # API_BASE_URL with query/global/meta overrides
        ├── api.js               # apiRequest(), apiFetchBlob(), token state, error shape
        ├── ui.js                # Toasts, validation messages, buttons, date helpers
        ├── auth.js              # Register, login, logout, in-memory user state
        ├── events.js            # Fetch calls and all event-related DOM updates
        └── main.js              # Entry point: wires forms, tabs, filters, and auth changes
```

### Getting Started

This project has **no database and no npm dependencies**, so there is nothing to install here and no Prisma step to run in this folder. You do, however, need the Community Events API running first.

1. **Set up the API's database once.** In a separate terminal, prepare the dedicated PostgreSQL role and database used by `community-events-api`:

    ```bash
    sudo -i -u postgres psql
    ```

    ```sql
    CREATE ROLE w6_events_user WITH LOGIN PASSWORD 'change_me' CREATEDB;
    CREATE DATABASE w6_community_events OWNER w6_events_user;
    \q
    ```

    `change_me` is a demo-only password. Use something else for anything you keep.

2. **Start the Community Events API first.** From `Workshop6/Examples/community-events-api/`, create its `.env` (generate a secret with `openssl rand -base64 32`), run its migrations and generator, then start it. The critical value is `FRONTEND_ORIGIN` — it must be this UI's exact origin or the browser will block cross-origin reads:

    ```dotenv
    DATABASE_URL="postgresql://w6_events_user:change_me@127.0.0.1:5432/w6_community_events?schema=public"
    JWT_SECRET="replace-with-the-output-of-openssl-rand-base64-32"
    PORT=3000
    FRONTEND_ORIGIN=http://127.0.0.1:5173
    ```

    ```bash
    cd Workshop6/Examples/community-events-api
    npx prisma migrate dev --name init_community_events
    npx prisma generate
    npm run dev
    ```

    The API should now answer at `http://127.0.0.1:3000/api/events`. Follow that project's own README if you need more detail.

3. **Start the Eventide UI** from this folder. No `npm install` is required:

    ```bash
    cd Workshop6/Solutions/task4-frontend-integration
    npm start
    ```

    This runs `node server.mjs`, a tiny static server using only Node's built-in `http`, `fs`, and `path` modules.

4. **Open the dashboard** at <http://127.0.0.1:5173>. Register an account (choose the **Organiser** role), then create a draft, publish it, and upload a cover.

5. **Optional: point the UI at a different API.** The default is `http://127.0.0.1:3000`. Override it in priority order with:

    ```text
    http://127.0.0.1:5173/?apiBaseUrl=http://localhost:3000
    window.__EVENTIDE_CONFIG__ = { apiBaseUrl: 'http://localhost:3000' };
    <meta name="api-base-url" content="http://localhost:3000">
    ```

    If you change the port or hostname, update the API's `FRONTEND_ORIGIN` to match this page's origin as well.

### Exploring the Solution

The table maps every Task 4 bullet to a UI control and the endpoint it exercises.

| Task 4 requirement | Where to try it in Eventide | API call |
|---|---|---|
| Retrieve data with Fetch | Event explorer loads on page open and on **Refresh** | `GET /api/events` |
| Display data in the DOM | Event cards: title, description, date, location, capacity, organiser | response → `events.js` cards |
| Form for creating resources | **Organiser studio → Host an event** | `POST /api/events` |
| Display validation errors | Submit an empty or invalid form; messages appear under the form and fields get `aria-invalid` | `400` → `errors[]` |
| Searching and filtering | Search box (debounced), category select, **Published / My events** scope | `?search=&category=` and `/api/me/events` |
| Authenticated update | **Edit** on a card in My events, or **Edit event** in the dialog; **Publish / Move to drafts** | `PATCH /api/events/:id` |
| Authenticated delete | **Delete** in My events or in the detail dialog (with confirmation) | `DELETE /api/events/:id` |
| Image attachment via FormData | Open your event → **Cover image → Upload cover** | `PUT /api/events/:id/cover` |
| No navigation per operation | All of the above update cards, counters, lists, and toasts in place | — |

A few `curl` calls make the contract clear. Note that `curl` is **not** subject to CORS — the preflight check only happens in the browser, which is why `FRONTEND_ORIGIN` matters for this UI but not for these commands:

```bash
# Browse published events (the same request the explorer makes)
curl "http://127.0.0.1:3000/api/events?search=robotics&category=EDUCATION&limit=10"

# Register an organiser and keep the returned access token
curl -s -X POST "http://127.0.0.1:3000/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"RiveraEvents","email":"organiser@example.com","password":"a-long-example-password","role":"ORGANIZER"}'

curl -s -X POST "http://127.0.0.1:3000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"organiser@example.com","password":"a-long-example-password"}'

# Create a draft (replace TOKEN with data.accessToken from login)
curl -X POST "http://127.0.0.1:3000/api/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TOKEN" \
    -d '{"title":"Community Robotics Night","description":"A hands-on workshop.","location":"Civic Hall","startsAt":"2027-03-20T09:00:00.000Z","capacity":30,"category":"EDUCATION"}'

# Publish it, then upload a cover with multipart/form-data
curl -X PATCH "http://127.0.0.1:3000/api/events/1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TOKEN" \
    -d '{"status":"PUBLISHED"}'

curl -X PUT "http://127.0.0.1:3000/api/events/1/cover" \
    -H "Authorization: Bearer TOKEN" \
    -F "cover=@/path/to/cover.jpg"
```

Covers are private: the browser cannot attach a Bearer token to an `<img>` tag, so `apiFetchBlob()` requests `/api/events/:id/cover` with the token and assigns an object URL to the image. When you sign out, the cover disappears again.

The forms deliberately use `novalidate`. That is not an oversight: it forces requests to reach the API so students can see the API's JSON Schema validation errors rendered in the UI, exactly as required by Task 4.

### Workshop Objective

This solution shows that a fast, accessible frontend does not need a framework or a backend in its own repository. By keeping token handling, response parsing, and error normalisation in one small `api.js`, the rest of the app can focus on the user experience: fetching events, rendering them safely, surfacing validation feedback, and updating only what changed. Running the UI and API on separate origins makes CORS visible rather than hidden by a proxy, reinforcing how a browser client and a Fastify service cooperate in a real REST application.
