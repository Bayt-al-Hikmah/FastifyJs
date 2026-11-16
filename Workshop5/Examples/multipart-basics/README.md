# Multipart Basics (Workshop 5 Example)

This example introduces the smallest useful secure upload flow in Fastify. It
renders a server-side page with Handlebars, accepts exactly one file through
`@fastify/multipart`, validates the file against a strict allowlist, and stores
the binary content on the local filesystem while keeping metadata in memory.

The goal is to separate three ideas that are often mixed together: parsing the
multipart request, deciding whether the content is acceptable, and deciding
where the content is allowed to live. The route does all three in order, and it
never trusts the extension or MIME type supplied by the browser on its own.

There is no database in this project. Restarting the server clears the metadata
list, which keeps the focus on the upload lifecycle and the security checks.
The stored objects remain under `var/uploads`, outside the public web root.

### What You'll Learn

- **Parse one multipart file with Fastify.** Use `request.file()` and inspect
  `filename`, `mimetype`, `fieldname`, and the readable stream.
- **Apply limits at the parser and the handler.** The multipart plugin caps each
  file at 2 MB, and the route checks the stream's truncated flag and the stored
  file size.
- **Validate content rather than claims.** Check the extension allowlist, use
  `file-type` to read binary signatures, and compare the detected MIME type with
  the declared type.
- **Generate server-controlled storage keys.** Save every object under a random
  UUID, so the original filename can never influence a filesystem path.
- **Keep uploads private.** Store content in `var/uploads` and serve it only through a download route with `Content-Disposition`, `nosniff`, and no-store cache headers.
- **Clean up after failure.** Remove partial staging files and orphaned objects when validation, streaming, or persistence fails.
- **Give feedback without exposing internals.** Redirect back to the page with a short error code and map it to a safe message in the view.

### Project Structure

- `src/app.ts` — application assembly, multipart limits, 404 and error views.
- `src/server.ts` — starts the Fastify server on `127.0.0.1:3000`.
- `src/config/uploads.ts` — size limit, storage paths, and the type allowlist.
- `src/lib/file-validation.ts` — filename sanitising, signature checks, and the
  plain-text exception.
- `src/lib/upload-store.ts` — in-memory metadata, view models, and byte
  formatting.
- `src/lib/upload-errors.ts` — typed rejection codes and user-facing messages.
- `src/plugins/views.ts` — Handlebars layout and partial registration.
- `src/plugins/static.ts` — serves only `public/` under `/static/`.
- `src/routes/home.ts` — renders the cabinet page and feedback messages.
- `src/routes/files.ts` — upload, download, and delete routes.
- `views/` — layout, page, error, and partial templates.
- `public/css/style.css` — the complete File Cabinet visual design.
- `public/js/upload.js` — file selection and drag/drop feedback.
- `var/uploads/` — created at runtime for staging and stored objects.

### Getting Started

1. Install the dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open <http://127.0.0.1:3000> in a browser. The cabinet starts empty.

4. Upload a PNG, JPEG, PDF, or TXT file smaller than 2 MB. The new file appears in the cabinet with its detected MIME type, size, and creation time.

5. Stop the server with `Ctrl+C`. The `var/uploads` directory remains on disk; delete it if you want a completely clean filesystem for the next run:

```bash
rm -rf var/uploads
```

### Exploring the Example

| Step | What to try | What to notice |
|---|---|---|
| 1 | Submit the form with a small PNG or JPEG. | The page redirects with a success flash and the file appears in the cabinet. |
| 2 | Download the file again. | The response is produced by the download route, not directly by a static file server. |
| 3 | Rename a PDF to `notes.txt` and upload it. | Signature detection notices the binary content and rejects the file. |
| 4 | Upload a `.zip`, `.svg`, or `.exe` file. | The extension allowlist rejects it before it is stored. |
| 5 | Create a 3 MB file and upload it. | The parser truncates the stream at 2 MB and the route returns the `too-large` feedback. |
| 6 | Delete a file from the cabinet. | The metadata entry and the stored object are both removed. |
| 7 | Request a random UUID under `/files/<uuid>/download`. | The not-found view is returned instead of a filesystem error. |

The upload route can also be exercised directly. The multipart field must be
named `file`:

```bash
curl -i -X POST http://127.0.0.1:3000/upload \
    -F "file=@./screenshot.png"
```

`curl -i` shows the `303 See Other` redirect and the feedback code in the `Location` header. A successful upload redirects to `/?notice=uploaded`; a
rejected upload redirects to a URL such as `/?error=too-large`.

Try an invalid file and an oversized file:

```bash
printf 'This is not a PDF.' > fake.pdf

curl -i -X POST http://127.0.0.1:3000/upload \
    -F "file=@./fake.pdf;type=application/pdf"

truncate -s 3M oversized.png

curl -i -X POST http://127.0.0.1:3000/upload \
    -F "file=@./oversized.png;type=image/png"
```

#### Allowed types and checks:

| Extension | Detected MIME type | Validation |
|---|---|---|
| `.png` | `image/png` | Signature must match PNG; declared type must agree or be `application/octet-stream`. |
| `.jpg`, `.jpeg` | `image/jpeg` | Signature must match JPEG; declared type must agree or be generic. |
| `.pdf` | `application/pdf` | Signature must start with a PDF header and match the declared type. |
| `.txt` | `text/plain` | Must have no binary signature, contain no NUL bytes, and decode as valid UTF-8. |

Files are rejected with a `303` redirect back to the page so the browser can show a safe message. The underlying rejection reasons are kept in `src/lib/upload-errors.ts`; the raw client filename and filesystem path are never placed into a response header.

### Workshop Objective

The objective of this example is to practise the first secure upload workflow in the workshop: receive one multipart stream, enforce a hard size limit, verify the actual file format, generate a storage identifier on the server, and expose the content only through a controlled download route. Once this pipeline feels natural, the streaming example adds metering and hashing without changing the  security model, and the task attachment project adds authentication, ownership, and PostgreSQL metadata.
