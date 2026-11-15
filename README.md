# Backend Development with Fastify

A 6-part, hands-on backend development course in this repository. The workshops use **Node.js, Fastify, TypeScript, PostgreSQL, and Prisma ORM** to move from backend fundamentals to secure, database-driven applications and REST APIs. Each workshop includes a lesson (`WorkshopX.md`), runnable **Examples**, and **Solutions** with short READMEs explaining what each project demonstrates, its structure, and how to run it.

## Prerequisites

- **Frontend basics (HTML/CSS/JavaScript)**: https://github.com/Bayt-al-Hikmah/Front_End
- **JavaScript / Node.js basics**: https://github.com/Bayt-al-Hikmah/Nodejs
- **TypeScript fundamentals**: https://www.typescriptlang.org/docs/
- **SQL & databases**: https://github.com/Bayt-al-Hikmah/SQL
- **Local setup**: Node.js/npm, PostgreSQL, Git, and an API client such as `curl`, Postman, or Thunder Client.

You do not need prior Fastify or Prisma experience. The workshops introduce the relevant backend concepts as they are needed.

## Repository Structure

```text
.
├── README.md
├── Workshop1/  # Backend fundamentals and Fastify
├── Workshop2/  # Server-rendered pages, static files, and forms
├── Workshop3/  # PostgreSQL, Prisma ORM, and CRUD
├── Workshop4/  # Authentication, authorization, and lifecycle hooks
├── Workshop5/  # Secure file uploads and file management
└── Workshop6/  # REST APIs and frontend integration
```

Each `WorkshopX/` contains:
- `WorkshopX.md` — lecture, implementation walkthrough, and tasks
- `Examples/` — focused examples for the concepts introduced in the workshop
- `Solutions/` — completed exercises and practical projects
- Each example/solution has a `README.md` describing its purpose, structure, and run instructions

## Workshops

| # | Topic | Key concepts | Examples | Solutions |
|---|---|---|---|---|
| 1 | Backend fundamentals with Fastify | Client-server architecture, HTTP requests and responses, Fastify setup, routing, route parameters, query strings, hooks, plugins, and TypeScript | `hello-fastify`, `routes-and-parameters`, `request-lifecycle` | `task1-user-api`, `task2-product-api`, `task3-request-logger` |
| 2 | Server-rendered pages and forms | HTML templates, dynamic pages, static assets, form handling, request validation, and browser-server interaction | `dynamic-pages`, `static-assets`, `form-handling` | `quote-sharing-app`, `task1-contact-form`, `task2-form-validation` |
| 3 | PostgreSQL, Prisma, and CRUD | Relational data modelling, Prisma 7 setup, PostgreSQL driver adapter, schema and migrations, relations, CRUD, filtering, and database-backed applications | `prisma-basics`, `quotes-crud-app` | `task1-categories`, `task2-search-and-filtering`, `task3-pagination`, `final-quote-sharing-app` |
| 4 | Authentication, authorization, and lifecycle hooks | Argon2id, registration and login, JWT, Fastify hooks and encapsulation, RBAC, protected routes, and resource ownership | `jwt-authentication`, `password-hashing`, `protected-task-api` | `task1-user-management`, `task2-rbac`, `task3-task-assignment`, `task4-fastify-hooks` |
| 5 | Secure file uploads and file management | `multipart/form-data`, Node.js streams, `@fastify/multipart`, file-size limits, signature detection, private storage, metadata, authenticated downloads, and cleanup | `multipart-basics`, `streaming-uploads`, `task-attachments` | `task1-multiple-attachments`, `task2-storage-quotas`, `task3-image-thumbnails`, `task4-antivirus-scanning`, `task5-object-storage` |
| 6 | REST APIs and frontend integration | REST principles, resources, HTTP methods and status codes, JSON responses, validation, routes/controllers/services, JWT, Fetch API, DOM updates, `FormData`, CORS, and rate limiting | `rest-api-basics`, `community-events-api`, `fetch-client` | `task1-equipment-catalogue-api`, `task2-pet-adoption-api`, `task3-learning-resource-api`, `final-api-project` |

## How to Use

1. Follow the workshops in order; each workshop builds on concepts introduced earlier.
2. Read `WorkshopX/WorkshopX.md`, run the examples, then complete the tasks and compare your work with the solutions.
3. For database projects, configure `.env`, create the PostgreSQL database, and apply Prisma migrations before starting the application. A typical Prisma development workflow is:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Use the commands and environment variables documented in each project's README. Do not assume every workshop uses the same database, port, or `.env` configuration.
5. Test backend endpoints independently of the frontend using `curl`, Postman, or Thunder Client.
6. Read each workshop's **References** section for official documentation and further study.

## Technology Stack

- **Node.js** — JavaScript runtime
- **TypeScript** — static typing
- **Fastify 5** — backend framework
- **PostgreSQL** — relational database
- **Prisma ORM 7** — schema management, migrations, and database access
- **Argon2id** — password hashing
- **JWT** — token-based authentication
- **Fastify plugins** — multipart uploads, CORS, rate limiting, and static assets
- **Fetch API** — browser-to-API communication

Use package versions compatible with Fastify 5 and Prisma 7. Check the official plugin compatibility notes and security advisories before upgrading or installing older examples.

## Security Practices

The course emphasizes practical backend security throughout the workshops:

- Validate all client input on the server; TypeScript types alone do not validate HTTP requests at runtime.
- Hash passwords with a dedicated password-hashing algorithm such as Argon2id.
- Keep secrets and credentials in environment variables; never commit `.env` files.
- Enforce authentication and resource-level authorization on the backend.
- Do not trust client-supplied owner IDs, filenames, MIME types, or storage paths.
- Apply upload limits, inspect file content, and keep private uploads outside publicly served directories.
- Use HTTPS in production and configure CORS for trusted browser origins only.
- Apply rate limiting to sensitive and resource-intensive endpoints.
- Avoid exposing stack traces, database errors, password hashes, tokens, or internal storage paths in API responses.

Happy coding.