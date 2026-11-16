# Static Assets (Workshop 2 Example)

This example shows how a Fastify application serves **stylesheets and images** alongside server-rendered HTML. It renders a small design-studio page with Handlebars, then lets the browser fetch the CSS, logo, and illustration from a dedicated static route.

The point is the division of labour: Fastify renders the document, and `@fastify/static` delivers the files the document references.

### What You'll Learn

- **`@fastify/static`:** Serve a directory of files from a URL prefix.
- **A dedicated asset prefix:** Mount `public/` at `/assets/` so templates have predictable URLs.
- **Linking assets:** Reference the mounted paths from a layout with `<link>` and `<img>`.
- **MIME types:** Let the browser receive the correct `Content-Type` for CSS and SVG files.
- **SVG artwork:** Use lightweight, resolution-independent images in an interface.
- **Layouts and partials:** Keep the document shell in one place while pages provide only their content.
- **A polished result:** Combine a static asset pipeline with a consistent visual design.

### Project Structure

- `src/app.ts` — Builds the application and registers the view, static, and route plugins.
- `src/server.ts` — Starts the server on port `3000` (or `PORT`).
- `src/plugins/views.ts` — Configures Handlebars, the views directory, layout, and partials.
- `src/plugins/static.ts` — Serves `public/` at the `/assets/` prefix.
- `src/routes/home.ts` — Supplies the studio project data and renders the homepage.
- `views/layouts/main.hbs` — The document shell, including the stylesheet and favicon links.
- `views/partials/` — Navigation and footer partials.
- `views/index.hbs` — The studio homepage.
- `public/css/style.css` — The complete design system for the page.
- `public/images/` — The logo mark and the studio illustration.

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

| Page or Asset | URL | What to Explore |
|---|---|---|
| Studio homepage | `http://127.0.0.1:3000/` | A full page rendered by Handlebars with data from a route. |
| Stylesheet | `/assets/css/style.css` | A real CSS document served by `@fastify/static`. |
| Logo mark | `/assets/images/mark.svg` | The favicon and header mark. |
| Studio illustration | `/assets/images/studio.svg` | A larger image embedded in the hero section. |
| Missing asset | `/assets/images/missing.svg` | The static plugin's `404` response. |

Open the browser's **Network** panel and reload the page. You will see the HTML request followed by separate requests for the CSS and images. Those requests are handled by the static plugin, not by a route handler.

The static plugin is configured in `src/plugins/static.ts`:

```typescript
fastify.register(fastifyStatic, {
    root: resolve(process.cwd(), 'public'),
    prefix: '/assets/'
})
```

`root` is the directory on disk. `prefix` is the URL space it occupies. The file `public/css/style.css` therefore becomes available at `/assets/css/style.css`.

Templates never hard-code the filesystem path. They use the mounted URL:

```handlebars
<link rel="stylesheet" href="/assets/css/style.css">
```

Try changing the `prefix` to `/static/` and updating the template references. Both work; the important habit is to keep the mounted prefix and the template URLs in agreement.

Because the example starts the server from the project directory, `process.cwd()` resolves to the project root. Run `npm run dev` from inside `static-assets/`.

### Available Endpoints

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| GET | `/` | Render the studio homepage. | None |
| GET | `/assets/*` | Serve CSS, images, and the favicon. | None |

### Workshop Objective

By the end of this example, you should understand how `@fastify/static` maps a directory to a URL prefix, how a template references those URLs, and why serving assets separately from rendered HTML keeps a server-rendered application organised.
