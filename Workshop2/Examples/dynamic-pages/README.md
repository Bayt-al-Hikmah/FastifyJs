# Dynamic Pages (Workshop 2 Example)

This example introduces **server-side rendering with Handlebars** in a Fastify application. It renders a small notebook with a shared layout, reusable partials, conditional sections, and a loop over an in-memory list of notes.

Every page is generated on the server and delivered as complete HTML. There is no client-side framework and no build step for the templates.

### What You'll Learn

- **`@fastify/view`:** Register Handlebars as the template engine and render views with `reply.viewAsync()`.
- **Shared layouts:** Wrap every page in `views/layouts/main.hbs` so the document structure lives in one place.
- **Partials:** Reuse the navigation bar, footer, and note card with `{{> partialName}}`.
- **Dynamic values:** Pass route data into a template and display it with `{{value}}`.
- **Conditionals:** Use `{{#if}}` and `{{else}}` to hide or show sections.
- **Loops:** Use `{{#each}}` to render a collection, with an empty-state fallback.
- **HTML escaping:** Handlebars escapes normal expressions by default, protecting user content from XSS.
- **Route parameters:** Load an individual note through `/notes/:noteId` and render a `404` page when it does not exist.

### Project Structure

- `src/app.ts` — Builds the application, registers plugins and routes, and installs a `404` view handler.
- `src/server.ts` — Starts the server on port `3000`.
- `src/plugins/views.ts` — Configures Handlebars, the views directory, the layout, and partials.
- `src/plugins/static.ts` — Serves the stylesheet and logo from `public/` at `/static/`.
- `src/routes/home.ts` — Homepage and about page.
- `src/routes/notes.ts` — Individual note page and missing-note handling.
- `src/data/notes.ts` — The in-memory notes and view-model helpers.
- `views/` — Layout, partials, and page templates.
- `public/css/style.css` — The shared stylesheet.
- `public/images/logo.svg` — The notebook mark used in the header.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Run the Application**

```bash
npm run dev
```

The server starts at `http://127.0.0.1:3000`.

### Exploring the Example

| Page | URL | What to Explore |
|---|---|---|
| Homepage | `http://127.0.0.1:3000/` | Featured note, topic chips, and the `{{#each}}` note grid. |
| Note detail | `/notes/designing-for-calm` | Route parameters and a body rendered from an array of paragraphs. |
| About | `/about` | A page that explains the rendering features in use. |
| Missing note | `/notes/does-not-exist` | The `404` view rendered by the route handler. |
| Missing page | `/nope` | The application-level `setNotFoundHandler`. |
| Stylesheet | `/static/css/style.css` | Static assets served by `@fastify/static`. |

The homepage displays the total note count, topic count, and reading time. These values are prepared in the route handler; the template only formats them.

The note card is a partial:

```handlebars
{{> note-card}}
```

Inside a `{{#each notes}}` block, the partial receives the current note as its context. This keeps the card markup out of the page template and makes it reusable.

The layout is applied automatically because `views.ts` sets:

```typescript
layout: 'layouts/main.hbs'
```

A page template only contains the content for the `<main>` element. It must not repeat the `<html>`, `<head>`, navigation, or footer markup.

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | Render the notebook homepage. | None |
| GET | `/about` | Render an explanation page. | None |
| GET | `/notes/:noteId` | Render one note or a `404` page. | None |
| GET | `/static/*` | Serve CSS and images. | None |

### Workshop Objective

By the end of this example, you should understand how Fastify passes data to a template engine, how layouts and partials remove repeated HTML, and how Handlebars conditionals and loops turn a JavaScript collection into a complete page.
