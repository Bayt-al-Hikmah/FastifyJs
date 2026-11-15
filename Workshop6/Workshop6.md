# Workshop 6: Building REST APIs with Fastify and TypeScript

## Objectives

In this workshop, we will learn how to:

- Understand the shift from server-side rendering to API-driven applications.
- Understand APIs, REST principles, resources, endpoints, and HTTP methods.
- Design consistent JSON responses and use appropriate HTTP status codes.
- Understand REST constraints, including stateless communication and client-server separation.
- Build REST-style API endpoints using Fastify, TypeScript, and Prisma.
- Validate API requests using JSON Schema and TypeScript.
- Structure API applications using routes, controllers, and services.
- Reuse authentication and authorization concepts from previous workshops.
- Understand the differences between session-based and token-based authentication.
- Build protected endpoints using JWT authentication.
- Send requests from the browser using the Fetch API.
- Update the DOM using data returned by an API.
- Upload files through an API using `FormData` and `@fastify/multipart`.
- Understand CORS and configure an API for a separate frontend when necessary.
- Protect API endpoints using rate limiting.
- Test API endpoints independently of the frontend.

## Introduction

In the previous workshops, we learned how to build backend applications using Node.js, Fastify, TypeScript, PostgreSQL, and Prisma.

We also covered database integration, CRUD operations, authentication, authorization, and file uploads. We learned how to associate resources with their owners, validate incoming data, and protect uploaded files.

So far, however, our applications have mostly focused on processing requests and returning data or server-generated pages.

In this workshop, we will explore another way to build web applications: **API-driven applications**.

Instead of generating a complete HTML page for every operation, our backend will expose endpoints that receive requests and return structured data, usually in JSON format. JavaScript in the browser will communicate with these endpoints and update the interface using the returned information.

To practise this approach, we will build a different application: a **Community Events API**.

Users will be able to browse published events, create accounts, organise events, and register for events. Organisers will be able to create and manage their own events, while visitors can browse public events.

We will also extend the application with event cover images. Instead of submitting a traditional HTML form and navigating to another page, our JavaScript frontend will upload the file directly to an API endpoint.

We will continue using Fastify, TypeScript, PostgreSQL, and Prisma. We will also reuse the authentication and file-upload principles from previous workshops.

Let's start by understanding how API-driven applications differ from the server-rendered applications we have already studied.

## From Server-Side Rendering to API-Driven Applications

In a traditional server-rendered application, the server generates the HTML document before sending it to the browser.

For example, when a user visits a page containing a list of events, the browser requests the page, the server retrieves the required information, a template engine generates the HTML, and the server returns the completed document.

### Traditional Server-Side Rendering

A typical request follows these steps:

1. The user visits a page or submits a form.
2. The browser sends an HTTP request to the server.
3. The backend processes the request and retrieves the required information.
4. The server generates an HTML document using that information.
5. The server sends the generated HTML to the browser.
6. The browser displays the page.

This approach works well for many applications. It is straightforward, and the server remains responsible for generating the page content.

However, with traditional full-page navigation, an action often causes the browser to request another HTML document. Even when we only want to update a small part of the interface, the browser may need to navigate to another page and replace the current document.

This is not necessarily a performance problem. Server-side rendering can be an excellent choice, especially for applications where server-generated HTML is useful for initial rendering, accessibility, or search-engine indexing.

The important point is that it is not the only way to build an interactive web application.

### API-Driven Applications

An API-driven application separates the responsibilities of the frontend and backend more clearly.

The backend exposes endpoints that allow clients to retrieve and modify application data. Instead of generating an HTML page for every operation, the API usually returns data in a structured format such as JSON.

JavaScript uses that data to update the interface without navigating to a new page.

For example, when a user creates an event, the process can work as follows:

1. The user fills in the event form and clicks the submit button.
2. JavaScript reads the form values.
3. JavaScript sends an HTTP request to the API.
4. Fastify validates the request and processes the operation.
5. Prisma stores the event in PostgreSQL.
6. The API returns a JSON response describing the result.
7. JavaScript uses the response to update the event list in the browser.

The process can be represented as follows:

```text
                USER INTERFACE
                      |
                      v
               JAVASCRIPT EVENT
                      |
                      v
                FETCH REQUEST
                      |
                      v
                 FASTIFY API
                      |
             +--------+--------+
             |                 |
             v                 v
        VALIDATION         AUTHENTICATION
             |                 |
             +--------+--------+
                      |
                      v
                BUSINESS LOGIC
                      |
                      v
                 PRISMA CLIENT
                      |
                      v
                 POSTGRESQL
                      |
                      v
                 JSON RESPONSE
                      |
                      v
                  JAVASCRIPT
                      |
                      v
                  UPDATE DOM
```

Notice that the backend does not need to know how the frontend displays the returned information. It is responsible for processing the request and returning the appropriate result.

This separation allows the same backend functionality to be used by different clients.

### What Is an API?

API stands for **Application Programming Interface**.

An API is an interface that allows one software application to communicate with another. It defines which operations are available, what information a client should send, and what kind of response it can expect.

In our web application, the API acts as the communication interface between the frontend and backend.

For example, our Community Events application might expose the following endpoints:

```text
GET    /api/events
GET    /api/events/10
POST   /api/events
PATCH  /api/events/10
DELETE /api/events/10
```

A browser application can use these endpoints to display and manage events. A mobile application could use the same endpoints without needing a separate implementation of the event-management logic.

This is one of the main advantages of API-driven development: **different clients can reuse the same backend functionality**.

An API does not have to be used by a browser. It can also be consumed by mobile applications, desktop applications, other servers, or automated tools.

### Understanding API Requests and Responses

When a client communicates with an API, it sends an HTTP request and receives an HTTP response.

A request may contain:

- An HTTP method describing the requested operation.
- A URL identifying the endpoint or resource.
- Headers containing additional information, such as the content type or authentication credentials.
- A request body containing data that the server needs to process.

For example, a client could send the following request to create an event:

```http
POST /api/events HTTP/1.1
Content-Type: application/json
```

```json
{
    "title": "Introduction to Robotics",
    "description": "A practical robotics workshop for beginners.",
    "location": "Community Technology Center",
    "startsAt": "2027-03-20T09:00:00.000Z",
    "capacity": 30,
    "category": "EDUCATION"
}
```

The API processes the request and might return:

```json
{
    "message": "Event created successfully.",
    "data": {
        "event": {
            "id": 10,
            "title": "Introduction to Robotics",
            "description": "A practical robotics workshop for beginners.",
            "location": "Community Technology Center",
            "startsAt": "2027-03-20T09:00:00.000Z",
            "capacity": 30,
            "registeredCount": 0,
            "category": "EDUCATION",
            "status": "DRAFT"
        }
    }
}
```

The response contains structured data rather than a complete HTML page. The frontend can use this information to display a success message or add the event to the interface.

### The Role of JavaScript

To communicate with an API from the browser, we can use the JavaScript **Fetch API**.

Fetch allows us to send HTTP requests and process the responses returned by the server.

For example, we can retrieve a list of events using:

```javascript
const response = await fetch("/api/events");
const result = await response.json();

console.log(result);
```

The first line sends a GET request to `/api/events`. The second line reads the JSON response and converts it into a JavaScript value.

We can then use that value to update the page.

Instead of submitting a form and navigating to another page, JavaScript can handle the form's submit event, send the request, and update the relevant part of the DOM.

The general process is:

1. **Listen for an event:** Detect a form submission or button click.
2. **Collect information:** Read the values entered by the user.
3. **Send a request:** Use `fetch()` to communicate with the API.
4. **Process the response:** Read the returned data and check whether the request succeeded.
5. **Update the interface:** Display the result by modifying the DOM.

We will implement this process later when we connect the Community Events frontend to our API.

## Understanding REST API Architecture

There are different ways to design APIs. One of the most widely used approaches for web APIs is **REST (Representational State Transfer)**.

REST is an architectural style that defines constraints for designing network-based applications. A REST-style API commonly represents application information as resources and uses standard HTTP methods to interact with those resources.

For example, in our Community Events application, users, events, and registrations are resources.

### Resource-Based URLs

REST-style APIs use URLs to identify resources rather than creating a separate custom action URL for every operation.

For example:

```text
/api/events
/api/events/10
/api/users/5
/api/events/10/registrations
```

Here:

- `/api/events` identifies the collection of events.
- `/api/events/10` identifies one event.
- `/api/users/5` identifies a user.
- `/api/events/10/registrations` identifies the registrations associated with an event.

Notice that the URL identifies the resource. The HTTP method tells the server what operation the client wants to perform.

### Using Standard HTTP Methods

HTTP provides standard methods that describe the operation a client wants to perform.

| Method | Purpose | Example |
|---|---|---|
| `GET` | Retrieve a resource or collection. | `GET /api/events` |
| `POST` | Create a resource or submit an operation. | `POST /api/events` |
| `PUT` | Replace a resource or subresource. | `PUT /api/events/10/cover` |
| `PATCH` | Partially update an existing resource. | `PATCH /api/events/10` |
| `DELETE` | Remove a resource. | `DELETE /api/events/10` |

For example, we use `GET /api/events` to retrieve events and `POST /api/events` to create one.

We do not need separate URLs such as `/api/getEvents` and `/api/createEvent`. The resource URL and HTTP method together describe the operation.

There is also an important distinction between PUT and PATCH:

- **PUT** is normally used when replacing the state of a resource or a specific subresource.
- **PATCH** is used when applying a partial update to an existing resource.

For our application, we will use PATCH when updating selected event fields. We will use PUT when replacing an event's cover image.

### Safe and Idempotent HTTP Methods

HTTP methods also have important behavioural properties.

A method is **safe** when it is intended to retrieve information without changing the server's application state.

A method is **idempotent** when performing the same request multiple times has the same intended effect on the server as performing it once.

| Method | Safe? | Idempotent? | Explanation |
|---|---|---|---|
| `GET` | Yes | Yes | Retrieves information without changing application state. |
| `POST` | No | Not necessarily | Often creates a new resource or performs an operation. |
| `PUT` | No | Yes | Replacing the same resource repeatedly should produce the same state. |
| `PATCH` | No | Not necessarily | The result depends on the partial update being applied. |
| `DELETE` | No | Yes | Repeated deletion should leave the resource absent. |

These properties are important when designing APIs and handling retries.

For example, suppose a client sends a request to create an event, but the network connection fails before the client receives the response. The client may not know whether the event was created.

Sending the same POST request again could create a duplicate event. In more advanced applications, we can use idempotency keys to make certain POST operations safe to retry.

### Stateless Communication

One of the constraints of REST is **statelessness**.

Stateless communication means that each request must contain the information needed by the server to understand and process it. The server should not depend on information that exists only in the memory of a previous request.

This does not mean that the application cannot store data in a database. The server can still store users, events, registrations, and other application information. The constraint concerns the communication between the client and server.

For example, an API request authenticated with a Bearer token contains the access token in its Authorization header:

```http
GET /api/events/10 HTTP/1.1
Authorization: Bearer ACCESS_TOKEN
```

The server can verify the token and identify the user without relying on an authentication session stored only in memory from a previous request.

JWT can support this style of authentication, but using JWT does not automatically make an application stateless. The application may still depend on server-side sessions, token blocklists, or other stateful mechanisms.

In Workshop 4, we learned about session-based authentication. A cookie-based session stores authentication state on the server and uses a session identifier in the browser. This is useful for many web applications, but it means the authentication mechanism itself is stateful.

We will use JWT for the main API implementation in this workshop and compare it with session-based authentication later.

### Client-Server Separation

REST separates the client from the server.

The client is responsible for the user interface and user experience. It decides how information is displayed and how users interact with the application.

The server is responsible for application rules, data validation, authentication, authorization, and database operations.

For example, the Community Events frontend can display an event as a card, a table, or a calendar entry. The backend only needs to return the event information in a predictable format.

This separation allows us to build different interfaces without rewriting the business logic.

### Cacheability, a Uniform Interface, and a Layered System

REST also defines other constraints.

**Cacheability** means that responses should indicate whether they can be stored and reused by a client or an intermediary cache.

For example, a public list of published events may be suitable for short-term caching, while private account information should not be cached by a shared cache.

**A uniform interface** means that clients interact with resources through consistent conventions. Resource URLs, standard HTTP methods, representations such as JSON, and meaningful status codes help make an API predictable.

A complete REST uniform interface can also use hypermedia links to guide clients through available actions. We will focus on the resource and HTTP conventions used by many practical REST-style APIs rather than implementing every part of the full REST model.

**A layered system** means that the client does not need to know whether it is communicating directly with the application server or through an intermediary such as a reverse proxy, gateway, or cache.

These layers can provide different responsibilities without changing how the client interacts with the API.

### Is Every JSON API a REST API?

No.

Returning JSON does not automatically make an API RESTful.

An API that returns JSON but uses inconsistent resource URLs, ignores HTTP method semantics, and depends on hidden server-side client state may be better described as an HTTP JSON API.

In this workshop, we will follow REST-style conventions:

- Use resource-oriented URLs.
- Use HTTP methods according to their intended semantics.
- Return meaningful HTTP status codes.
- Keep request and response formats predictable.
- Separate frontend responsibilities from backend responsibilities.
- Avoid unnecessary dependencies between requests.

This gives us a practical foundation for building maintainable HTTP APIs.

### Understanding HTTP Status Codes

HTTP status codes describe the result of processing a request.

Some commonly used status codes include:

| Status Code | Meaning | When we use it |
|---|---|---|
| `200` | OK | A request succeeded and a response contains data. |
| `201` | Created | A new resource was successfully created. |
| `204` | No Content | A request succeeded but does not need to return a response body. |
| `400` | Bad Request | The submitted information is invalid. |
| `401` | Unauthorized | Authentication is required or the supplied credentials are invalid. |
| `403` | Forbidden | The user is authenticated but is not allowed to perform the operation. |
| `404` | Not Found | The requested resource does not exist or is not available to the current user. |
| `409` | Conflict | The request conflicts with existing data, such as a duplicate registration. |
| `413` | Content Too Large | The uploaded request exceeds the configured size limit. |
| `415` | Unsupported Media Type | The submitted file or request format is not supported. |
| `429` | Too Many Requests | The client has exceeded a rate limit. |
| `500` | Internal Server Error | An unexpected error occurred on the server. |

Using meaningful status codes helps clients understand the result without having to interpret every message manually.

For example, a successful event creation should normally return `201 Created`, while trying to access an event that does not exist should return `404 Not Found`.

### A Consistent JSON Response Format

An API should return responses in a predictable structure. This makes it easier for the frontend to process successful requests and display errors.

For this workshop, successful responses will generally contain a `message` and a `data` property:

```json
{
    "message": "Events retrieved successfully.",
    "data": {
        "events": []
    }
}
```

A validation error can contain a message and an array describing the invalid fields:

```json
{
    "message": "Validation failed.",
    "errors": [
        {
            "field": "title",
            "message": "Event title is required."
        }
    ]
}
```

The exact response structure is a design decision, but it should remain consistent throughout the API.

We should also avoid returning internal database errors, stack traces, password hashes, or private server information to clients.

## Designing Our Community Events API

Before writing our routes, let's decide what our application should do and which resources it needs.

The Community Events application will allow users to discover events, organise events, and register for events.

Our application will support three main types of access:

- **Visitors:** Can browse published events and view their details.
- **Authenticated users:** Can register for published events and view their registrations.
- **Organisers:** Can create events, view their own drafts, update their events, manage registrations, and upload cover images.

Each event belongs to the user who created it. An organiser must not be able to modify another organiser's event by changing an ID in the URL.

### Designing the Resources

Our application will use the following main resources:

**User:** Represents a registered account. It stores account information and has relationships with events and registrations.

**Event:** Represents an event created by an organiser. It contains the event title, description, location, date, category, capacity, publication status, and optional cover image.

**Event Registration:** Represents a user's registration for a particular event. It connects a user to an event and stores the registration date.

The relationships can be represented as follows:

```text
                    User
                      |
             +--------+--------+
             |                 |
             | Organizes       | Registers
             |                 |
             v                 v
                   Event
                      |
                      |
                      v
              Event Registration
```

More precisely:

- One user can create multiple events.
- Each event belongs to one organiser.
- One user can register for multiple events.
- One event can have multiple registrations.
- The relationship between users and events through registrations is many-to-many, implemented using an explicit join model.

### Planning the API Endpoints

Before implementing the routes, let's define the endpoints our frontend will use.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/events` | Retrieve published events. | Public |
| `GET` | `/api/events/:eventId` | Retrieve one published event. | Public |
| `GET` | `/api/me/events` | Retrieve the current organiser's events, including drafts. | Authenticated |
| `POST` | `/api/events` | Create an event. | Authenticated |
| `PATCH` | `/api/events/:eventId` | Update event information. | Event owner |
| `DELETE` | `/api/events/:eventId` | Delete an event. | Event owner |
| `PUT` | `/api/events/:eventId/cover` | Upload or replace an event cover image. | Event owner |
| `DELETE` | `/api/events/:eventId/cover` | Remove an event cover image. | Event owner |
| `POST` | `/api/events/:eventId/registrations` | Register for an event. | Authenticated |
| `DELETE` | `/api/events/:eventId/registrations/me` | Cancel the current user's registration. | Authenticated |
| `GET` | `/api/me/registrations` | Retrieve the current user's registrations. | Authenticated |
| `POST` | `/api/auth/register` | Register an account. | Public |
| `POST` | `/api/auth/login` | Authenticate a user. | Public |
| `GET` | `/api/auth/me` | Retrieve the currently authenticated user. | Authenticated |

This table acts as a small API contract. It tells us which operations are available, which HTTP method each operation uses, and whether authentication is required.

We will follow these conventions when implementing the routes.

## Preparing Our Project

We will continue using the technology stack from our previous workshops:

- Fastify for the HTTP server.
- TypeScript for application code and type safety.
- PostgreSQL for persistent data.
- Prisma 7 for database access.
- Argon2id for password hashing.
- JWT for API authentication.
- `@fastify/multipart` for file uploads.

We will also use the browser's Fetch API to communicate with the backend.

### Installing the required packages

If you are continuing from the previous Fastify project, install the additional packages needed for this workshop:

```bash
npm install @fastify/jwt @fastify/cors @fastify/multipart @fastify/rate-limit @fastify/static file-type
```

If Argon2 is not already installed:

```bash
npm install argon2
```

We will use:

- `@fastify/jwt`: Creating and verifying JWT access tokens.
- `@fastify/cors`: Configuring cross-origin access.
- `@fastify/multipart`: Processing multipart file uploads.
- `@fastify/rate-limit`: Limiting repeated requests.
- `@fastify/static`: Serving static frontend files when the backend also hosts the frontend.
- `file-type`: Inspecting uploaded file signatures.
- `argon2`: Hashing and verifying passwords.

The database dependencies and Prisma configuration should already exist from our earlier workshops.

### Environment variables

Create or update the `.env` file:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/community_events"
JWT_SECRET="replace-with-a-long-random-secret"
FRONTEND_ORIGIN="http://localhost:5173"
PORT=3000
NODE_ENV="development"
```

Replace the database credentials with your own PostgreSQL credentials.

Generate a strong JWT secret rather than using the example value. You can generate one using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private and never commit it to a public repository.

## Designing Our Database Models

Before creating our API routes, let's define the information that our application needs to store.

An event needs a title, description, location, start date, capacity, category, and publication status. It also needs to be associated with the organiser who created it.

We also need a model for event registrations because a user can register for multiple events and an event can have multiple registered users.

The `User` model already exists from our previous authentication work. We will extend its relationships and add the new event-related models.

### Defining the models

Add the following enums and models to `prisma/schema.prisma`:

```prisma
enum EventCategory {
    TECHNOLOGY
    EDUCATION
    ART
    COMMUNITY
    SPORTS
    OTHER
}

enum EventStatus {
    DRAFT
    PUBLISHED
}

model Event {
    id              Int           @id @default(autoincrement())
    title           String        @db.VarChar(120)
    description     String        @db.Text
    location        String        @db.VarChar(160)
    startsAt        DateTime      @map("starts_at") @db.Timestamptz(6)
    capacity        Int
    registeredCount Int           @default(0) @map("registered_count")
    category        EventCategory @default(OTHER)
    status          EventStatus   @default(DRAFT)
    createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
    updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

    organizerId     Int           @map("organizer_id")
    organizer       User          @relation("EventOrganizer", fields: [organizerId], references: [id], onDelete: Cascade)

    registrations   EventRegistration[]
    cover           EventCover?

    @@index([organizerId])
    @@index([status, startsAt])
    @@map("events")
}

model EventRegistration {
    userId      Int      @map("user_id")
    eventId     Int      @map("event_id")
    registeredAt DateTime @default(now()) @map("registered_at") @db.Timestamptz(6)

    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

    @@id([userId, eventId])
    @@index([eventId])
    @@map("event_registrations")
}

model EventCover {
    id           Int      @id @default(autoincrement())
    storageName  String   @unique @map("storage_name") @db.VarChar(255)
    originalName String   @map("original_name") @db.VarChar(180)
    mimeType     String   @map("mime_type") @db.VarChar(100)
    sizeBytes    Int      @map("size_bytes")
    createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

    eventId      Int      @unique @map("event_id")
    event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

    @@map("event_covers")
}
```

In the existing `User` model, add the corresponding relationship fields:

```prisma
events        Event[]             @relation("EventOrganizer")
registrations EventRegistration[]
```

Make sure that the `organizerId`, `userId`, and other foreign-key types match the ID type already used by your `User` model. The example assumes that user IDs are integers.

### Understanding the relationships

The `organizerId` field in `Event` connects an event to its organiser.

The `organizer` relation allows Prisma to retrieve the user associated with an event.

The `EventRegistration` model represents the many-to-many relationship between users and events.

We use a composite primary key:

```prisma
@@id([userId, eventId])
```

This prevents the same user from registering for the same event more than once.

The `EventCover` model stores metadata about an event's cover image. The actual file will be stored in the filesystem, not directly in PostgreSQL.

The unique `eventId` field ensures that each event can have at most one cover record.

### Applying the database changes

Create the migration:

```bash
npx prisma migrate dev --name add_community_events
```

Then generate Prisma Client:

```bash
npx prisma generate
```

We have now added the database structure needed by our application.

## Connecting Prisma to Fastify

Now that our database structure is ready, we need to make Prisma Client available throughout our Fastify application.

We will use a Fastify plugin to create and share one Prisma Client instance.

This follows the same approach we used in previous workshops: create one shared database client instead of creating a new one every time a request is processed.

Create a directory named `plugins` and add `prisma.ts`:

```typescript
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required.");
    }

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL
    });

    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
};

export default fp(prismaPlugin);
```

We create the Prisma adapter using the PostgreSQL connection string and pass it to `PrismaClient`.

We then decorate the Fastify instance with the Prisma client so that other plugins and route modules can access it.

Finally, we register an `onClose` hook to disconnect Prisma when the application shuts down.

Because we are using `fastify-plugin`, the Prisma decoration is available outside the plugin's normal encapsulation scope.

We should also add the corresponding TypeScript declaration.

Create or update `types/fastify.d.ts`:

```typescript
import type { PrismaClient } from "../generated/prisma/client";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
```

Make sure your `tsconfig.json` includes the `types` directory so that TypeScript can discover this declaration.

## Configuring Fastify for API Requests

Before creating our API routes, let's configure the Fastify application.

Unlike traditional server-rendered applications, our API will primarily receive JSON requests and return JSON responses.

We will also receive multipart requests when users upload event cover images.

Create the following project structure:

```text
community-events/
├── prisma/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── plugins/
│   │   ├── prisma.ts
│   │   ├── jwt.ts
│   │   └── multipart.ts
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── public/
│   ├── css/
│   ├── js/
│   └── index.html
├── storage/
│   └── event-covers/
├── generated/
├── prisma.config.ts
├── package.json
└── tsconfig.json
```

The `routes` directory will contain our endpoint definitions. The `controllers` directory will handle HTTP-specific request and response logic. The `services` directory will contain business logic.

The `public` directory contains frontend files. The `storage` directory contains uploaded files and must not be exposed through static file serving.

### Understanding Fastify request validation

Fastify provides built-in JSON Schema validation.

Unlike manually checking every request field inside every route handler, we can define a schema that describes the expected structure of the request.

For example, suppose an endpoint expects a JSON object containing an event title and location:

```typescript
const schema = {
    body: {
        type: "object",
        required: ["title", "location"],
        additionalProperties: false,
        properties: {
            title: {
                type: "string",
                minLength: 3,
                maxLength: 120
            },
            location: {
                type: "string",
                minLength: 2,
                maxLength: 160
            }
        }
    }
};
```

We can attach this schema to a route:

```typescript
fastify.post("/events", {
    schema
}, async (request, reply) => {
    return {
        message: "Event request received."
    };
});
```

Fastify validates the incoming body before executing the route handler.

If the submitted information does not satisfy the schema, Fastify automatically returns a `400 Bad Request` response.

This means we do not need to manually check every field inside the handler.

### Understanding the difference between TypeScript and runtime validation

TypeScript helps us detect errors during development, but TypeScript types do not validate incoming HTTP requests at runtime.

For example:

```typescript
type CreateEventInput = {
    title: string;
    location: string;
};
```

This type helps us write application code safely. However, a client can still send:

```json
{
    "title": 123,
    "location": null
}
```

The browser or another API client does not know about our TypeScript types.

Therefore, we need runtime validation.

Fastify's JSON Schema validation provides that protection, while TypeScript types help us work with the validated data inside our application.

For larger projects, tools such as TypeBox or other schema-based type providers can reduce the amount of duplicated schema and type information.

## Organising Routes, Controllers, and Services

As our API grows, placing all the database queries and business logic directly inside route handlers becomes difficult to maintain.

We should separate the responsibilities of our application.

A common structure is:

```text
                 HTTP REQUEST
                      |
                      v
                    ROUTE
                      |
                      v
                  CONTROLLER
                      |
                      v
                   SERVICE
                      |
                      v
                  PRISMA
                      |
                      v
                  DATABASE
```

Each part has a different responsibility.

**Routes** define the URL, HTTP method, validation schema, and middleware or hooks required by an endpoint.

**Controllers** handle HTTP-specific work. They receive the request, call the appropriate service, and return the response.

**Services** contain business logic and coordinate database operations.

This separation makes our code easier to test and reuse.

For example, registering a user for an event involves more than inserting a row into a database. We need to check whether the event exists, whether it is published, whether it has available capacity, and whether the user has already registered.

Those are business rules, so they belong in a service rather than being scattered across route handlers.

## Understanding API Authentication and Authorization

Before building protected endpoints, let's connect the API architecture to the authentication and authorization concepts from Workshop 4.

**Authentication** answers the question: who is making the request?

**Authorization** answers the question: is this user allowed to perform the requested operation?

For example, an organiser can be authenticated and still be forbidden from editing another organiser's event.

The fact that a request reaches a protected API endpoint does not mean that the user is allowed to access every resource.

### Using JWT for API Authentication

In this workshop, we will use JSON Web Tokens for the main API authentication implementation.

A JWT is a compact token containing claims. A signed JWT can be verified by the server to check that its contents have not been modified and that it was issued by a trusted source.

A signed JWT is not encrypted by default. Anyone who obtains it can generally decode and read its payload, so we should never place passwords or other secrets inside it.

A typical access-token flow works as follows:

1. The client sends login credentials to the API.
2. The server verifies the credentials.
3. The server creates a signed access token containing claims such as the user's ID and expiration time.
4. The client receives the token.
5. The client sends the token with later requests, usually in the `Authorization` header using the `Bearer` scheme.
6. The server verifies the token before allowing access to protected endpoints.

For example:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

The server verifies the token's signature and claims. If verification succeeds, the API can identify the user associated with the token.

### Creating the JWT Plugin

Create `plugins/jwt.ts`:

```typescript
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error("JWT_SECRET must contain at least 32 bytes.");
    }

    await fastify.register(jwt, {
        secret,
        sign: {
            expiresIn: "15m"
        },
        verify: {
            allowedIss: "community-events-api"
        }
    });

    fastify.decorate("authenticate", async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch {
            return reply.code(401).send({
                message: "Invalid or missing access token."
            });
        }
    });
};

export default fp(jwtPlugin);
```

The JWT plugin adds two important methods:

- `reply.jwtSign()` creates a signed token.
- `request.jwtVerify()` verifies the token sent by the client.

We also create an `authenticate` function that can be used as a route pre-handler to protect endpoints.

Add the corresponding TypeScript declarations to `types/fastify.d.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "../generated/prisma/client";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;

        authenticate: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
    }

    interface FastifyJWT {
        payload: {
            sub: string;
        };

        user: {
            sub: string;
            iat?: number;
            exp?: number;
        };
    }
}
```

Here, `sub` represents the subject of the token. We use it to store the authenticated user's ID as a string.

### Creating the Login Endpoint

We already learned password hashing with Argon2id in Workshop 4.

The login endpoint will retrieve the user from the database, verify the supplied password against the stored hash, and issue an access token.

A simplified example:

```typescript
fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as {
        email: string;
        password: string;
    };

    const user = await fastify.prisma.user.findUnique({
        where: { email }
    });

    if (
        !user ||
        !(await argon2.verify(user.passwordHash, password))
    ) {
        return reply.code(401).send({
            message: "Invalid email or password."
        });
    }

    const accessToken = await reply.jwtSign({
        sub: String(user.id)
    }, {
        sign: {
            iss: "community-events-api"
        }
    });

    return reply.send({
        message: "Login successful.",
        data: {
            accessToken,
            tokenType: "Bearer",
            expiresIn: 900,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        }
    });
});
```

The example assumes that the existing `User` model contains `email`, `username`, and `passwordHash` fields. Adapt the query to the model created in Workshop 4.

Notice that we never return the password hash.

We also use the same error message whether the email does not exist or the password is incorrect. This avoids revealing which email addresses are registered.

In a complete implementation, we should attach a JSON Schema to the endpoint to validate the email and password before the handler runs.

### Understanding the Difference Between Sessions and JWT

In Workshop 4, we learned about session-based authentication. Session authentication and JWT authentication can both be used to protect APIs, but they work differently.

| Session Authentication | JWT Authentication |
|---|---|
| The browser sends a session cookie. | The client commonly sends a token in the Authorization header. |
| Session data is stored on the server when using a server-side session store. | Claims are carried inside the signed token. |
| The server looks up the session using its identifier. | The server verifies the token's signature and claims. |
| Sessions can be destroyed centrally. | A self-contained access token normally remains valid until expiration unless a revocation mechanism is added. |
| Cookie-based authentication requires CSRF protection for state-changing requests. | A Bearer token sent explicitly in an Authorization header is not automatically attached by the browser. |

Neither approach is universally better.

Sessions are often a straightforward choice for browser applications. Tokens can be useful when different clients need to present credentials explicitly to an API.

JWT does not automatically make an application faster or more scalable. If a system needs immediate token revocation, it may require a denylist or another server-side mechanism, which introduces additional state.

### Reusing Session Authentication

We can also build our API using session-based authentication, just as we did in Workshop 4.

Fastify provides plugins such as `@fastify/cookie` and `@fastify/session` for cookie and session management.

The general setup is:

```typescript
await fastify.register(cookie);

await fastify.register(session, {
    secret: process.env.SESSION_SECRET!,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    }
});
```

The `@fastify/session` plugin requires `@fastify/cookie` to be registered first.

The session can then store the authenticated user's information, and protected routes can check whether the current session contains a user.

However, cookie-based authentication introduces an important security consideration: **Cross-Site Request Forgery (CSRF)**.

Browsers automatically attach eligible cookies to requests. Therefore, a malicious website may attempt to cause a user's browser to perform an unwanted state-changing operation.

For session-based API authentication, we should use CSRF protection. Fastify provides `@fastify/csrf-protection`, which can be used with the session plugin to generate and verify CSRF tokens.

A frontend can retrieve a CSRF token from an endpoint and send it in a custom header such as `X-CSRF-Token` when making POST, PUT, PATCH, or DELETE requests.

For this workshop, we will use Bearer-token authentication in our main implementation and discuss session authentication as an alternative. Do not mix session and token authentication accidentally: choose an authentication strategy for each protected route group and apply the corresponding middleware consistently.

## Protecting Resources with Authorization

Authentication tells us who is making a request. Authorization determines what that user is allowed to do.

For our Community Events application, an organiser should only be able to manage events that they created.

For example, suppose Organiser A creates Event 10 and Organiser B creates Event 20.

Organiser A must not be able to modify Event 20 simply by changing the ID in the URL.

We must enforce this rule on the backend.

### Retrieving the Authenticated User

The JWT plugin makes the verified token payload available through `request.user`.

We can extract the user ID from the token:

```typescript
const userId = Number(request.user.sub);
```

However, we should never trust a user ID supplied by the client to determine ownership.

The server must derive the authenticated identity from the verified token.

### Checking Event Ownership

When updating or deleting an event, we can include the owner ID directly in the database query.

For example:

```typescript
const event = await fastify.prisma.event.findFirst({
    where: {
        id: eventId,
        organizerId: userId
    }
});

if (!event) {
    return reply.code(404).send({
        message: "Event not found."
    });
}
```

This query checks two conditions:

- The event exists.
- The event belongs to the authenticated user.

If either condition fails, we return `404 Not Found`.

Returning the same response for a missing event and an event owned by another user avoids confirming that another user's private resource exists.

This is an important API security principle: authorization must be enforced for every resource operation, not only when displaying buttons in the frontend.

## Building Our Event API

Now that authentication and authorization are understood, we can build the endpoints for managing events.

We will begin with the event collection and then implement individual event operations.

### Validating Route Parameters and Request Bodies

Fastify allows us to define JSON Schemas for route parameters, query strings, and request bodies.

For example, when creating an event, we expect a JSON body containing a title, description, location, start date, capacity, and category.

We can define the expected structure:

```typescript
const createEventSchema = {
    body: {
        type: "object",
        required: [
            "title",
            "description",
            "location",
            "startsAt",
            "capacity"
        ],
        additionalProperties: false,
        properties: {
            title: {
                type: "string",
                minLength: 3,
                maxLength: 120
            },
            description: {
                type: "string",
                minLength: 10,
                maxLength: 3000
            },
            location: {
                type: "string",
                minLength: 2,
                maxLength: 160
            },
            startsAt: {
                type: "string",
                format: "date-time"
            },
            capacity: {
                type: "integer",
                minimum: 1,
                maximum: 10000
            },
            category: {
                type: "string",
                enum: [
                    "TECHNOLOGY",
                    "EDUCATION",
                    "ART",
                    "COMMUNITY",
                    "SPORTS",
                    "OTHER"
                ]
            }
        }
    }
} as const;
```

The schema restricts the structure and values that the client can submit.

For example, `additionalProperties: false` prevents the client from adding unexpected properties such as `organizerId`.

This is important because the authenticated user, not the client, must determine event ownership.

### Creating an Event

We can now create the endpoint:

```typescript
type CreateEventInput = {
    title: string;
    description: string;
    location: string;
    startsAt: string;
    capacity: number;
    category?: "TECHNOLOGY" | "EDUCATION" | "ART" |
        "COMMUNITY" | "SPORTS" | "OTHER";
};

fastify.post<{ Body: CreateEventInput }>("/events", {
    preHandler: [fastify.authenticate],
    schema: createEventSchema
}, async (request, reply) => {
    const userId = Number(request.user.sub);

    const event = await fastify.prisma.event.create({
        data: {
            title: request.body.title,
            description: request.body.description,
            location: request.body.location,
            startsAt: new Date(request.body.startsAt),
            capacity: request.body.capacity,
            category: request.body.category ?? "OTHER",
            status: "DRAFT",
            organizerId: userId
        }
    });

    return reply.code(201).send({
        message: "Event created successfully.",
        data: { event }
    });
});
```

Let's understand the important parts.

The `preHandler` option runs the authentication function before the main handler. If the access token is missing or invalid, the request is rejected.

The JSON Schema validates the request body before the handler runs.

Finally, we create the event using Prisma.

Notice the following field:

```typescript
organizerId: userId
```

We get the organiser ID from the verified JWT, not from the request body.

This prevents the client from choosing another user as the owner of the new event.

We also use `201 Created` because a new resource has been created successfully.

### Retrieving Published Events

Visitors should be able to browse published events without logging in.

We can create a GET endpoint that retrieves published events:

```typescript
fastify.get("/events", async (request, reply) => {
    const events = await fastify.prisma.event.findMany({
        where: {
            status: "PUBLISHED"
        },
        select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startsAt: true,
            capacity: true,
            registeredCount: true,
            category: true,
            organizer: {
                select: {
                    id: true,
                    username: true
                }
            },
            cover: {
                select: {
                    id: true
                }
            }
        },
        orderBy: {
            startsAt: "asc"
        }
    });

    return reply.send({
        message: "Events retrieved successfully.",
        data: { events }
    });
});
```

Notice that we use `select` instead of returning the complete database model.

This allows us to control which fields are exposed to the client.

For example, the response does not need to include a user's password hash or other internal database fields.

### Adding Search, Filtering, and Pagination

As the number of events increases, returning every event in a single response becomes inefficient.

We should support pagination and allow clients to search and filter the event collection.

For example:

```text
GET /api/events?search=robotics&category=EDUCATION&page=1&limit=10
```

This request asks for the first page of educational events whose titles contain the word `robotics`.

The following values are examples of the query information we need to validate:

```typescript
type EventQuery = {
    page: number;
    limit: number;
    search?: string;
    category?: string;
};
```

A query schema should define:

- `page` as a positive integer.
- `limit` as a positive integer with a maximum value.
- `search` as an optional string with a reasonable maximum length.
- `category` as an optional value from our allowed categories.

After validation, we can calculate the pagination values:

```typescript
const page = request.query.page ?? 1;
const limit = Math.min(request.query.limit ?? 10, 50);

const skip = (page - 1) * limit;
```

Then use Prisma:

```typescript
const [events, total] = await fastify.prisma.$transaction([
    fastify.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            ...(request.query.search && {
                title: {
                    contains: request.query.search,
                    mode: "insensitive"
                }
            }),
            ...(request.query.category && {
                category: request.query.category
            })
        },
        skip,
        take: limit,
        orderBy: {
            startsAt: "asc"
        }
    }),

    fastify.prisma.event.count({
        where: {
            status: "PUBLISHED"
        }
    })
]);
```

In a complete implementation, the count query should use the same search and category filters as the collection query.

The response can include pagination metadata:

```json
{
    "message": "Events retrieved successfully.",
    "data": {
        "events": [],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 35,
            "totalPages": 4
        }
    }
}
```

Pagination helps reduce response sizes and makes large collections easier to navigate.

We should also validate the query values before passing them to Prisma. Never allow arbitrary or unbounded values to control database queries.

### Updating an Event

An organiser should be able to update selected fields of an event they own.

We will use PATCH because we are applying a partial update.

For example:

```http
PATCH /api/events/10
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN
```

```json
{
    "title": "Advanced Robotics Workshop",
    "capacity": 40
}
```

The backend should validate the event ID and request body, then check ownership before updating the database.

The database update should include only fields that are allowed to be changed.

For example, the client must not be allowed to modify:

- The event ID.
- The organiser ID.
- The number of registrations.
- Internal timestamps.

The server controls these values.

### Deleting an Event

Deleting an event should also require authentication and ownership verification.

A successful deletion can return:

```http
HTTP/1.1 204 No Content
```

We use `204` because the operation succeeded and the client does not need a response body.

In a real implementation, deleting an event must also consider associated registrations and uploaded files. Database relationships can handle related records through cascading deletes, but the filesystem requires separate cleanup logic.

## Registering Users for Events

Our application should allow authenticated users to register for published events.

This operation introduces an important business rule: an event cannot accept more registrations than its capacity.

Suppose an event has a capacity of 30 participants. We must prevent the number of registrations from exceeding 30.

We also need to prevent a user from registering for the same event more than once.

The composite primary key in `EventRegistration` helps enforce the second rule.

### Designing the Registration Endpoint

We will use:

```text
POST /api/events/:eventId/registrations
```

This endpoint requires authentication.

The backend should:

1. Verify the user's identity.
2. Check that the event exists and is published.
3. Check that the event has available capacity.
4. Create the registration.
5. Increment the registered participant count.
6. Return the registration result.

These operations must be handled carefully because two users might attempt to register for the final available place at the same time.

### Handling Capacity Safely

A naive implementation might retrieve the current registration count, compare it with the capacity, and then create a registration.

However, this creates a race condition.

Imagine that the event has one available place:

1. User A checks the capacity and sees one available place.
2. User B checks the capacity and also sees one available place.
3. User A registers.
4. User B registers.

Both requests may have passed the original check.

To avoid this, we need a database operation that updates the count only when capacity is still available.

A simplified Prisma transaction can use a conditional update:

```typescript
await fastify.prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
        where: {
            id: eventId,
            status: "PUBLISHED"
        }
    });

    if (!event) {
        throw new Error("EVENT_NOT_FOUND");
    }

    const updateResult = await tx.event.updateMany({
        where: {
            id: eventId,
            registeredCount: {
                lt: event.capacity
            }
        },
        data: {
            registeredCount: {
                increment: 1
            }
        }
    });

    if (updateResult.count === 0) {
        throw new Error("EVENT_FULL");
    }

    await tx.eventRegistration.create({
        data: {
            eventId,
            userId
        }
    });
});
```

The conditional update checks the current registration count before incrementing it.

If the event is full, the operation fails.

If the registration insertion fails because the user already registered, the transaction rolls back the count update as well.

In the complete service, we should convert these domain errors into appropriate API responses:

- `404 Not Found` when the event does not exist or is not available.
- `409 Conflict` when the event is full.
- `409 Conflict` when the user has already registered.

This example demonstrates why business logic belongs in a service: a registration is not simply a database insert.

## Handling Errors Consistently

So far, we have returned error responses directly from some route examples.

As an application grows, handling errors separately inside every route becomes repetitive.

Fastify provides a central error handler through `setErrorHandler()`.

We can use it to return consistent JSON responses.

For example:

```typescript
fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.validation) {
        return reply.code(400).send({
            message: "Validation failed.",
            errors: error.validation.map((item) => ({
                field: item.instancePath,
                message: item.message
            }))
        });
    }

    if (error.code === "P2002") {
        return reply.code(409).send({
            message: "A record with these values already exists."
        });
    }

    if (error.code === "P2025") {
        return reply.code(404).send({
            message: "The requested resource was not found."
        });
    }

    return reply.code(500).send({
        message: "Something went wrong on the server."
    });
});
```

This is a simplified example. In a complete application, we should also handle known application errors, multipart errors, and expected HTTP errors separately.

The important principle is that technical details should be logged on the server, while clients receive safe and predictable error messages.

We should never return database stack traces, filesystem paths, secret values, or internal implementation details.

## Uploading Files Through an API

In Workshop 5, we learned how to receive files using `@fastify/multipart`.

The same multipart format can be used when sending files through an API. The difference is that JavaScript creates the request using the browser's `FormData` object instead of relying on a normal form submission.

For our Community Events application, organisers can upload a cover image for their events.

We will reuse the security principles from Workshop 5:

- Store uploaded files outside the public directory.
- Generate storage names on the server rather than trusting the original filename.
- Apply file-size and file-count limits.
- Use the browser-provided MIME type only as an early filter.
- Inspect the actual file signature before accepting the image.
- Check authentication and event ownership before processing the upload.
- Keep file metadata in PostgreSQL and file contents in the filesystem.

### Creating the Storage Directory

Create the directory where event cover images will be stored:

```bash
mkdir -p storage/event-covers
```

Our uploaded files will be stored outside `public`, so they cannot be accessed simply by guessing a static URL.

### Configuring Multipart Support

Create or update `plugins/multipart.ts`:

```typescript
import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024,
            files: 1,
            fields: 0,
            parts: 1
        }
    });
};

export default multipartPlugin;
```

We allow one file with a maximum size of 5 MB.

The other limits restrict the number of files and additional multipart fields.

These limits help prevent unnecessarily large or complex requests from consuming server resources.

We should register multipart support only when the application needs it. Do not accept unrestricted file uploads across every route.

### Understanding How Fastify Receives Files

Unlike a traditional JSON request, a multipart request contains multiple parts.

A file part provides information such as:

- The field name.
- The original filename.
- The browser-provided MIME type.
- A readable stream containing the file data.

For example, we can retrieve one file using:

```typescript
const file = await request.file();
```

The `file` object contains a stream that we can process.

Fastify's multipart plugin supports streaming, which is useful for large files because we do not need to load the entire file into memory before saving it.

For our application, we will stream the upload to a temporary file, inspect its signature, and then move it into our private storage directory.

### Inspecting the Actual File Contents

The browser provides a MIME type and filename, but neither can be trusted.

A user could rename a text file to `image.jpg` and send it with a MIME type of `image/jpeg`.

Therefore, we need to inspect the actual file contents.

We will use the `file-type` package to detect the file signature.

Create `utils/mediaStorage.ts`:

```typescript
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { fileTypeFromFile } from "file-type";

const coverDirectory = path.resolve("storage", "event-covers");

const allowedTypes = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"]
]);

export async function saveUploadedCover(
    fileStream: NodeJS.ReadableStream
) {
    await mkdir(coverDirectory, { recursive: true });

    const temporaryName = `${randomUUID()}.tmp`;
    const temporaryPath = path.join(
        coverDirectory,
        temporaryName
    );

    let finalPath: string | null = null;

    try {
        await pipeline(
            fileStream,
            createWriteStream(temporaryPath, { flags: "wx" })
        );

        const detectedType = await fileTypeFromFile(temporaryPath);
        const extension = allowedTypes.get(detectedType?.mime ?? "");

        if (!detectedType || !extension) {
            throw new Error("UNSUPPORTED_FILE_TYPE");
        }

        const storageName = `${randomUUID()}.${extension}`;

        finalPath = path.join(coverDirectory, storageName);

        await rename(temporaryPath, finalPath);

        return {
            storageName,
            mimeType: detectedType.mime,
            filePath: finalPath
        };
    } catch (error) {
        await rm(temporaryPath, { force: true });

        if (finalPath) {
            await rm(finalPath, { force: true });
        }

        throw error;
    }
}

export async function deleteStoredCover(storageName: string) {
    const safeName = path.basename(storageName);

    if (safeName !== storageName) {
        throw new Error("INVALID_STORAGE_NAME");
    }

    const filePath = path.join(coverDirectory, safeName);

    try {
        await unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}
```

Let's understand the important steps.

First, the file stream is written to a temporary file.

Then, `fileTypeFromFile()` inspects the file contents and attempts to identify the actual format.

We only accept JPEG, PNG, and WebP.

If the detected MIME type is not in our allowlist, we reject the upload.

Next, we generate a new storage name using a random UUID and an extension derived from the detected format.

We do not use the original filename as the storage name.

The generated name avoids filename collisions and prevents the client from controlling the filesystem path.

File-signature detection is useful, but it is not a guarantee that a file is harmless or fully valid. For more demanding applications, we may also need image decoding and re-encoding, malware scanning, and additional content restrictions.

Notice that this utility is responsible for storing and deleting files. The database operations remain in the service layer.

### Creating the Cover Upload Endpoint

We can now create an endpoint that allows an organiser to upload a cover image.

The endpoint will:

1. Authenticate the user.
2. Validate the event ID.
3. Verify that the user owns the event.
4. Receive the multipart file.
5. Enforce upload limits.
6. Inspect the file signature.
7. Store the file and update the database.

A simplified route:

```typescript
fastify.put<{
    Params: { eventId: number };
}>("/events/:eventId/cover", {
    preHandler: [
        fastify.authenticate,
        requireEventOwner
    ]
}, async (request, reply) => {
    const part = await request.file({
        limits: {
            fileSize: 5 * 1024 * 1024,
            files: 1
        }
    });

    if (!part) {
        return reply.code(400).send({
            message: "Select an image to upload."
        });
    }

    const uploadedFile = await saveUploadedCover(part.file);

    const previousCover = await fastify.prisma.eventCover.findUnique({
        where: {
            eventId: request.params.eventId
        }
    });

    const cover = await fastify.prisma.eventCover.upsert({
        where: {
            eventId: request.params.eventId
        },
        create: {
            eventId: request.params.eventId,
            storageName: uploadedFile.storageName,
            originalName: part.filename.slice(0, 180),
            mimeType: uploadedFile.mimeType,
            sizeBytes: Number(part.file.bytesRead)
        },
        update: {
            storageName: uploadedFile.storageName,
            originalName: part.filename.slice(0, 180),
            mimeType: uploadedFile.mimeType,
            sizeBytes: Number(part.file.bytesRead)
        }
    });

    if (previousCover) {
        try {
            await deleteStoredCover(previousCover.storageName);
        } catch (error) {
            request.log.error(error);
        }
    }

    return reply.code(200).send({
        message: "Event cover uploaded successfully.",
        data: {
            cover: {
                id: cover.id,
                mimeType: cover.mimeType,
                sizeBytes: cover.sizeBytes,
                url: `/api/events/${request.params.eventId}/cover`
            }
        }
    });
});
```

This example illustrates the main request flow. A production implementation should also ensure that a new file is removed if the database update fails, and should handle multipart size-limit exceptions centrally.

There is also an important filesystem consideration: the filesystem and database are separate resources. A database transaction cannot automatically roll back a file operation. We must therefore plan cleanup and recovery logic carefully.

The route uses `requireEventOwner` before reading the file. This is important because an unauthorised user should not be able to make the application store files for events they do not own.

### Serving the Event Cover Image

Our storage directory is private, so we need an API endpoint that checks access before sending a cover image.

The endpoint should:

1. Retrieve the event and its cover metadata.
2. Check whether the event is published or belongs to the authenticated user.
3. Resolve the generated storage name inside the private storage directory.
4. Return the file with its verified MIME type.

We should never accept an arbitrary filesystem path from the URL.

The path must be constructed from a server-generated storage name retrieved from the database.

We should also set:

```http
X-Content-Type-Options: nosniff
```

This tells browsers not to reinterpret the declared content type through MIME sniffing.

For public event images, we can use a short cache duration. For private draft images, use a private cache policy.

## Uploading Files from the Browser with FormData

The backend upload route is ready. Now we need to understand how JavaScript sends a file through an API.

When a user selects a file using an HTML file input, JavaScript can access the selected file through the input element's `files` property.

The browser provides the `FormData` object to construct a multipart request containing text fields and files.

### Creating FormData

For example:

```javascript
const formData = new FormData();

formData.append("cover", fileInput.files[0]);
```

Here, we create a `FormData` object and append the selected file using the field name `cover`.

The field name must match the field expected by our backend.

For our Fastify implementation, `request.file()` retrieves the uploaded file part, but we should still use a consistent field name so that the client and server agree on the upload format.

### Sending the Upload Request

We can send the file using Fetch:

```javascript
const response = await fetch(
    `/api/events/${eventId}/cover`,
    {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        body: formData
    }
);

const result = await response.json();
```

Notice that we do not set the `Content-Type` header manually.

The browser automatically sets the correct `multipart/form-data` content type and includes the boundary that separates the parts of the request.

If we set the header ourselves without the correct boundary, the server may not be able to parse the request correctly.

The request also includes the Bearer token because uploading a cover image requires authentication.

This is the same upload format we used with traditional forms in Workshop 5. The difference is that JavaScript now controls when the request is sent and how the response is processed.

## Working with the Fetch API

Now that we understand how to send JSON data and files, let's explore Fetch in more detail.

Fetch is a browser API that allows JavaScript to make HTTP requests and process HTTP responses.

It returns a Promise that resolves to a `Response` object when the server responds.

### Sending a GET Request

To retrieve the events:

```javascript
const response = await fetch("/api/events");
const result = await response.json();

console.log(result.data.events);
```

We use `response.json()` to read the response body and parse it as JSON.

### Sending JSON Data

When we want to create an event, we send a POST request containing JSON:

```javascript
const response = await fetch("/api/events", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
        title: "Introduction to Robotics",
        description: "A practical robotics workshop for beginners.",
        location: "Community Technology Center",
        startsAt: "2027-03-20T09:00:00.000Z",
        capacity: 30,
        category: "EDUCATION"
    })
});

const result = await response.json();
```

Here, `JSON.stringify()` converts a JavaScript object into a JSON string.

We also set the `Content-Type` header to tell the server that the request body contains JSON.

### Understanding response.ok

An important detail about Fetch is that it does not automatically reject its Promise when the server returns an HTTP error status such as `400`, `401`, `404`, or `500`.

The Promise normally resolves as long as the browser successfully receives an HTTP response.

Therefore, we need to check `response.ok`:

```javascript
const response = await fetch("/api/events");

if (!response.ok) {
    throw new Error("Could not retrieve events.");
}

const result = await response.json();
```

The `response.ok` property is `true` for successful HTTP status codes in the 200–299 range and `false` for other status codes.

We should also remember that not every successful response contains JSON.

For example, our DELETE endpoint returns `204 No Content`. Calling `response.json()` on an empty response body would cause an error.

### Creating a Reusable API Helper

As our frontend grows, we do not want to repeat the same response and error-handling logic in every request.

We can create a helper function that handles JSON responses consistently.

Create `public/js/api.js`:

```javascript
let accessToken = null;

export function setAccessToken(token) {
    accessToken = token;
}

export function clearAccessToken() {
    accessToken = null;
}

export async function apiRequest(url, options = {}) {
    const headers = new Headers(options.headers ?? {});

    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const isFormData = options.body instanceof FormData;

    if (
        options.body &&
        !isFormData &&
        !headers.has("Content-Type")
    ) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    const result = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (!response.ok) {
        const error = new Error(
            result?.message ??
            `Request failed with status ${response.status}.`
        );

        error.status = response.status;
        error.details = result?.errors ?? [];

        throw error;
    }

    return result;
}
```

The helper:

- Adds the Authorization header when an access token exists.
- Detects whether the body is `FormData`.
- Sets the JSON content type when appropriate.
- Checks the HTTP response status.
- Handles empty `204` responses.
- Returns the parsed response data.

We keep the access token in JavaScript memory for this learning example.

We should not teach students to store authentication tokens in `localStorage` as the default production solution. JavaScript running on the same origin can read localStorage, so an XSS vulnerability could expose the token.

For browser applications, consider secure HttpOnly cookies or a Backend-for-Frontend architecture, and understand that cookie-based authentication requires appropriate CSRF protection.

For native mobile applications, use the platform's secure credential storage.

### Updating the Access Token After Login

When login succeeds, the API returns an access token.

The frontend should store it in memory using `setAccessToken()`:

```javascript
import { apiRequest, setAccessToken } from "./api.js";

const result = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
        email: "organiser@example.com",
        password: "a-long-example-password"
    })
});

setAccessToken(result.data.accessToken);
```

After a page refresh, the in-memory token is lost. The user must authenticate again unless the application implements a refresh-token strategy or another persistent authentication mechanism.

For this workshop, we will keep the implementation simple and use short-lived access tokens.

## Updating the DOM Using API Responses

The API now returns data, but the user still needs to see that information.

JavaScript can use the returned JSON objects to create or update HTML elements.

For example, imagine that our page contains an empty container:

```html
<section>
    <h2>Upcoming Events</h2>
    <div id="events-list"></div>
</section>
```

We can retrieve the events and display them inside this container.

### Rendering Event Cards

Create a file named `public/js/events.js`:

```javascript
import { apiRequest } from "./api.js";

const eventsList = document.querySelector("#events-list");

function createEventCard(event) {
    const article = document.createElement("article");
    article.className = "event-card";

    const title = document.createElement("h3");
    title.textContent = event.title;

    const description = document.createElement("p");
    description.textContent = event.description;

    const location = document.createElement("p");
    location.textContent = event.location;

    const date = document.createElement("time");
    date.dateTime = event.startsAt;
    date.textContent = new Date(event.startsAt).toLocaleString();

    article.append(title, description, location, date);

    if (event.coverUrl) {
        const image = document.createElement("img");

        image.src = event.coverUrl;
        image.alt = `Cover image for ${event.title}`;

        article.prepend(image);
    }

    return article;
}

export async function loadEvents() {
    eventsList.textContent = "Loading events...";

    try {
        const result = await apiRequest("/api/events");
        const events = result.data.events;

        eventsList.replaceChildren();

        if (events.length === 0) {
            eventsList.textContent = "No events are available yet.";
            return;
        }

        for (const event of events) {
            eventsList.append(createEventCard(event));
        }
    } catch (error) {
        eventsList.textContent = error.message;
    }
}
```

Let's understand what happens here.

First, we retrieve the list using `apiRequest()`.

We then loop through the returned event objects and create an HTML card for each event.

We use `textContent` when inserting user-provided text. This treats the value as text instead of HTML and helps avoid inserting untrusted markup into the page.

If the event has a cover image, we create an `<img>` element and set its `src` to the cover API endpoint.

We also display a loading message while the request is being processed and an appropriate message when there are no events or the request fails.

### Connecting the Interface

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Events</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header>
        <h1>Community Events</h1>
        <p>Discover events and activities happening in your community.</p>
    </header>

    <main>
        <section>
            <h2>Upcoming Events</h2>
            <div id="events-list" aria-live="polite"></div>
        </section>
    </main>

    <script type="module" src="/assets/js/main.js"></script>
</body>
</html>
```

Create `public/js/main.js`:

```javascript
import { loadEvents } from "./events.js";

async function startApplication() {
    await loadEvents();
}

startApplication();
```

The frontend is now a static HTML page. Fastify serves the page and JavaScript files, while JavaScript communicates with the API to retrieve event information.

This is a small example of the API-driven approach. We will extend the interface with forms for login, event creation, editing, and image uploads as an exercise.

## CORS: Connecting a Frontend from Another Origin

So far, the frontend and backend can be served by the same Fastify application.

However, in many projects, the frontend and backend are hosted separately.

For example, we may run a Vite development server at:

```text
http://localhost:5173
```

while our Fastify API runs at:

```text
http://localhost:3000
```

These URLs have different origins because they use different ports.

An **origin** is the combination of the protocol, hostname, and port.

When JavaScript running on one origin tries to read a response from another origin, the browser applies the Cross-Origin Resource Sharing (CORS) rules.

CORS is a browser-enforced mechanism that uses HTTP response headers to decide whether frontend JavaScript is allowed to read a cross-origin response.

It is important to understand that CORS is not an authentication system and does not prevent all requests from reaching the server.

Tools such as Postman and `curl` are not restricted by browser CORS enforcement.

### Configuring CORS in Fastify

Fastify provides the `@fastify/cors` plugin.

Register it during application setup:

```typescript
import cors from "@fastify/cors";

const frontendOrigin = process.env.FRONTEND_ORIGIN;

if (frontendOrigin) {
    await fastify.register(cors, {
        origin: frontendOrigin,
        credentials: false,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    });
}
```

Here:

- `origin` specifies which frontend origin is allowed.
- `credentials` controls whether browser credentials such as cookies can be included.
- `methods` lists the HTTP methods supported by the API.
- `allowedHeaders` lists the custom headers the frontend is allowed to send.

For our JWT Bearer-token implementation, `credentials: false` is sufficient because the token is explicitly sent in the Authorization header.

On the frontend, requests can target the API's full origin:

```javascript
fetch("http://localhost:3000/api/events", {
    headers: {
        Authorization: `Bearer ${accessToken}`
    }
});
```

### CORS and Cookie-Based Authentication

If we use session cookies instead of Bearer tokens, cross-origin requests require additional configuration.

The frontend must include credentials:

```javascript
fetch("http://localhost:3000/api/events", {
    credentials: "include"
});
```

The backend must allow credentials and specify the exact frontend origin.

For example:

```typescript
await fastify.register(cors, {
    origin: "http://localhost:5173",
    credentials: true
});
```

Do not use `origin: "*"` with credentialed requests. A credentialed CORS response must identify the allowed origin rather than allowing every origin.

When cookies need to be sent in a cross-site context, their SameSite and Secure attributes must also be configured correctly. CSRF protection remains necessary for state-changing operations.

For our main implementation, we will use a Bearer token and keep CORS restricted to the frontend origin we trust.

## API Rate Limiting

As an API gains more users, we need to protect it from excessive requests and abuse.

**Rate limiting** is the practice of restricting how many requests a client can make during a specific time window.

For example, we may want to:

- Limit repeated login attempts to make password guessing more difficult.
- Limit general API traffic to reduce unnecessary load.
- Apply stricter limits to expensive or sensitive operations.

Rate limiting is not a replacement for authentication or authorization. It is an additional protection that helps control request volume.

### Implementing Rate Limiting

Fastify provides the `@fastify/rate-limit` plugin.

Register it during application setup:

```typescript
import rateLimit from "@fastify/rate-limit";

await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes"
});
```

This configuration allows up to 100 requests from a client during a 15-minute window.

When the limit is exceeded, the plugin returns:

```http
429 Too Many Requests
```

The default store uses the server's memory.

This is sufficient for a single local development process, but it is not shared between multiple application instances and its counters are lost when the process restarts.

### Applying a Stricter Limit to Login

Authentication endpoints deserve additional protection because attackers may repeatedly attempt passwords.

We can apply a stricter limit directly to the login route:

```typescript
fastify.post("/login", {
    config: {
        rateLimit: {
            max: 5,
            timeWindow: "15 minutes"
        }
    }
}, async (request, reply) => {
    // Login implementation
});
```

This allows up to five requests from the same rate-limit key during the configured time window.

The login endpoint is also subject to the general API rate limit. The effective result is that a client must satisfy both limits.

The limits used here are examples for learning. Real applications should choose values based on their users, traffic, infrastructure, and operational requirements.

### Distributed Rate Limiting with Redis

The in-memory store is not appropriate when an application runs across several server instances.

Each instance would maintain separate counters, so a client could make more requests by reaching different instances.

A shared store such as Redis allows multiple application instances to use the same rate-limit counters.

Redis is an in-memory data store commonly used for caching, sessions, queues, and other short-lived application data.

For a production deployment, we can configure the rate-limit plugin with a compatible Redis store. We will keep the main workshop implementation on the built-in memory store and treat Redis as an extension.

## Configuring the Fastify Application

Now that we understand the main components, let's connect the plugins and routes.

Create `src/app.ts`:

```typescript
import Fastify from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";

import staticPlugin from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";

import prismaPlugin from "./plugins/prisma";
import jwtPlugin from "./plugins/jwt";
import multipartPlugin from "./plugins/multipart";

import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";

const currentDirectory = path.dirname(
    fileURLToPath(import.meta.url)
);

const publicDirectory = path.resolve(
    currentDirectory,
    "../public"
);

export async function buildApp() {
    const fastify = Fastify({
        logger: true
    });

    await fastify.register(cors, {
        origin: process.env.FRONTEND_ORIGIN ?? false,
        credentials: false,
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    });

    await fastify.register(rateLimit, {
        max: 100,
        timeWindow: "15 minutes"
    });

    await fastify.register(prismaPlugin);
    await fastify.register(jwtPlugin);
    await fastify.register(multipartPlugin);

    await fastify.register(authRoutes, {
        prefix: "/api/auth"
    });

    await fastify.register(eventRoutes, {
        prefix: "/api"
    });

    await fastify.register(staticPlugin, {
        root: publicDirectory,
        prefix: "/assets/"
    });

    fastify.get("/", async (_, reply) => {
        return reply.sendFile("index.html", publicDirectory);
    });

    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith("/api/")) {
            return reply.code(404).send({
                message: "API endpoint not found."
            });
        }

        return reply.code(404).send({
            message: "Page not found."
        });
    });

    return fastify;
}
```

The order of plugin registration matters.

For example:

- Prisma must be available before route handlers use database operations.
- JWT must be registered before protected routes use the authentication decorator.
- Multipart must be registered before routes that receive uploaded files.
- CORS should be registered before routes that need cross-origin handling.

We also expose the frontend assets under `/assets/` and serve the main HTML document through the root route.

Create `src/server.ts`:

```typescript
import "dotenv/config";
import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 3000);

const start = async () => {
    const app = await buildApp();

    try {
        await app.listen({
            port: PORT,
            host: "0.0.0.0"
        });
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();
```

The server file is responsible for starting the application. The `buildApp()` function creates and configures the Fastify instance.

This separation also makes the application easier to test because we can build the Fastify instance without immediately opening a network port.

## Testing Our API

Testing the API independently is important because it helps us identify whether a problem comes from the backend or from the frontend JavaScript.

We can use Postman, Thunder Client, or `curl` to send requests directly to our API.

### Testing Public Endpoints

Start by testing the public event collection:

```bash
curl http://localhost:3000/api/events
```

Retrieve one event:

```bash
curl http://localhost:3000/api/events/10
```

Try retrieving an event that does not exist. The API should return `404 Not Found`.

### Testing Registration and Login

Test the following scenarios:

- Register a new user.
- Try registering with an email address that already exists.
- Try registering with an invalid email address.
- Try registering with an invalid password.
- Log in with the correct credentials.
- Try logging in with an incorrect password.
- Retrieve the current user using `GET /api/auth/me`.
- Try accessing a protected endpoint without an access token.

After login, copy the returned access token and use it in the Authorization header:

```http
Authorization: Bearer ACCESS_TOKEN
```

### Testing Event Operations

After logging in, test the following operations:

- Create an event as a draft.
- Create an event with invalid information.
- Retrieve published events.
- Search events using query parameters.
- Filter events by category.
- Retrieve one event using its ID.
- Update an event using PATCH.
- Publish a draft event.
- Delete an event.

Also test the public behavior by making requests without logging in. Visitors should only receive published events.

### Testing Authorization

Create two organiser accounts.

For example:

- Organiser A creates an event.
- Organiser B creates a different event.
- Organiser A tries to update Organiser B's event by changing the event ID in the URL.
- Organiser A tries to delete Organiser B's event.
- Organiser A tries to replace Organiser B's cover image.

The API should prevent these operations.

It is not enough to hide edit and delete buttons in the frontend. The backend must enforce ownership on every operation.

### Testing Event Registrations

Test the registration endpoints:

- Register for a published event.
- Try registering for the same event twice.
- Try registering for a draft event.
- Try registering when the event is full.
- Cancel a registration.
- Retrieve the current user's registrations.

Also test the capacity rule with multiple requests arriving close together.

The registered count must never exceed the event's capacity.

### Testing File Uploads

Test the cover upload endpoint:

- Upload a valid JPEG image.
- Upload a valid PNG image.
- Upload a valid WebP image.
- Try uploading a file larger than 5 MB.
- Try uploading a text file renamed to `.jpg`.
- Try uploading an unsupported image format.
- Try uploading a cover image to an event owned by another user.
- Replace an existing cover image.
- Delete an event cover image and verify that its metadata and file are removed.

The API should reject invalid files and prevent users from managing media belonging to other organisers.

### Testing with curl

For a simple public request:

```bash
curl http://localhost:3000/api/events
```

To create an event using a JSON request body:

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "title": "Introduction to Robotics",
    "description": "A practical robotics workshop for beginners.",
    "location": "Community Technology Center",
    "startsAt": "2027-03-20T09:00:00.000Z",
    "capacity": 30,
    "category": "EDUCATION"
  }'
```

To upload an image:

```bash
curl -X PUT http://localhost:3000/api/events/10/cover \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "cover=@robotics.jpg"
```

Postman or Thunder Client is often more convenient when testing authentication and multipart requests.

## Additional Considerations for API Development

Before moving to the exercises, let's review a few important practices that help make APIs safer and easier to maintain.

### Validate All Client Input

Never assume that the frontend sends valid information.

A client can bypass browser-side validation and send requests directly to the API.

Validate route parameters, query parameters, JSON bodies, and uploaded files on the server.

### Never Trust User Ownership Information from the Client

Do not accept an owner ID from the request body when creating a user-owned resource.

Use the authenticated user's identity from the session or verified token.

When retrieving, updating, or deleting resources, include the ownership condition in the database query or verify it before performing the operation.

### Do Not Expose Internal Errors

Database errors, filesystem paths, stack traces, and secret values should not be returned to clients.

Log technical details on the server and return a useful but safe JSON error message.

### Use HTTPS in Production

Passwords, session cookies, and access tokens should be protected in transit.

Production applications should use HTTPS and configure secure cookies appropriately.

### Treat Uploaded Files as Untrusted

Continue using the file-upload protections introduced in Workshop 5.

File extensions and browser-provided MIME types are not proof of file content.

Use generated storage names, content inspection, upload limits, private storage where appropriate, and ownership checks.

### Understand That CORS Is Not Authorization

CORS controls whether browser JavaScript can read a cross-origin response.

It does not replace authentication, authorization, CSRF protection, or server-side validation.

### Plan for Pagination

Do not return an unlimited number of records from a collection endpoint.

Pagination helps keep response sizes manageable and makes large collections easier to navigate.

### Plan for API Versioning

As an API evolves, clients may depend on its existing response format.

For larger applications, versioning can help introduce breaking changes gradually.

For example:

```text
/api/v1/events
/api/v2/events
```

We will keep a single API version in this workshop, but it is useful to understand why versioning becomes important as an API grows.

## Exercises and Independent Tasks

The Community Events API is our main example for this workshop, but you should not limit yourself to building event applications.

The purpose of these exercises is to apply REST API design, authentication, authorization, validation, file uploads, and frontend integration to different problems.

### Task 1: Equipment Catalogue API

Create an API that allows an organisation to manage equipment available for borrowing.

Each equipment item should contain:

- Name.
- Description.
- Category.
- Availability status.
- Quantity.
- Optional image.

The API should allow users to:

- Retrieve all available equipment.
- Search equipment by name.
- Filter equipment by category and availability.
- Retrieve one equipment item by ID.
- Create a new equipment item.
- Update its information and availability.
- Delete an item.
- Upload or replace its image.

Additional requirements:

- Use pagination when retrieving equipment.
- Validate all submitted fields.
- Restrict equipment management to authenticated users with the appropriate ownership or role.
- Return consistent JSON responses and appropriate HTTP status codes.
- Test the endpoints independently of the frontend.

### Task 2: Pet Adoption API

Create an API for managing animals available for adoption.

Each animal should contain:

- Name.
- Species.
- Age.
- Description.
- Adoption status.
- Optional profile image.
- Date added.

The application should allow visitors to browse animals available for adoption. Authenticated shelter staff should be able to create, update, and remove listings.

The API should:

- Provide endpoints for listing and retrieving animals.
- Support search and filtering by species and adoption status.
- Allow authorised staff to create and update listings.
- Allow staff to upload and replace an animal's image.
- Prevent unauthorised users from modifying listings.
- Return appropriate responses when an animal cannot be found.

Try to design the endpoints before writing the implementation.

### Task 3: Learning Resource API

Create an API that allows instructors to publish learning resources for students.

A resource should contain:

- Title.
- Description.
- Subject.
- Resource type.
- Publication status.
- Optional attachment or cover image.

The application should support two roles:

- **Instructor:** Can create, update, publish, and delete their own resources.
- **Student:** Can browse published resources and retrieve their details.

Think about how authentication and authorization should work for each role.

Also consider how you would prevent students from retrieving unpublished resources.

### Task 4: Frontend Integration

Choose one of the APIs you built in the previous tasks and create a small frontend using HTML, CSS, and JavaScript.

The frontend should:

- Retrieve data from the API using Fetch.
- Display the retrieved data in the DOM.
- Provide a form for creating resources.
- Display validation errors returned by the API.
- Support searching and filtering.
- Allow authenticated users to update and delete their own resources.
- Upload an image or attachment using `FormData`.

Do not use page navigation for every operation. Use JavaScript to update the relevant part of the interface after the API responds.

### Final Challenge: Build Your Own API-Driven Application

Think of an application idea that is different from the examples in this workshop.

Before writing code:

1. Identify the main resources in the application.
2. Define the fields and relationships for each resource.
3. Design the API endpoints and choose the correct HTTP methods.
4. Decide which endpoints are public and which require authentication.
5. Define the ownership and authorization rules.
6. Define the JSON response format and status codes.
7. Identify which requests need validation or file uploads.
8. Build a frontend that communicates with the API using Fetch.
9. Configure CORS if the frontend and backend use different origins.
10. Protect sensitive endpoints using rate limiting.
11. Test the endpoints independently of the frontend.

Try to build an application where the frontend and backend have clearly separated responsibilities.

## Conclusion

In this workshop, we moved from traditional server-rendered applications toward API-driven architecture.

We learned how APIs expose resources through endpoints and how HTTP methods describe the operations clients want to perform.

We also explored REST principles, HTTP status codes, JSON response conventions, request validation, and the separation between frontend and backend responsibilities.

Using Fastify, TypeScript, PostgreSQL, and Prisma, we designed a Community Events API that supports event management, authentication, authorization, and event registrations.

We also connected the API to a browser frontend using the Fetch API, learned how to update the DOM using returned data, and uploaded files using `FormData` and Fastify's multipart support.

Finally, we discussed CORS, rate limiting, and the differences between session-based and token-based authentication.

The main idea is that the backend should expose a consistent interface for working with application resources, while the frontend decides how those resources are presented to the user.

This separation makes it possible to reuse the same backend with different clients, including web applications, mobile applications, desktop applications, and other services.

## References

- [Fastify TypeScript Documentation](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify Error Handling](https://fastify.dev/docs/latest/Reference/Server/)
- [Fastify JWT Plugin](https://github.com/fastify/fastify-jwt)
- [Fastify Multipart Plugin](https://github.com/fastify/fastify-multipart)
- [Fastify CORS Plugin](https://github.com/fastify/fastify-cors)
- [Fastify Rate Limit Plugin](https://github.com/fastify/fastify-rate-limit)
- [Fastify Static Plugin](https://github.com/fastify/fastify-static)
- [Fastify Session Plugin](https://github.com/fastify/session)
- [Fastify CSRF Protection Plugin](https://github.com/fastify/csrf-protection)
- [Prisma ORM 7: PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)