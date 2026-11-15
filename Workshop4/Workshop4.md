# Workshop 4: Authentication, Authorization, and Lifecycle Hooks with Fastify

## Objectives

In this workshop, we will learn how to secure backend applications by implementing authentication and authorization using Fastify, PostgreSQL, and Prisma.

We will also explore Fastify's lifecycle hooks and understand how they allow us to execute custom logic during request processing, response generation, and application startup and shutdown.

We will learn how to:

- Understand authentication and authorization and the differences between them.
- Understand Fastify's request-response lifecycle.
- Work with request hooks, response hooks, and application hooks.
- Understand Fastify's plugin architecture and encapsulation.
- Use lifecycle hooks for logging, request processing, and authentication.
- Understand password hashing and securely store user credentials.
- Implement user registration and login.
- Understand JSON Web Tokens (JWT) and how token-based authentication works.
- Implement authentication using `@fastify/jwt`.
- Protect routes using reusable authentication hooks.
- Implement role-based access control (RBAC).
- Enforce resource ownership to prevent unauthorized access to user data.
- Integrate authentication and authorization with PostgreSQL and Prisma.
- Understand common authentication attacks and their mitigations.
- Build a protected Task Management API.

## Introduction to Authentication and Authorization

In our previous workshops, we learned how to build backend applications using Fastify, render HTML pages, process form submissions, and store information persistently using PostgreSQL and Prisma.

However, there is an important problem with the applications we have built so far: most of their functionality is publicly accessible.

For example, imagine we are developing a task management application where users can create tasks, update their progress, and manage their personal work.

If every endpoint is accessible to everyone, one user might be able to retrieve another user's tasks, modify their information, or delete their records.

This is clearly unacceptable for an application that manages private user data.

To solve this problem, backend applications need mechanisms that identify users and control what they are allowed to do.

These mechanisms are known as **authentication** and **authorization**.

### What is Authentication?

Authentication is the process of verifying the identity of a user or another entity communicating with our application.

In other words, authentication answers the question:

**Who are you?**

When someone attempts to access a protected application, the backend needs a way to verify that the person is actually the user they claim to be.

A common approach is to use an email address and password.

The user provides their credentials, and the backend compares the submitted information with the credentials previously registered in the system.

If the verification succeeds, the application establishes an authenticated identity for that user.

For example, consider a task management application.

A user enters their email address and password into a login form. The backend retrieves the corresponding account, verifies the password, and establishes an authenticated identity by issuing an access token.

From that point onward, the user can send authenticated requests to the backend.

The authentication process can be represented as follows:

```text
             CLIENT
                |
                | Email + Password
                |
                v
             SERVER
                |
                v
        Retrieve User Account
                |
                v
        Verify Password Hash
                |
           ┌────┴────┐
           |         |
           v         v
         VALID    INVALID
           |         |
           v         v
      Authenticate  Reject
         User      Request
           |
           v
       Issue Access
          Token
           |
           v
          CLIENT
```

Authentication does not necessarily mean that the user can access every part of the application. It only establishes their identity.

This leads us to the second concept.

### What is Authorization?

Authorization is the process of determining what an authenticated user is allowed to access or perform.

While authentication answers:

**Who are you?**

Authorization answers:

**What are you allowed to do?**

For example, consider the same task management application.

We might have two types of users:

- **Regular User:** Can create, view, update, and delete their own tasks.
- **Administrator:** Can manage all tasks and access administrative functionality.

Both users can successfully authenticate, but their permissions are different.

An administrator can access functionality that a regular user cannot.

Authorization is therefore responsible for enforcing these restrictions after the user's identity has been established.

### Authentication vs Authorization

The distinction becomes clearer through an example.

Imagine that Alice and Bob both have accounts in our application.

Alice logs in successfully, so the backend verifies her credentials and establishes her identity.

She then requests:

```text
GET /api/tasks/15
```

The backend first verifies that the request comes from an authenticated user.

After that, it checks whether task `15` belongs to Alice or whether she has administrative privileges.

If the task belongs to Alice, access is allowed.

If it belongs to Bob and Alice is a regular user, access is denied.

The process can be represented as follows:

```text
        INCOMING REQUEST
                |
                v
         AUTHENTICATION
                |
          ┌─────┴─────┐
          |           |
          v           v
       VERIFIED    INVALID
          |           |
          v           v
     AUTHORIZATION  HTTP 401
          |
      ┌───┴────┐
      |        |
      v        v
   ALLOWED   DENIED
      |        |
      v        v
   PROCESS   HTTP 403
   REQUEST
```

This distinction is fundamental to backend security.

A system can authenticate users correctly and still have serious security vulnerabilities if it does not enforce authorization on protected resources.

For example, an authenticated user might change a task ID in the URL and retrieve another user's task if the backend does not verify ownership.

This type of vulnerability is known as **Broken Object Level Authorization (BOLA)**.

Throughout this workshop, we will implement both mechanisms and understand how they work together.

## Understanding Fastify Lifecycle Hooks

Before implementing authentication, we need to understand another important Fastify feature: **lifecycle hooks**.

In Workshop 1, we introduced hooks as a way to execute custom logic at specific stages of request processing.

Now that we are building more advanced backend functionality, we need to understand them in greater detail.

Hooks are useful because many application operations should happen outside individual route handlers.

For example, we might want to log every incoming request, verify authentication before executing protected routes, or record information after a response has been sent.

Instead of repeating these operations in every endpoint, Fastify allows us to register hooks that execute automatically at the appropriate stages.

Fastify provides two major categories of hooks:

- Request/Reply hooks, which interact with HTTP request and response processing.
- Application hooks, which interact with the application's lifecycle, such as initialization and shutdown.

### Understanding the Request-Response Lifecycle

When a client sends an HTTP request, Fastify processes it through a sequence of stages before sending the response.

Each stage provides an opportunity to execute custom logic through lifecycle hooks.

Let's examine the normal request-processing flow:

```text
          INCOMING REQUEST
                  |
                  v
               ROUTING
                  |
                  v
              onRequest
                  |
                  v
              preParsing
                  |
                  v
                Parsing
                  |
                  v
             preValidation
                  |
                  v
              Validation
                  |
                  v
              preHandler
                  |
                  v
             Route Handler
                  |
                  v
          preSerialization
                  |
                  v
                onSend
                  |
                  v
            HTTP RESPONSE
                  |
                  v
              onResponse
```

Fastify first identifies the route that matches the incoming HTTP method and URL.

After routing, the request passes through the hooks associated with the relevant application and route scopes.

The request payload is then parsed, validated, and prepared for the route handler.

Once the handler finishes processing the request, Fastify prepares the response, serializes the payload when necessary, and sends it to the client.

Finally, the response lifecycle reaches `onResponse`, which executes after the response has been sent.

There are also error-related and connection-related paths.

For example, `onError` executes when an error occurs during request processing. It runs before a custom error handler registered through `setErrorHandler()`.

Similarly, `onTimeout` and `onRequestAbort` handle specific connection events.

One important detail is that `preSerialization` is not executed for every response. It is skipped for strings, buffers, streams, and `null` payloads.

Understanding this lifecycle is important because the location of an operation determines when it can access request information and whether it can modify the response.

### Request Hooks

Request hooks allow us to execute logic while Fastify is processing an incoming HTTP request.

Some hooks run near the beginning of processing, while others execute after the request body has been parsed or validated.

Let's examine the most important ones.

#### 1. onRequest

The `onRequest` hook executes near the beginning of request processing, after Fastify has matched the incoming request to a route.

It is commonly used for operations that need to happen as early as possible, such as logging incoming requests or recording request metadata.

For example:

```typescript
fastify.addHook('onRequest', async (request, reply) => {

    request.log.info({
        method: request.method,
        route: request.routeOptions.url
    }, 'Incoming request')

})
```

Here, we register an `onRequest` hook that logs the HTTP method and matched route.

Whenever a request reaches the scope where this hook is registered, Fastify executes the callback.

For example, requesting:

```text
GET /api/tasks
```

produces a log describing the request.

We use `request.routeOptions.url` to record the route pattern rather than the complete URL, which may contain query parameters.

An important limitation is that `request.body` is not available inside `onRequest`, because the request payload has not yet been parsed.

Therefore, this hook is appropriate for operations involving request metadata, but not for validating submitted form fields.

We should also avoid logging sensitive information such as passwords, access tokens, Authorization headers, or complete request bodies.

#### 2. preParsing

The `preParsing` hook executes before Fastify parses the incoming request payload.

It receives the request payload as a stream and allows us to transform it before the content-type parser processes it.

This is useful for advanced operations such as decompressing incoming request bodies or transforming encoded data.

For example, imagine that a client sends a compressed request payload. We could use this hook to decompress the stream before passing it to Fastify's parser.

Unlike most other hooks, if we return a replacement payload, it must be a readable stream.

There is also an additional detail: when replacing the stream, we should provide the `receivedEncodedLength` property so Fastify can correctly account for the original request's encoded content length.

We will not implement this hook in our application, but it is useful to understand where it fits in the lifecycle.

#### 3. preValidation

After the request body has been parsed, Fastify executes the `preValidation` hook.

This hook allows us to inspect or modify the parsed request data before Fastify validates it against the route's JSON Schema.

For example, imagine that we want to normalize a username by removing unnecessary whitespace before validation.

```typescript
fastify.addHook('preValidation', async (request, reply) => {

    const body = request.body as {
        username?: string
    } | undefined

    if (typeof body?.username === 'string') {
        body.username = body.username.trim()
    }

})
```

Here, we retrieve the parsed body and normalize the username.

Because this happens before schema validation, Fastify validates the modified value rather than the original one.

This is useful when we want to normalize information before enforcing validation rules.

However, there is an important implementation rule:

**Request data has not passed schema validation when `preValidation` executes.**

Consequently, we must treat it as untrusted input.

For example, we should never assume that a required property exists simply because our TypeScript type declares it.

A client could still submit:

```json
{}
```

The runtime data does not automatically become valid because we have defined a TypeScript interface.

We must check that a property exists and has the expected type before performing operations on it.

Also remember that normalization should be applied only to fields where it makes sense. We should not trim or otherwise modify passwords.

#### 4. preHandler

The `preHandler` hook executes after request validation and immediately before the route handler.

This makes it particularly useful for operations that must succeed before the main application logic is executed.

For example, we might want to verify that a user is authenticated before allowing them to access a protected endpoint.

Instead of repeating authentication logic inside every route, we can register a reusable `preHandler`.

```typescript
const authenticate = async (request, reply) => {

    // Verify the user's identity

}
```

We can then use it inside a route:

```typescript
fastify.get(
    '/api/profile',
    {
        preHandler: authenticate
    },
    async (request, reply) => {

        return {
            message: 'Protected profile'
        }

    }
)
```

Fastify executes the authentication hook before the route handler.

If authentication fails and the hook sends an error response, the route handler is not executed.

This is one of the most useful applications of lifecycle hooks in backend development, and we will use this approach later when implementing authentication.

### Response Hooks

While request hooks allow us to execute logic during incoming request processing, Fastify also provides hooks for working with outgoing responses.

These hooks are useful when we want to modify response data, add headers, log completed requests, or observe errors.

#### 1. preSerialization

The `preSerialization` hook executes before Fastify serializes an applicable response payload.

It allows us to modify the response object before it is converted into the final output format.

For example:

```typescript
fastify.addHook(
    'preSerialization',
    async (request, reply, payload) => {

        return {
            data: payload
        }

    }
)
```

If a route returns:

```typescript
{
    message: 'Hello, World!'
}
```

the hook transforms the response payload into:

```json
{
    "data": {
        "message": "Hello, World!"
    }
}
```

This can be useful when implementing a consistent response structure across an API.

However, we should not blindly apply response transformations to every endpoint. Routes may have different response schemas, and changing payload structures globally can create unexpected behavior.

Also remember that this hook does not execute for every payload type.

#### 2. onSend

The `onSend` hook executes after response serialization, immediately before Fastify sends the response.

Unlike `preSerialization`, this hook works with the outgoing payload rather than the original JavaScript object.

It is useful for modifying response headers or performing operations immediately before transmission.

For example:

```typescript
fastify.addHook('onSend', async (request, reply, payload) => {

    reply.header('X-Application', 'Task Manager')

    return payload

})
```

Here, we add a custom HTTP response header.

Because we return the original payload, the response body remains unchanged.

The hook can also replace the outgoing payload, but any replacement must use a supported response payload type, such as a string, buffer, or stream.

#### 3. onResponse

The `onResponse` hook executes after Fastify has successfully sent the response to the client.

At this stage, we can no longer modify the response or send additional data to the client.

This makes it useful for operations such as logging completed requests, recording statistics, and sending monitoring information to external systems.

For example:

```typescript
fastify.addHook('onResponse', async (request, reply) => {

    request.log.info({

        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode

    }, 'Request completed')

})
```

This hook records information about completed requests.

Unlike `onSend`, it cannot modify the response because the response has already been sent.

#### 4. onError

The `onError` hook executes when an error occurs during request processing.

It is commonly used for additional error logging and monitoring.

For example:

```typescript
fastify.addHook(
    'onError',
    async (request, reply, error) => {

        request.log.error({

            method: request.method,
            route: request.routeOptions.url,
            error: error.message

        }, 'Request failed')

    }
)
```

This allows us to observe errors and record useful information for debugging.

There are two important details to understand.

First, in the Fastify lifecycle, `onError` executes before the custom error handler registered through `setErrorHandler()`.

Second, `onError` is not a replacement for Fastify's error handler. We should not use it to modify the error or call `reply.send()`.

If we need to control how errors are returned to clients, we should use Fastify's error-handling mechanisms, such as `setErrorHandler()`.

### Summary of Request and Response Hooks

The hooks we have discussed can be summarized as follows:

| Hook | Execution Stage | Common Use |
|---|---|---|
| `onRequest` | Beginning of request processing | Logging and metadata |
| `preParsing` | Before body parsing | Transforming payload streams |
| `preValidation` | Before schema validation | Normalizing request data |
| `preHandler` | Before route handler | Authentication and authorization |
| `preSerialization` | Before response serialization | Transforming response objects |
| `onSend` | Before sending response | Modifying headers or payload |
| `onResponse` | After response is sent | Logging and statistics |
| `onError` | Before custom error handler | Error monitoring |

Fastify also provides `onTimeout` and `onRequestAbort` for monitoring requests that time out or are aborted by the client.

An important implementation rule is that we should choose either callback-style hooks using `done()` or asynchronous hooks using `async/await`.

We must not combine both approaches in the same hook because this can cause the lifecycle to execute incorrectly.

### Application Hooks

The request and response hooks we have discussed execute while Fastify processes HTTP requests.

However, a Fastify application also has its own lifecycle, which includes plugin registration, initialization, starting the server, and shutting it down.

Fastify provides **application hooks** that allow us to execute logic during these stages.

These hooks are particularly useful for managing resources and observing the application's state.

#### 1. onReady

The `onReady` hook executes after the application and its registered plugins have finished initializing, immediately before the server starts accepting incoming requests.

For example:

```typescript
fastify.addHook('onReady', async () => {

    fastify.log.info(
        'Application initialization completed.'
    )

})
```

This hook is useful when we need to perform initialization tasks before the application starts serving requests.

For example, we might use it to load configuration, initialize application resources, or verify that required components are ready.

An important detail is that `onReady` cannot be used to register additional routes or hooks because the application has already completed its registration phase.

#### 2. onListen

The `onListen` hook executes after the HTTP server starts listening for incoming connections.

For example:

```typescript
fastify.addHook('onListen', async () => {

    fastify.log.info(
        'Server is now accepting connections.'
    )

})
```

This is useful when we want to execute logic after the server has successfully started.

Unlike `onReady`, this hook runs after the listening process has completed.

One important detail is that `onListen` does not execute when the application is started using `fastify.inject()` or `fastify.ready()`.

#### 3. onClose

When an application shuts down, it may need to release resources such as database connections, background workers, or other services.

The `onClose` hook allows us to execute cleanup operations when Fastify is closing.

For example:

```typescript
fastify.addHook('onClose', async () => {

    fastify.log.info(
        'Application is shutting down.'
    )

})
```

This hook is particularly important for applications that maintain database connections.

In our previous workshop, we registered an `onClose` hook inside the Prisma plugin to disconnect Prisma when the Fastify application shuts down.

This is a practical example of application lifecycle management.

When `fastify.close()` is called, Fastify stops accepting new connections, allows ongoing requests to finish, and then executes the closing hooks.

#### 4. onRoute

The `onRoute` hook executes whenever Fastify registers a new route.

It receives information describing the route, such as its URL and HTTP methods.

For example:

```typescript
fastify.addHook('onRoute', (routeOptions) => {

    fastify.log.info({

        method: routeOptions.method,
        url: routeOptions.url

    }, 'Route registered')

})
```

If we register:

```typescript
fastify.get('/api/tasks', async () => {
    return []
})
```

the hook executes during route registration and records information about the endpoint.

Notice that this hook does not execute every time a client requests the route. It executes when the route is created during application initialization.

This makes it useful for inspecting registered routes and building application-level tooling.

#### 5. onRegister

The `onRegister` hook executes whenever Fastify registers a plugin and creates a new encapsulation context.

It can be useful when developing plugins that need to observe or customize the registration of other plugins.

For example:

```typescript
fastify.addHook('onRegister', (instance, options) => {

    fastify.log.info(
        `Registering plugin with prefix: ${options.prefix ?? '/'}`
    )

})
```

This hook executes when a normal plugin is registered.

One important detail is that `onRegister` is not triggered for plugins wrapped using `fastify-plugin`, because those plugins do not create a normal encapsulated context in the same way.

#### 6. preClose

The `preClose` hook executes before Fastify completes the shutdown process.

It is useful when an application needs to prepare long-lived resources for shutdown, such as connections or resources that must be closed before the remaining application cleanup takes place.

Unlike `onClose`, which is appropriate for final resource cleanup after the server has stopped accepting requests, `preClose` provides an earlier opportunity to prepare for shutdown.

### Application Hook Summary

| Hook | When It Executes | Common Use |
|---|---|---|
| `onReady` | After application initialization | Initialization tasks |
| `onListen` | After the server starts listening | Startup notifications |
| `onClose` | During application shutdown | Resource cleanup |
| `onRoute` | When a route is registered | Route inspection |
| `onRegister` | When a plugin creates an encapsulated scope | Plugin registration monitoring |
| `preClose` | Before the shutdown process finishes | Preparing resources for shutdown |

Application hooks allow us to manage functionality that belongs to the application lifecycle rather than individual HTTP requests.

### Understanding Fastify Plugin Encapsulation

Before moving forward, we need to understand one of the most important concepts in Fastify's architecture: **encapsulation**.

Fastify uses plugins to organize application functionality.

When we register a plugin using `fastify.register()`, Fastify normally creates a new encapsulated scope.

Consider the following example:

```typescript
fastify.register(async (instance) => {

    instance.decorate('example', true)

})
```

Here, we register a plugin that adds a decorator called `example`.

This decorator is available inside the plugin and its child plugins.

However, it is not automatically available to the parent instance or sibling plugins.

This behavior is called **plugin encapsulation**.

It allows different parts of an application to have their own functionality without unintentionally affecting other parts.

For example, imagine the following structure:

```text
             ROOT APPLICATION
                    |
          ┌─────────┴─────────┐
          |                   |
          v                   v
       PLUGIN A             PLUGIN B
          |                   |
          v                   v
     Child Plugin         Child Plugin
```

A decorator registered inside Plugin A is available to its descendants, but not automatically to Plugin B.

This is important because different parts of an application may have different responsibilities.

For example, an authentication plugin might provide authentication functionality to several route plugins, while another plugin might provide functionality that should remain private to its own scope.

#### Understanding fastify-plugin

Now consider the following code:

```typescript
import fp from 'fastify-plugin'

const myPlugin = async (fastify) => {

    fastify.decorate('example', true)

}

export default fp(myPlugin)
```

The `fastify-plugin` package changes the normal encapsulation behavior of the wrapped plugin.

This allows its decorators and other shared functionality to be exposed to the parent Fastify scope instead of remaining restricted to a new encapsulated context.

This is particularly useful for infrastructure plugins.

For example:

- A database plugin can expose a Prisma client.
- An authentication plugin can expose an authentication hook.
- A configuration plugin can expose shared configuration.

We will use `fastify-plugin` in our authentication plugin because route plugins need access to the authentication and authorization decorators.

One important principle:

**Do not automatically wrap every plugin with `fastify-plugin`. Use it when you intentionally want to expose functionality outside the plugin's normal encapsulation scope.**

### Putting Hooks Together

Now that we understand the different categories, let's see how they can work together.

Create a simple example using our existing Fastify application.

Inside `app.ts`, add:

```typescript
// Request hook
fastify.addHook('onRequest', async (request) => {

    request.log.info({

        method: request.method,
        route: request.routeOptions.url

    }, 'Incoming request')

})


// Response hook
fastify.addHook('onSend', async (request, reply, payload) => {

    reply.header('X-Application', 'Task Manager')

    return payload

})


// After-response hook
fastify.addHook('onResponse', async (request, reply) => {

    request.log.info({

        statusCode: reply.statusCode

    }, 'Response sent')

})


// Application hook
fastify.addHook('onReady', async () => {

    fastify.log.info(
        'All application plugins are ready.'
    )

})


// Shutdown hook
fastify.addHook('onClose', async () => {

    fastify.log.info(
        'Fastify application is closing.'
    )

})
```

Each hook has a different responsibility.

When a request arrives, `onRequest` records its method and matched route.

Before Fastify sends the response, `onSend` adds a custom header.

After the response has been sent, `onResponse` records the HTTP status code.

Before the server begins accepting requests, `onReady` confirms that application initialization has completed.

Finally, when the application shuts down, `onClose` executes its cleanup-related logic.

This example demonstrates that hooks allow us to organize shared functionality without placing everything inside individual route handlers.

We will use this approach in the authentication system, where `preHandler` will become particularly important for protecting routes.

## Understanding Authentication Mechanisms

Now that we understand why applications need authentication and authorization, we can examine how a backend establishes and maintains a user's identity.

There are several ways to implement authentication, but two common approaches in web applications are session-based authentication and token-based authentication.

### Session-Based Authentication

In session-based authentication, the server maintains information about authenticated users.

When someone logs in successfully, the server creates a session and assigns it a unique identifier called a **Session ID**.

The server stores the session information, usually in a database or a dedicated session store, and sends the session identifier to the client through a cookie.

For subsequent requests, the browser automatically includes the session cookie.

The server retrieves the corresponding session and uses it to identify the user.

The process can be represented as follows:

```text
          CLIENT
             |
             | Login Credentials
             |
             v
           SERVER
             |
             v
       Verify Credentials
             |
             v
       Create User Session
             |
             v
      Store Session on Server
             |
             v
       Send Session Cookie
             |
             v
          CLIENT
             |
             | Future Requests
             | + Session Cookie
             |
             v
           SERVER
             |
             v
       Retrieve Session
             |
             v
       Identify the User
```

The main characteristic of this approach is that the server maintains the session state.

This provides centralized control over authenticated sessions. For example, the server can invalidate a session immediately when a user logs out.

However, maintaining sessions requires additional storage and session-management infrastructure, especially when an application runs across multiple server instances.

For production applications, session storage should use an appropriate shared store rather than relying on an in-memory store that exists only inside one server process.

### Token-Based Authentication

Another approach is **token-based authentication**.

Instead of maintaining a traditional session record for every authenticated user, the server issues a token after verifying the user's identity.

The client includes this token in subsequent requests, allowing the backend to verify the token and retrieve the information associated with the authenticated identity.

One commonly used token format is **JSON Web Token (JWT)**.

JWTs provide a standardized way to represent claims about an identity or another subject.

In this workshop, we will use signed JWTs for API authentication.

Before implementing them, we need to understand how they work.

## Understanding JSON Web Tokens (JWT)

A JSON Web Token is a compact format used to represent claims between parties.

JWT itself does not automatically provide encryption or confidentiality.

In this workshop, we will use digitally signed JWTs, also known as signed JSON Web Tokens (JWS).

A signed JWT commonly consists of three parts:

1. Header.
2. Payload.
3. Signature.

These parts are encoded and separated by periods (`.`).

A JWT therefore has a structure similar to:

```text
xxxxx.yyyyy.zzzzz
```

Let's examine each part.

### 1. Header

The header contains metadata describing the token.

For example:

```json
{
    "alg": "HS256",
    "typ": "JWT"
}
```

The `alg` property specifies the cryptographic algorithm used to sign the token.

Here, `HS256` identifies HMAC using SHA-256.

The `typ` property indicates that the token is a JWT.

### 2. Payload

The payload contains the claims associated with the token.

A claim is simply a piece of information represented inside the token.

For example:

```json
{
    "sub": "25",
    "iat": 1794772800,
    "exp": 1794773700
}
```

Here:

- `sub`: Identifies the subject of the token, in our case the user.
- `iat`: Indicates when the token was issued.
- `exp`: Specifies when the token expires.

The `sub` claim is commonly used to identify the user without including unnecessary account information.

We should avoid placing passwords, password hashes, private information, or other sensitive data inside JWT payloads.

An important detail is that a normally signed JWT is **not encrypted**.

Its header and payload can be decoded and read by anyone who obtains the token.

The signature protects the integrity of the claims and allows the server to verify that the token has not been modified.

Therefore, a signed JWT should not be treated as a mechanism for hiding information.

### 3. Signature

The signature is generated using the encoded header, encoded payload, and a secret key or private signing key.

For an HMAC-based token, the signing process can be represented as:

```text
HMAC-SHA256(
    Base64URL(Header) + "." + Base64URL(Payload),
    Secret
)
```

The server uses the same secret to verify the signature when receiving the token.

If someone modifies the payload, the signature will no longer match, and verification will fail.

This prevents clients from changing their identity or modifying trusted claims without the appropriate signing key.

### Understanding the JWT Authentication Flow

Now that we understand the token structure, let's examine how JWT-based authentication works in our application.

When a user submits their login credentials, the server verifies their email and password.

If the credentials are valid, the server generates a JWT containing the user's identifier and signs it using a secret key.

The token is then returned to the client.

For subsequent requests, the client includes the token in the HTTP `Authorization` header using the Bearer authentication scheme:

```text
Authorization: Bearer <ACCESS_TOKEN>
```

The backend extracts the token, verifies its signature and expiration, and retrieves the user identity from its payload.

The process can be represented as follows:

```text
             CLIENT
                |
                | Email + Password
                |
                v
             SERVER
                |
                v
        Verify User Credentials
                |
                v
           Generate JWT
                |
                v
          Sign the Token
                |
                v
          Return JWT
                |
                v
             CLIENT
                |
                | Authorization:
                | Bearer <TOKEN>
                |
                v
             SERVER
                |
                v
       Verify JWT Signature
                |
                v
       Validate Expiration
                |
                v
       Extract User Identity
                |
                v
        Authenticate Request
```

One important characteristic of JWT authentication is that the server can verify a signed token without retrieving a traditional session record for every request.

However, this does not mean that the entire application must be stateless.

Our application can still communicate with PostgreSQL to retrieve current user information, check permissions, or access protected resources.

We will use exactly this approach when implementing authorization.

### Access Token Expiration

JWTs commonly contain an expiration time.

This is important because a stolen token could otherwise be reused by someone else until it is explicitly invalidated.

For example, we might configure access tokens to expire after 15 minutes.

After expiration, the client must authenticate again or use a refresh-token mechanism to obtain another access token.

A shorter lifetime reduces the period during which a stolen access token can be used, although it also means that clients must handle expiration and reauthentication more frequently.

For this workshop, we will implement short-lived access tokens without introducing refresh tokens.

This means that our example does not yet provide a complete logout or immediate token-revocation mechanism.

A JWT remains valid until it expires unless we introduce additional server-side mechanisms, such as token denylisting, token versioning, or session records.

### Important Security Considerations

JWT authentication requires careful handling of signing keys and issued tokens.

The signing secret must be sufficiently random, stored outside the source code, and never exposed to clients.

Tokens should be transmitted over HTTPS in production and should never be placed in URLs because URLs may appear in logs, browser history, and other unintended locations.

We will use the Authorization header for our API examples.

For browser applications, token storage requires additional consideration.

We should not treat `localStorage` as a secure place for authentication tokens because JavaScript executing in the same origin can access them.

HttpOnly, Secure, appropriately configured SameSite cookies or a Backend-for-Frontend architecture are common alternatives.

Cookie-based authentication also requires appropriate CSRF protections.

We will focus on Bearer tokens in this workshop because they provide a straightforward way to demonstrate authentication for API clients.

## Preparing the Database for User Authentication

Before implementing registration and login, we need to extend our PostgreSQL database to store user accounts.

In Workshop 3, we already created a Prisma plugin that connects our Fastify application to PostgreSQL.

We will continue using that implementation rather than creating another database connection.

For this workshop, we will build a separate example: a **Task Management Application**.

Users will be able to register, authenticate, create tasks, and manage their own work. Administrators will also have access to additional management functionality.

This gives us a practical environment for implementing both authentication and authorization without repeating the Quote Sharing application.

### Understanding the User Model

A user account needs to contain enough information for the application to identify the user and verify their credentials.

At a minimum, we need:

- A unique identifier.
- A name.
- An email address.
- A password hash.
- A role indicating the user's permissions.

We will not store the original password. Instead, we will store a secure password hash, which we will generate during registration.

We will also introduce two roles:

- `USER`: A regular account with access to its own tasks.
- `ADMIN`: An administrative account with broader access.

### Understanding the Task Model

The Task model represents work items created by users.

Each task has a title, an optional description, a status, and a user who created it.

We will also introduce an optional assignee.

It is important to distinguish between these two relationships:

- **Creator:** The user who originally created the task.
- **Assignee:** The user responsible for completing the task.

Assigning a task to someone else should not change who created it.

This distinction will become useful when we implement task assignment in the exercises.

### Extending the Prisma Schema

Open:

```text
prisma/schema.prisma
```

Keep the existing Quote model from Workshop 3. We will add new models for users and tasks.

**`prisma/schema.prisma`:**

```prisma
enum Role {
    USER
    ADMIN
}

enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
}

model User {

    id       Int    @id @default(autoincrement())

    name     String @db.VarChar(80)

    email    String @unique @db.VarChar(254)

    passwordHash String

    role     Role   @default(USER)

    createdTasks  Task[] @relation("TaskCreator")

    assignedTasks Task[] @relation("TaskAssignee")

    createdAt DateTime @default(now())

    updatedAt DateTime @updatedAt

}

model Task {

    id          Int        @id @default(autoincrement())

    title       String     @db.VarChar(120)

    description String?    @db.VarChar(1000)

    status      TaskStatus @default(TODO)

    createdById Int

    createdBy User @relation(
        "TaskCreator",
        fields: [createdById],
        references: [id],
        onDelete: Cascade
    )

    assigneeId Int?

    assignee User? @relation(
        "TaskAssignee",
        fields: [assigneeId],
        references: [id],
        onDelete: SetNull
    )

    createdAt DateTime @default(now())

    updatedAt DateTime @updatedAt

    @@index([createdById, createdAt])

    @@index([assigneeId, createdAt])

}
```

Let's understand the new models.

### The User Model

The `User` model represents registered accounts in our application.

The `email` field uses:

```prisma
email String @unique @db.VarChar(254)
```

The `@unique` attribute ensures that two accounts cannot register using the same email address.

This is important because we use email addresses to identify accounts during authentication.

The `passwordHash` field stores the hashed password rather than the original password.

We also introduce:

```prisma
role Role @default(USER)
```

The `Role` enum restricts the available values to `USER` and `ADMIN`.

New accounts automatically receive the `USER` role unless an authorized administrative process changes it.

Notice that registration will not allow users to choose their own role.

Otherwise, someone could submit `ADMIN` during registration and obtain administrative privileges.

We also introduce two relationships:

```prisma
createdTasks Task[] @relation("TaskCreator")

assignedTasks Task[] @relation("TaskAssignee")
```

These represent tasks created by the user and tasks assigned to the user.

### The Task Model

The `Task` model represents work items created by users.

The `status` field uses the `TaskStatus` enum, which defines three possible states:

```text
TODO
IN_PROGRESS
DONE
```

This prevents our application from storing arbitrary task statuses.

More importantly, we introduce a relationship between tasks and their creators:

```prisma
createdById Int

createdBy User @relation(
    "TaskCreator",
    fields: [createdById],
    references: [id],
    onDelete: Cascade
)
```

This establishes a foreign key connecting each task to its creator.

The relationship is one-to-many:

- One user can create multiple tasks.
- Each task has one creator.

We also introduce an optional assignee:

```prisma
assigneeId Int?

assignee User? @relation(
    "TaskAssignee",
    fields: [assigneeId],
    references: [id],
    onDelete: SetNull
)
```

This allows a task to be assigned to another user without changing its creator.

If the assigned user is deleted, `onDelete: SetNull` removes the assignment while preserving the original task.

The `onDelete: Cascade` option on the creator relationship ensures that deleting a user also deletes tasks created by that user.

Finally, we introduce indexes:

```prisma
@@index([createdById, createdAt])

@@index([assigneeId, createdAt])
```

These indexes help PostgreSQL efficiently retrieve tasks based on their creator or assignee, particularly when ordering them by creation time.

### Applying the Migration

After updating the Prisma schema, we need to apply the changes to PostgreSQL.

Run:

```bash
npx prisma migrate dev --name add_users_and_tasks
```

This creates a migration that adds the necessary database structures for our new models.

Next, regenerate Prisma Client:

```bash
npx prisma generate
```

Prisma Client now includes the new `User` and `Task` models and the methods needed to work with them.

We can inspect the generated tables using:

```bash
npx prisma studio
```

Our database now supports user accounts, task ownership, task assignment, and role information.

Remember that we are continuing with the Prisma 7 configuration established in Workshop 3, including its PostgreSQL driver adapter and generated client setup.

## Understanding Password Hashing

Before implementing user registration, we need to address one of the most important security requirements in authentication: password storage.

When users register, they provide a password that will later be used to verify their identity.

A common but dangerous mistake is storing passwords directly inside the database.

For example, imagine a table containing:

| id | email | password |
|---|---|---|
| 1 | alice@example.com | AlicePassword123 |
| 2 | bob@example.com | BobPassword456 |

If an attacker gains access to this database, they immediately obtain the original passwords.

This is unacceptable because users may reuse passwords across different applications.

We therefore need a mechanism that allows us to verify passwords without storing their original values.

### What is Password Hashing?

Hashing is a one-way process that transforms input data into a fixed-format output using a mathematical algorithm.

For passwords, we use specialized password-hashing algorithms designed to make guessing attacks computationally expensive.

Instead of storing:

```text
MySecurePassword
```

we store a derived hash:

```text
$argon2id$v=19$m=19456,t=2,p=1$...
```

When a user logs in, the backend takes the submitted password and verifies it against the stored hash.

If the verification succeeds, the password is considered correct.

We do not decrypt the hash because password hashing is designed as a one-way operation.

### Hashing vs Encryption

It is important to distinguish between hashing and encryption.

Encryption is designed to protect information while still allowing authorized parties to recover the original data using a decryption key.

Hashing, on the other hand, is designed to transform information into a form from which the original input cannot practically be recovered.

This makes hashing more appropriate for password storage.

We do not need to recover the user's original password. We only need to determine whether the submitted password matches the one they originally registered with.

### Why Not Use SHA-256?

A common question is why we don't simply use a cryptographic hash function such as SHA-256.

SHA-256 is an excellent cryptographic hash function, but it is designed to be computationally fast.

This is undesirable for password storage.

An attacker who obtains a database of password hashes could attempt millions or billions of password guesses using specialized hardware.

Password-hashing algorithms are therefore designed to consume additional time and memory, making large-scale password guessing more expensive.

One suitable algorithm is **Argon2id**, which is designed specifically for password hashing.

OWASP recommends Argon2id with a minimum configuration of 19 MiB of memory, two iterations, and one degree of parallelism.

These parameters should also be benchmarked and adjusted for the target system.

### Understanding Salt

Password hashing algorithms also use a value called a **salt**.

A salt is a randomly generated value that is combined with the password during hashing.

Its purpose is to ensure that identical passwords do not produce identical stored hashes when different salts are used.

For example, imagine two users register with the same password.

Without unique salts, both accounts might have identical password hashes.

With random salts, their resulting hashes will be different.

Modern password-hashing libraries such as Argon2 automatically generate and store the salt as part of the encoded hash string.

We do not need to manage salts manually when using these libraries.

## Implementing Password Hashing with Argon2id

Now that we understand why passwords must be hashed, let's integrate Argon2id into our application.

Install the `argon2` package:

```bash
npm install argon2
```

The package provides functions for hashing and verifying passwords.

We will use the following configuration throughout the workshop:

```typescript
const argon2Options = {

    type: argon2.argon2id,

    memoryCost: 19_456,

    timeCost: 2,

    parallelism: 1

}
```

These parameters follow OWASP's recommended minimum Argon2id configuration.

### Hashing a Password

We can generate a password hash using:

```typescript
import argon2 from 'argon2'

const passwordHash = await argon2.hash(
    password,
    argon2Options
)
```

Let's examine the configuration.

The `type` option selects Argon2id, which provides a balance of resistance against different types of attacks.

The `memoryCost` option specifies the memory usage in KiB. Here, we use 19,456 KiB, equivalent to 19 MiB.

The `timeCost` option determines the number of iterations, while `parallelism` specifies the degree of parallelism.

These parameters control the computational cost of password hashing.

The resulting hash contains the algorithm information, salt, and parameters needed for later verification.

### Verifying a Password

When a user logs in, we retrieve their stored password hash from PostgreSQL and verify the submitted password:

```typescript
const isValid = await argon2.verify(
    storedPasswordHash,
    submittedPassword
)
```

The `verify()` function returns a boolean indicating whether the submitted password matches the stored hash.

If it returns `true`, authentication can continue.

Otherwise, we reject the login attempt.

Notice that we do not manually extract the salt or generate a new hash during login. Argon2 handles the verification using the information encoded in the stored hash.

This makes password management considerably safer and easier to maintain.

### Protecting Authentication Against Automated Attacks

There is another important consideration.

Password hashing algorithms such as Argon2id are intentionally computationally expensive.

This makes password guessing more expensive for attackers, but it also means that every login attempt consumes server resources.

An attacker could send a large number of login requests and force our application to perform expensive password verifications.

This is known as a **brute-force or credential-guessing attack**.

We therefore need additional protection, such as rate limiting.

We will introduce rate limiting when implementing the authentication routes.

## Implementing JWT Authentication with Fastify

We now have a database capable of storing users and a password-hashing mechanism for protecting their credentials.

The next step is to integrate JWT-based authentication into Fastify.

Instead of implementing token generation and verification manually, we will use a plugin called `@fastify/jwt`.

This plugin integrates JWT functionality directly into Fastify and provides methods for signing and verifying tokens.

It also provides request and reply decorators that make token operations easier to perform inside route handlers and lifecycle hooks.

### Installing @fastify/jwt

Install the package:

```bash
npm install @fastify/jwt
```

We are using Fastify 5, so we need a compatible version of the plugin. Version 9 and newer of `@fastify/jwt` support Fastify 5.

### Configuring the JWT Secret

To sign tokens, the server needs a secret key.

We will store this secret in our environment variables rather than writing it directly inside our source code.

Open the existing `.env` file and add:

```env
JWT_SECRET="REPLACE_WITH_A_RANDOM_SECRET"
```

Generate a secure secret using:

```bash
openssl rand -base64 32
```

Copy the generated value into your `.env` file.

The JWT secret must remain private because anyone who obtains it may be able to generate tokens that our server accepts.

Make sure `.env` remains included in `.gitignore`.

Remember that checking a secret's length does not prove that it contains sufficient randomness. Always generate it using a cryptographically secure random generator.

### Creating the Authentication Plugin

We will configure JWT through a reusable Fastify plugin so that authentication functionality can be shared across our application.

Create:

```bash
touch src/plugins/auth.ts
```

Inside it:

**`src/plugins/auth.ts`:**

```typescript
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

import type { FastifyPluginAsync } from 'fastify'

const authPlugin: FastifyPluginAsync = async (fastify) => {

    const secret = process.env.JWT_SECRET

    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error('A valid JWT_SECRET is required')
    }

    fastify.register(jwt, {

        secret,

        sign: {
            algorithm: 'HS256',
            expiresIn: '15m'
        },

        verify: {
            algorithms: ['HS256']
        }

    })

}

export default fp(authPlugin)
```

Let's understand the configuration.

We first retrieve the JWT secret from the environment:

```typescript
const secret = process.env.JWT_SECRET
```

We then verify that a secret has been configured and that its length meets our minimum requirement.

The check prevents the application from starting with a missing or obviously short secret.

It is not a substitute for generating a cryptographically random key.

Next, we register the JWT plugin:

```typescript
fastify.register(jwt, {

    secret,

    sign: {
        algorithm: 'HS256',
        expiresIn: '15m'
    },

    verify: {
        algorithms: ['HS256']
    }

})
```

The `secret` option specifies the key used to sign and verify our tokens.

The `sign` option defines the default token-signing configuration.

We use:

```typescript
algorithm: 'HS256',
expiresIn: '15m'
```

This makes the signing algorithm explicit and causes access tokens to expire after 15 minutes.

We also configure:

```typescript
verify: {
    algorithms: ['HS256']
}
```

This restricts verification to the algorithm we have selected.

It is important not to accept arbitrary signing algorithms from incoming tokens. The server must define which cryptographic algorithms it trusts.

The plugin provides several useful methods and properties:

| Method | Purpose |
|---|---|
| `fastify.jwt.sign()` | Creates a signed JWT. |
| `fastify.jwt.verify()` | Verifies a JWT. |
| `fastify.jwt.decode()` | Decodes a token without verifying its signature. |
| `reply.jwtSign()` | Signs a token using the reply decorator. |
| `request.jwtVerify()` | Extracts and verifies the incoming token. |
| `request.user` | Contains the verified token payload. |

We will mainly use `reply.jwtSign()` when generating tokens and `request.jwtVerify()` when authenticating requests.

### Understanding Token Verification

When a client sends a protected request, it includes the JWT inside the Authorization header:

```text
Authorization: Bearer <ACCESS_TOKEN>
```

The `@fastify/jwt` plugin automatically extracts the Bearer token and provides:

```typescript
await request.jwtVerify()
```

This method verifies the token's signature and validity, including its expiration.

If verification succeeds, the decoded payload becomes available through:

```typescript
request.user
```

If the token is missing, malformed, invalid, or expired, verification throws an error.

We can catch that error and reject the request.

One important distinction: decoding a JWT is not the same as verifying it.

The `decode()` method only reads the token's contents. It does not establish that the signature is valid.

We must never use an unverified decoded payload to make authentication or authorization decisions.

### Understanding the TypeScript Integration

Since our application uses TypeScript, we also need to describe the structure of our JWT payload.

The `@fastify/jwt` plugin supports TypeScript module augmentation, allowing us to define the expected token payload and the type exposed through `request.user`.

Create a file:

```bash
touch src/types/fastify-jwt.d.ts
```

**`src/types/fastify-jwt.d.ts`:**

```typescript
import '@fastify/jwt'

declare module '@fastify/jwt' {

    interface FastifyJWT {

        payload: {
            sub: string
        }

        user: {
            sub: string
        }

    }

}
```

We define `sub` as a string because JWT subject claims are represented as strings.

This allows TypeScript to understand the structure of our token payload and provides proper type checking when generating and verifying JWTs.

Because our existing `tsconfig.json` includes `src/**/*.ts`, the declaration file is included in the TypeScript project.

## Implementing User Registration

Our authentication system now supports JWT generation and verification, but users still need a way to create accounts.

We will implement a registration endpoint that accepts a name, email address, and password.

The backend will validate the information, hash the password, and store the new account in PostgreSQL through Prisma.

### Creating the Authentication Routes

Create a new file:

```bash
touch src/routes/auth.ts
```

Inside this file, we will define the registration and login endpoints.

**`src/routes/auth.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

import argon2 from 'argon2'

import { randomBytes } from 'node:crypto'

import { Prisma } from '../generated/prisma/client.js'


type RegisterBody = {
    name: string
    email: string
    password: string
}

type LoginBody = {
    email: string
    password: string
}


// Argon2id configuration
const argon2Options = {

    type: argon2.argon2id,

    memoryCost: 19_456,

    timeCost: 2,

    parallelism: 1

}


// Public user information
const publicUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: ['USER', 'ADMIN']
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [
        'id',
        'name',
        'email',
        'role',
        'createdAt'
    ],

    additionalProperties: false

} as const


const registerSchema = {

    type: 'object',

    required: ['name', 'email', 'password'],

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 80,
            pattern: '\\S'
        },

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        },

        password: {
            type: 'string',
            minLength: 15,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const


const loginSchema = {

    type: 'object',

    required: ['email', 'password'],

    properties: {

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        },

        password: {
            type: 'string',
            minLength: 1,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const


const authRoutes: FastifyPluginAsync = async (fastify) => {

    // Generate a dummy hash once when the plugin initializes.
    // It will be used for login attempts involving unknown accounts.

    const dummyPasswordHash = await argon2.hash(
        randomBytes(32).toString('hex'),
        argon2Options
    )


    // User Registration

    fastify.post<{ Body: RegisterBody }>(
        '/register',

        {
            schema: {

                body: registerSchema,

                response: {

                    201: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            user: publicUserSchema

                        },

                        required: ['message', 'user'],

                        additionalProperties: false

                    }

                }

            },

            config: {

                rateLimit: {

                    max: 3,

                    timeWindow: '1 hour'

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.name === 'string') {
                    body.name = body.name.trim()
                }

                if (typeof body?.email === 'string') {

                    body.email =
                        body.email.trim().toLowerCase()

                }

            }

        },

        async (request, reply) => {

            const { name, email, password } = request.body

            // Hash the password

            const passwordHash = await argon2.hash(
                password,
                argon2Options
            )

            try {

                // Create the account

                const user = await fastify.prisma.user.create({

                    data: {

                        name,

                        email,

                        passwordHash

                    },

                    select: {

                        id: true,

                        name: true,

                        email: true,

                        role: true,

                        createdAt: true

                    }

                })

                return reply.code(201).send({

                    message: 'Account created successfully',

                    user

                })

            } catch (error) {

                // Handle duplicate email addresses

                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {

                    return reply.code(409).send({

                        error: 'An account with this email already exists'

                    })

                }

                throw error

            }

        }

    )



    // User Login

    fastify.post<{ Body: LoginBody }>(
        '/login',

        {

            schema: {

                body: loginSchema

            },

            config: {

                rateLimit: {

                    max: 5,

                    timeWindow: '1 minute'

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.email === 'string') {

                    body.email =
                        body.email.trim().toLowerCase()

                }

            }

        },

        async (request, reply) => {

            const { email, password } = request.body

            // Retrieve the user

            const user = await fastify.prisma.user.findUnique({

                where: {
                    email
                }

            })


            // Verify the submitted password.
            // Use a dummy hash when the account does not exist.

            const passwordHash =
                user?.passwordHash ?? dummyPasswordHash

            const passwordValid = await argon2.verify(
                passwordHash,
                password
            )


            // Reject invalid credentials

            if (!user || !passwordValid) {

                return reply.code(401).send({

                    error: 'Invalid email or password'

                })

            }


            // Generate an access token

            const accessToken = await reply.jwtSign({

                sub: String(user.id)

            })


            return reply.code(200).send({

                message: 'Login successful',

                accessToken,

                tokenType: 'Bearer',

                expiresIn: 900,

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email,

                    role: user.role

                }

            })

        }

    )

}

export default authRoutes
```

Let's understand how registration works.

First, we define TypeScript types describing the submitted information.

We also define JSON Schemas that validate the incoming request bodies.

The registration schema requires a name, email address, and password, while rejecting additional properties that are not part of the registration form.

Notice that we do not include a `role` field.

This is intentional. New accounts must receive the default `USER` role defined in the Prisma model.

Allowing users to choose their own role during registration would create an obvious authorization vulnerability.

Before processing the request, we normalize the name and email address using a `preValidation` hook.

For example, we convert the email address to lowercase so that differently capitalized versions of the same address are treated consistently.

Notice that we first verify that the fields are strings.

This is important because `preValidation` runs before JSON Schema validation.

A client could submit an empty object or an unexpected data type. Without these checks, calling `.trim()` could throw an exception before Fastify has an opportunity to return the expected validation error.

Next, we generate the password hash:

```typescript
const passwordHash = await argon2.hash(
    password,
    argon2Options
)
```

The original password is never stored in the database.

We then create the account through Prisma:

```typescript
const user = await fastify.prisma.user.create({

    data: {
        name,
        email,
        passwordHash
    },

    select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
    }

})
```

Notice that we explicitly select which fields should be returned.

We intentionally exclude `passwordHash` because it must never be included in the API response.

We also define a response schema.

Unlike request schemas, response schemas describe the structure of outgoing data.

They help document API responses and restrict which fields Fastify serializes.

This provides an additional safeguard against accidentally exposing sensitive model properties when database models change.

Finally, we return HTTP status `201 Created` to indicate that the account was successfully created.

We also handle Prisma error code `P2002`, which represents a unique constraint violation.

This happens when someone attempts to register using an email address that is already stored in the database.

The database's unique constraint remains important because checking for existing email addresses only in application code would not reliably prevent simultaneous duplicate registrations.

One additional security consideration is that returning a specific duplicate-email response with HTTP `409` reveals whether an email address is registered.

This implementation makes that trade-off for simplicity and usability.

Production applications that require stronger protection against account enumeration should use a suitable account-verification workflow and carefully designed, consistent registration responses.

## Implementing User Login

Registration creates an account, but users also need a way to authenticate themselves.

We implement login using another POST endpoint.

The client submits an email address and password.

The backend retrieves the corresponding user, verifies the password hash, and issues a JWT if the credentials are correct.

Let's examine the important part of the implementation.

We first retrieve the account using its email address:

```typescript
const user = await fastify.prisma.user.findUnique({
    where: {
        email
    }
})
```

If the account exists, we verify the submitted password against the stored hash.

However, notice that we do something slightly different when the account does not exist:

```typescript
const passwordHash =
    user?.passwordHash ?? dummyPasswordHash

const passwordValid = await argon2.verify(
    passwordHash,
    password
)
```

Why do we use a dummy password hash?

Consider two login attempts.

**Attempt A:**

The submitted email belongs to an existing account, but the password is incorrect.

The backend performs an Argon2 verification.

**Attempt B:**

The submitted email does not belong to any account.

Without additional handling, the backend would immediately reject the request without performing password verification.

These two paths could take noticeably different amounts of time.

An attacker could potentially use these timing differences to discover which email addresses are registered.

To reduce this discrepancy, we generate a random dummy password hash once when the authentication routes are initialized.

When an account does not exist, we verify the submitted password against that dummy hash instead.

This makes the two paths more comparable in computational cost.

It does not guarantee perfectly constant execution time, but it reduces one source of timing information.

We also protect login and registration with rate limiting.

This limits how frequently a client can submit authentication requests and reduces the effectiveness of automated guessing attacks.

After verification, we reject invalid credentials using the same response:

```typescript
return reply.code(401).send({

    error: 'Invalid email or password'

})
```

Using the same message prevents the endpoint from directly revealing whether an email address is registered.

After successful verification, we generate a JWT:

```typescript
const accessToken = await reply.jwtSign({

    sub: String(user.id)

})
```

We use the user's database identifier as the token subject.

Because we configured a default expiration of 15 minutes in our JWT plugin, the generated token automatically includes the corresponding expiration information.

Finally, we return the token to the client.

The client can now use it when accessing protected API endpoints.

Notice that the token contains only the user identifier.

We deliberately avoid including the user's role in the token because we want authorization decisions to use the current role stored in PostgreSQL rather than potentially outdated information inside an already-issued token.

For production applications, rate limiting should also be supported by appropriate monitoring and distributed storage when the application runs across multiple server instances.

## Creating a Reusable Authentication Hook

We can now register users and issue JWTs, but we still need a convenient way to protect routes.

One approach would be to repeat the token-verification logic in every protected endpoint.

However, this would create unnecessary duplication and make our application harder to maintain.

A better solution is to create a reusable authentication hook and attach it to the Fastify instance.

We will implement this through our existing authentication plugin.

### Extending the Authentication Plugin

We need to retrieve the authenticated user's current information from PostgreSQL and make it available throughout the request.

First, define the application-specific user types.

Create:

**`src/types/auth.ts`:**

```typescript
export type UserRole = 'USER' | 'ADMIN'

export type AuthenticatedUser = {

    id: number

    name: string

    email: string

    role: UserRole

}
```

Next, update the TypeScript declarations.

**`src/types/fastify.d.ts`:**

```typescript
import type {
    FastifyInstance,
    FastifyRequest,
    FastifyReply
} from 'fastify'

import type {
    AuthenticatedUser,
    UserRole
} from './auth.js'


declare module 'fastify' {

    interface FastifyRequest {

        currentUser: AuthenticatedUser | null

    }

    interface FastifyInstance {

        authenticate: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>

        authorize: (
            ...roles: UserRole[]
        ) => (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>

    }

}
```

Here, we extend Fastify's existing TypeScript interfaces.

The `currentUser` property represents the authenticated user associated with the current request.

The `authenticate` method represents our reusable authentication hook, while `authorize` will be responsible for checking user roles.

This allows TypeScript to understand these additions when we access them through Fastify.

### Implementing the Authentication Hook

Now update:

**`src/plugins/auth.ts`:**

```typescript
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

import type { FastifyPluginAsync } from 'fastify'

import type {
    AuthenticatedUser,
    UserRole
} from '../types/auth.js'


const authPlugin: FastifyPluginAsync = async (fastify) => {

    const secret = process.env.JWT_SECRET

    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error('A valid JWT_SECRET is required')
    }


    // Register JWT

    fastify.register(jwt, {

        secret,

        sign: {
            algorithm: 'HS256',
            expiresIn: '15m'
        },

        verify: {
            algorithms: ['HS256']
        }

    })


    // Add the current user property to each request

    fastify.decorateRequest('currentUser', null)


    // Authentication hook

    fastify.decorate('authenticate', async (request, reply) => {

        try {

            // Verify the JWT

            await request.jwtVerify()

        } catch {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid or missing access token'
                })

            return

        }


        // Extract the user ID from the token

        const subject = request.user.sub

        if (!/^[1-9]\d*$/.test(subject)) {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid access token'
                })

            return

        }

        const userId = Number(subject)

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0 ||
            userId > 2_147_483_647
        ) {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid access token'
                })

            return

        }


        // Retrieve the current user from the database

        const user = await fastify.prisma.user.findUnique({

            where: {
                id: userId
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }

        })


        if (!user) {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid authentication credentials'
                })

            return

        }


        // Attach the authenticated user to the request

        request.currentUser = user

    })


    // Authorization hook

    fastify.decorate('authorize', (...allowedRoles: UserRole[]) => {

        return async (request, reply) => {

            const user = request.currentUser

            if (!user) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        error: 'Authentication required'
                    })

                return

            }

            if (!allowedRoles.includes(user.role)) {

                reply.code(403).send({
                    error: 'You do not have permission to access this resource'
                })

                return

            }

        }

    })

}

export default fp(authPlugin)
```

Let's understand what happens when this hook executes.

First, Fastify verifies the JWT:

```typescript
await request.jwtVerify()
```

If the token is missing or invalid, the verification process throws an error, and we return `401 Unauthorized`.

We also include the HTTP `WWW-Authenticate` header with the Bearer scheme.

This is part of the correct HTTP semantics for a `401` authentication response.

If verification succeeds, we retrieve the user identifier from the token:

```typescript
const subject = request.user.sub
```

We validate its format and range before converting it into a database identifier.

This prevents malformed identifiers and values outside the supported PostgreSQL integer range from being used in our query.

We then retrieve the user from PostgreSQL:

```typescript
const user = await fastify.prisma.user.findUnique({

    where: {
        id: userId
    },

    select: {
        id: true,
        name: true,
        email: true,
        role: true
    }

})
```

We use this database lookup for an important reason.

Suppose an administrator loses their administrative role.

If we stored the role inside a JWT and trusted it for the entire token lifetime, an already-issued token could continue granting administrative access until it expired.

By retrieving the current user from PostgreSQL on protected requests, we use the latest stored role instead.

This introduces an additional database query for each authenticated request, but it provides more immediate control over account status and permissions.

It also means that a token belonging to a deleted account will no longer authenticate successfully.

Finally, we attach the authenticated user to the request:

```typescript
request.currentUser = user
```

From this point onward, protected route handlers can access the current user's information through:

```typescript
request.currentUser
```

This is much cleaner than repeatedly querying the user table inside every route.

## Understanding Authorization and Role-Based Access Control

Our authentication hook can now establish the identity of the current user.

However, we still need to determine what that user is allowed to do.

For example, a regular user should not be able to retrieve administrative information or access another user's tasks.

One common approach is **Role-Based Access Control (RBAC)**.

RBAC is an authorization model in which permissions are assigned to roles, and users receive permissions through their assigned roles.

Instead of defining permissions separately for every individual user, we assign users to predefined roles.

For our Task Management application, we will use two roles:

| Role | Permissions |
|---|---|
| USER | Manage personal tasks and access personal information. |
| ADMIN | Access administrative functionality and manage other users' resources. |

This makes authorization easier to implement and maintain.

### Creating an Authorization Hook

We already declared an `authorize` method in our Fastify type definitions.

Now we can implement it inside our authentication plugin.

The implementation was included in the previous section.

Let's examine its main functionality:

```typescript
fastify.decorate('authorize', (...allowedRoles: UserRole[]) => {

    return async (request, reply) => {

        const user = request.currentUser

        if (!user) {

            reply.code(401).send({
                error: 'Authentication required'
            })

            return

        }

        if (!allowedRoles.includes(user.role)) {

            reply.code(403).send({
                error: 'You do not have permission to access this resource'
            })

            return

        }

    }

})
```

The `authorize` function accepts a list of roles that are allowed to access a particular endpoint.

For example:

```typescript
fastify.authorize('ADMIN')
```

creates a hook that only allows administrators to continue.

When the hook executes, it retrieves the authenticated user:

```typescript
const user = request.currentUser
```

We first check whether the request has an authenticated user.

If not, we return `401 Unauthorized`.

Next, we check whether the user's role exists in the list of allowed roles:

```typescript
allowedRoles.includes(user.role)
```

If the user's role is not permitted, we return `403 Forbidden`.

Otherwise, the request continues to the route handler.

We now have two reusable mechanisms:

- `fastify.authenticate`: Establishes the identity of the current user.
- `fastify.authorize()`: Checks whether that user has the required role.

This allows us to protect different endpoints without repeating authentication and authorization logic.

### Understanding 401 vs 403

It is important to distinguish between these two HTTP status codes.

A `401 Unauthorized` response means that the request does not contain valid authentication credentials.

A `403 Forbidden` response means that the server understands who the user is, but the user is not allowed to perform the requested operation.

For example:

```text
GET /api/admin/users
```

If the request has no valid token, the server returns:

```text
401 Unauthorized
```

If the request belongs to an authenticated regular user, the server returns:

```text
403 Forbidden
```

This distinction helps clients understand whether they need to authenticate or whether they simply lack the required permissions.

## Protecting Routes Using Authentication and Authorization Hooks

Now that we have implemented both hooks, let's see how they work together inside a real route.

Consider an administrative endpoint that retrieves all registered users.

Only administrators should be able to access it.

We can define:

```typescript
fastify.get(
    '/admin/users',
    {
        preHandler: [
            fastify.authenticate,
            fastify.authorize('ADMIN')
        ]
    },
    async (request) => {

        return fastify.prisma.user.findMany({

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }

        })

    }
)
```

Notice that we pass an array of hooks to `preHandler`.

Fastify executes them in order.

First:

```typescript
fastify.authenticate
```

verifies the JWT and retrieves the current user.

Then:

```typescript
fastify.authorize('ADMIN')
```

checks whether the authenticated user has administrative privileges.

Only if both hooks succeed does Fastify execute the route handler.

This is an important architectural benefit of lifecycle hooks: we can compose multiple operations into the request-processing pipeline.

The same approach can be used for more complex requirements, such as checking subscription status, verifying permissions, or validating account restrictions before executing an endpoint.

## Implementing the Task Management API

We now have the main components required for authentication and authorization.

Let's combine them by building a small Task Management API.

The application will allow users to manage their tasks while enforcing access restrictions based on their identity and role.

We will implement the following endpoints:

```text
POST   /api/auth/register
POST   /api/auth/login

GET    /api/users/me

GET    /api/tasks
POST   /api/tasks

GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/admin/users
```

The authentication endpoints allow users to register and log in.

The `/api/users/me` endpoint retrieves information about the currently authenticated user.

The task endpoints allow users to manage their work, while the administrative endpoint demonstrates role-based access control.

We will also introduce pagination when retrieving tasks so the API does not need to return every database record at once.

### Creating the Task Routes Plugin

Create:

```bash
touch src/routes/tasks.ts
```

Inside this file:

**`src/routes/tasks.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'


type CreateTaskBody = {
    title: string
    description?: string
}

type UpdateTaskBody = {
    title?: string
    description?: string | null
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE'
}

type TaskListQuery = {
    page?: number
    limit?: number
}


// Task response schema

const taskResponseSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer'
        },

        title: {
            type: 'string'
        },

        description: {
            type: ['string', 'null']
        },

        status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'DONE']
        },

        createdById: {
            type: 'integer'
        },

        assigneeId: {
            type: ['integer', 'null']
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        },

        updatedAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [
        'id',
        'title',
        'description',
        'status',
        'createdById',
        'assigneeId',
        'createdAt',
        'updatedAt'
    ],

    additionalProperties: false

} as const


const createTaskSchema = {

    type: 'object',

    required: ['title'],

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: 'string',
            maxLength: 1000
        }

    },

    additionalProperties: false

} as const


const updateTaskSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        title: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S'
        },

        description: {
            type: ['string', 'null'],
            maxLength: 1000
        },

        status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'DONE']
        }

    },

    additionalProperties: false

} as const


const taskIdSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer',
            minimum: 1,
            maximum: 2147483647
        }

    },

    required: ['id'],

    additionalProperties: false

} as const


const taskListQuerySchema = {

    type: 'object',

    properties: {

        page: {
            type: 'integer',
            minimum: 1,
            maximum: 1000000,
            default: 1
        },

        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
        }

    },

    additionalProperties: false

} as const


const taskRoutes: FastifyPluginAsync = async (fastify) => {


    // Get tasks belonging to the current user

    fastify.get<{ Querystring: TaskListQuery }>(
        '/tasks',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                querystring: taskListQuerySchema,

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            data: {

                                type: 'array',

                                items: taskResponseSchema

                            },

                            pagination: {

                                type: 'object',

                                properties: {

                                    page: {
                                        type: 'integer'
                                    },

                                    limit: {
                                        type: 'integer'
                                    },

                                    total: {
                                        type: 'integer'
                                    },

                                    totalPages: {
                                        type: 'integer'
                                    }

                                },

                                required: [
                                    'page',
                                    'limit',
                                    'total',
                                    'totalPages'
                                ],

                                additionalProperties: false

                            }

                        },

                        required: [
                            'data',
                            'pagination'
                        ],

                        additionalProperties: false

                    }

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            const page = request.query.page ?? 1

            const limit = request.query.limit ?? 20


            const where = user.role === 'ADMIN'
                ? {}
                : { createdById: user.id }


            const skip = (page - 1) * limit


            const [tasks, total] = await Promise.all([

                fastify.prisma.task.findMany({

                    where,

                    orderBy: {
                        createdAt: 'desc'
                    },

                    skip,

                    take: limit

                }),

                fastify.prisma.task.count({
                    where
                })

            ])


            return {

                data: tasks,

                pagination: {

                    page,

                    limit,

                    total,

                    totalPages: Math.ceil(total / limit)

                }

            }

        }

    )



    // Create a new task

    fastify.post<{ Body: CreateTaskBody }>(
        '/tasks',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                body: createTaskSchema,

                response: {

                    201: taskResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {

                    body.title = body.title.trim()

                }

                if (typeof body?.description === 'string') {

                    body.description = body.description.trim()

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const task = await fastify.prisma.task.create({

                data: {

                    title: request.body.title,

                    description:
                        request.body.description || null,

                    createdById: user.id

                }

            })

            return reply.code(201).send(task)

        }

    )



    // Retrieve a specific task

    fastify.get<{ Params: { id: number } }>(
        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema,

                response: {

                    200: taskResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.id,

                    ...(user.role === 'ADMIN'
                        ? {}
                        : { createdById: user.id })

                }

            })


            if (!task) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            return task

        }

    )



    // Update a task

    fastify.patch<{
        Params: { id: number }
        Body: UpdateTaskBody
    }>(

        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema,

                body: updateTaskSchema,

                response: {

                    200: taskResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.title === 'string') {

                    body.title = body.title.trim()

                }

                if (typeof body?.description === 'string') {

                    body.description = body.description.trim()

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const where = {

                id: request.params.id,

                ...(user.role === 'ADMIN'
                    ? {}
                    : { createdById: user.id })

            }


            const [updatedTask] =
                await fastify.prisma.task.updateManyAndReturn({

                    where,

                    data: request.body

                })


            if (!updatedTask) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            return updatedTask

        }

    )



    // Delete a task

    fastify.delete<{ Params: { id: number } }>(
        '/tasks/:id',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const result = await fastify.prisma.task.deleteMany({

                where: {

                    id: request.params.id,

                    ...(user.role === 'ADMIN'
                        ? {}
                        : { createdById: user.id })

                }

            })


            if (result.count === 0) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            return reply.code(204).send()

        }

    )



    // Administrative endpoint

    fastify.get(
        '/admin/users',

        {

            preHandler: [

                fastify.authenticate,

                fastify.authorize('ADMIN')

            ],

            schema: {

                response: {

                    200: {

                        type: 'array',

                        items: {

                            type: 'object',

                            properties: {

                                id: {
                                    type: 'integer'
                                },

                                name: {
                                    type: 'string'
                                },

                                email: {
                                    type: 'string'
                                },

                                role: {
                                    type: 'string',
                                    enum: ['USER', 'ADMIN']
                                },

                                createdAt: {
                                    type: 'string',
                                    format: 'date-time'
                                }

                            },

                            required: [
                                'id',
                                'name',
                                'email',
                                'role',
                                'createdAt'
                            ],

                            additionalProperties: false

                        }

                    }

                }

            }

        },

        async () => {

            return fastify.prisma.user.findMany({

                select: {

                    id: true,

                    name: true,

                    email: true,

                    role: true,

                    createdAt: true

                }

            })

        }

    )

}

export default taskRoutes
```

Let's examine the important architectural decisions in these endpoints.

### Retrieving Tasks

The first endpoint retrieves tasks belonging to the authenticated user.

```typescript
fastify.get('/tasks', {
    preHandler: [
        fastify.authenticate
    ]
}, async (request) => {
    // ...
})
```

Because we use `fastify.authenticate`, the route handler cannot execute unless the request contains a valid access token associated with an existing user.

Inside the handler, we retrieve the current user:

```typescript
const user = request.currentUser!
```

The exclamation mark tells TypeScript that we expect this property to contain a user rather than `null`.

This expectation is established by our authentication hook, which either attaches a valid user or stops processing the request.

Next, we determine which tasks the user can retrieve.

For regular users:

```typescript
{ createdById: user.id }
```

restricts the query to tasks created by their account.

Administrators can retrieve all tasks.

Notice that this endpoint also supports pagination.

Instead of returning every task in the database, we retrieve a limited number of records:

```typescript
skip: (page - 1) * limit,
take: limit
```

We also retrieve the total number of matching records using `count()`.

This allows the API to provide pagination information without loading the entire result set into memory.

For example:

```text
GET /api/tasks?page=1&limit=20
```

The response includes both the retrieved tasks and pagination metadata.

### Creating Tasks

When a user creates a task, the backend retrieves their identity from the authenticated request.

```typescript
const user = request.currentUser!
```

Then, when creating the database record, we assign:

```typescript
createdById: user.id
```

This is a particularly important security decision.

We do not accept `createdById` or `assigneeId` from the client.

Otherwise, a malicious user could submit another user's identifier and attempt to create tasks under someone else's account or assign work without permission.

The ownership information must come from the verified server-side identity.

Assignment must be handled through a separate, authorized operation.

This principle should be applied to every resource that belongs to a particular user.

### Retrieving a Specific Task

For individual task requests, we need to verify not only that the user is authenticated but also that they are allowed to access the requested record.

Consider:

```typescript
const task = await fastify.prisma.task.findFirst({

    where: {

        id: request.params.id,

        ...(user.role === 'ADMIN'
            ? {}
            : { createdById: user.id })

    }

})
```

For regular users, the query includes both the task ID and the authenticated user's ID.

This means that even if someone changes the ID in the URL, the database will only return a task belonging to that user.

Administrators do not need the creator restriction.

If no accessible task is found, we return `404 Not Found`.

Notice that we use `404` rather than revealing that the record exists but belongs to another user. This avoids exposing information about resources that the caller is not permitted to access.

This is an important defense against Broken Object Level Authorization.

We also validate the task ID using JSON Schema.

The ID must be a positive integer within the range supported by our Prisma `Int` field.

Fastify's validation configuration can coerce numeric route parameters into integers, allowing us to use the validated value directly.

### Updating Tasks

The update endpoint follows the same ownership rule.

We first build a database filter containing the task ID and, for regular users, the creator ID.

We then use:

```typescript
fastify.prisma.task.updateManyAndReturn()
```

This applies the update only to records matching the ownership condition and returns the updated records.

Because the operation applies the ownership condition and update together in the database, we avoid retrieving an arbitrary record and then updating it without the same authorization restriction.

If no record matches, we return `404 Not Found`.

This approach is supported by Prisma for PostgreSQL.

### Deleting Tasks

The deletion endpoint uses the same approach.

We execute:

```typescript
fastify.prisma.task.deleteMany({

    where: {

        id: taskId,

        createdById: user.id

    }

})
```

For regular users, the database only deletes records belonging to them.

Administrators can delete records without the creator restriction.

We check the number of affected records:

```typescript
if (result.count === 0) {

    return reply.code(404).send({

        error: 'Task not found'

    })

}
```

Even when a user knows the identifier of another user's task, they cannot delete it through this endpoint.

This is an example of authorization enforced directly in the database query.

### Administrative Access

Finally, we define an endpoint for retrieving all registered users:

```typescript
fastify.get(
    '/admin/users',
    {
        preHandler: [
            fastify.authenticate,
            fastify.authorize('ADMIN')
        ]
    },
    async () => {
        // ...
    }
)
```

This route requires both authentication and the `ADMIN` role.

A regular user may authenticate successfully but will receive `403 Forbidden` when attempting to access the endpoint.

This demonstrates the difference between authenticating an identity and authorizing an operation.

Notice also that we explicitly select the fields returned from PostgreSQL and define a response schema.

This prevents the API from accidentally exposing fields such as `passwordHash`.

## Registering the Authentication and Task Plugins

Now that we have implemented our authentication and task routes, we need to register them inside our application.

We will also register a rate-limiting plugin to protect authentication endpoints.

Install it:

```bash
npm install @fastify/rate-limit
```

For Fastify 5, use a compatible release of `@fastify/rate-limit` (version 10 or newer).

Update `src/app.ts`.

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

import rateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'


export function buildApp() {

    const fastify = Fastify({

        logger: true

    })


    // Request hook

    fastify.addHook('onRequest', async (request) => {

        request.log.info({

            method: request.method,

            route: request.routeOptions.url

        }, 'Incoming request')

    })


    // Response hook

    fastify.addHook('onSend', async (request, reply, payload) => {

        reply.header('X-Application', 'Task Manager')

        return payload

    })


    // After-response hook

    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({

            statusCode: reply.statusCode

        }, 'Request completed')

    })


    // Application hooks

    fastify.addHook('onReady', async () => {

        fastify.log.info(
            'Application initialized successfully'
        )

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info(
            'Application shutdown completed'
        )

    })


    // Register database functionality

    fastify.register(prismaPlugin)


    // Register JWT authentication

    fastify.register(authPlugin)


    // Register rate limiting.
    // Routes can define their own limits.

    fastify.register(rateLimit, {

        global: false

    })


    // Register authentication routes

    fastify.register(authRoutes, {

        prefix: '/api/auth'

    })


    // Register user routes

    fastify.register(userRoutes, {

        prefix: '/api/users'

    })


    // Register task routes

    fastify.register(taskRoutes, {

        prefix: '/api'

    })


    return fastify

}
```

Notice that the Prisma plugin is registered before the authentication plugin because authentication requires access to the database.

Similarly, the authentication plugin must be registered before the route plugins that use its decorators.

The rate-limiting plugin is registered before the routes so that its route-level configuration can be applied.

We use:

```typescript
global: false
```

because we do not want to apply the same restrictive rate limit to every endpoint.

Instead, our registration and login endpoints define their own limits.

We also register the application hooks before the routes so that they are available throughout the application scope.

The Prisma plugin from Workshop 3 already contains its own `onClose` hook, so we do not need to disconnect Prisma again here.

Its plugin is responsible for releasing the database connection when Fastify shuts down.

Our `server.ts` file remains unchanged because the existing application startup process is still valid.

The resulting endpoints are:

```text
POST /api/auth/register
POST /api/auth/login

GET  /api/users/me

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET /api/admin/users
```

## Retrieving the Authenticated User

We have implemented registration, login, and protected task endpoints.

However, clients often need to retrieve information about the currently authenticated user.

For example, a front-end application might need to display the user's name, email address, and role after login.

We will create a separate user routes plugin for user-related operations.

Create:

```bash
touch src/routes/users.ts
```

**`src/routes/users.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'


const currentUserSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer'
        },

        name: {
            type: 'string'
        },

        email: {
            type: 'string'
        },

        role: {
            type: 'string',
            enum: ['USER', 'ADMIN']
        }

    },

    required: [
        'id',
        'name',
        'email',
        'role'
    ],

    additionalProperties: false

} as const


const userRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(

        '/me',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {

                    200: currentUserSchema

                }

            }

        },

        async (request) => {

            return request.currentUser

        }

    )

}

export default userRoutes
```

Because the route uses our authentication hook, the handler receives the authenticated user through:

```typescript
request.currentUser
```

This endpoint is useful when a client needs to retrieve the currently authenticated identity.

It also gives us a convenient endpoint for testing authentication.

We will use the same user routes plugin later when implementing profile updates.

## Promoting a User to Administrator

By default, every registered account receives the `USER` role.

For development purposes, we need a way to promote one of our accounts to `ADMIN`.

We can do this through Prisma Studio.

Start it:

```bash
npx prisma studio
```

Open the User model and locate the account you want to promote.

Change its role from:

```text
USER
```

to:

```text
ADMIN
```

Save the change.

We can also perform this operation directly through PostgreSQL:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'admin@example.com';
```

This is an administrative operation and must not be exposed through public registration.

Because our authentication hook retrieves the current user role from PostgreSQL on every protected request, the new permissions take effect immediately for subsequent requests using an otherwise valid token.

For production applications, role management should itself be protected by appropriate administrative authorization.

## Testing Authentication and Authorization

Now that our application is implemented, we need to verify that its security mechanisms work correctly.

We will use `curl` to send HTTP requests directly to our server.

Make sure PostgreSQL is running and start the application:

```bash
npm run dev
```

### 1. Registering a New User

Send a registration request:

```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Alice",
        "email": "alice@example.com",
        "password": "AliceSecurePassphrase2026!"
    }'
```

The server validates the submitted information, hashes the password, and creates the account in PostgreSQL.

A successful response should return:

```text
201 Created
```

The response contains the user's public information, but it does not expose the password hash.

We can also test invalid input:

```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{}'
```

This request should return:

```text
400 Bad Request
```

It should not produce an internal server error.

This is particularly important because our normalization hook executes before schema validation.

### 2. Logging In

Now authenticate using the registered credentials:

```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "alice@example.com",
        "password": "AliceSecurePassphrase2026!"
    }'
```

The server verifies the password and generates an access token.

The response should contain something similar to:

```json
{
    "message": "Login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "USER"
    }
}
```

Copy the generated access token.

For convenience, store it in a shell variable:

```bash
ALICE_TOKEN="PASTE_YOUR_ACCESS_TOKEN_HERE"
```

### 3. Accessing a Protected Endpoint

Try accessing the current user's information without providing a token:

```bash
curl -i http://127.0.0.1:3000/api/users/me
```

The server should return:

```text
401 Unauthorized
```

This happens because the request does not contain valid authentication credentials.

Now send the token:

```bash
curl -i http://127.0.0.1:3000/api/users/me \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

The request should succeed and return the authenticated user's information.

### 4. Creating a Task

Now create a task:

```bash
curl -i -X POST http://127.0.0.1:3000/api/tasks \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Complete Fastify Workshop",
        "description": "Review authentication and authorization."
    }'
```

The server verifies the token and retrieves the authenticated user.

It then creates the task and automatically associates it with that user's account.

Notice that we do not provide a `createdById` or `assigneeId` in the request.

The backend determines the creator using the authenticated identity.

### 5. Retrieving Tasks

To retrieve tasks belonging to the authenticated user:

```bash
curl -i http://127.0.0.1:3000/api/tasks \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

The server returns the tasks associated with Alice, along with pagination information.

We can also specify a page and limit:

```bash
curl -i "http://127.0.0.1:3000/api/tasks?page=1&limit=10" \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

If another regular user logs in, their request will return only the tasks created by their account.

### 6. Updating a Task

Assuming the newly created task has ID `1`, we can update it:

```bash
curl -i -X PATCH http://127.0.0.1:3000/api/tasks/1 \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "status": "IN_PROGRESS"
    }'
```

The task status should now be updated.

We can verify this by retrieving the task again.

### 7. Deleting a Task

We can delete the task using:

```bash
curl -i -X DELETE http://127.0.0.1:3000/api/tasks/1 \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

The server checks whether the authenticated user created the task or has administrative privileges before deleting it.

A successful deletion returns:

```text
204 No Content
```

### 8. Testing Authorization

Now promote another account to administrator through Prisma Studio or PostgreSQL.

Log in using that account and copy its access token:

```bash
ADMIN_TOKEN="PASTE_ADMIN_ACCESS_TOKEN_HERE"
```

Try accessing:

```bash
curl -i http://127.0.0.1:3000/api/admin/users \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

A regular user should receive:

```text
403 Forbidden
```

Now try the same endpoint using the administrator's token:

```bash
curl -i http://127.0.0.1:3000/api/admin/users \
    -H "Authorization: Bearer $ADMIN_TOKEN"
```

An administrator should receive the list of registered users.

This confirms that authentication and authorization are working independently:

- Authentication determines whether the request belongs to a valid user.
- Authorization determines whether that user has permission to perform the requested operation.

### 9. Testing Resource Ownership

To verify that our application prevents users from accessing each other's data, create two regular accounts.

Log in as Alice and create a task.

Then register Bob, log in, and save his token:

```bash
BOB_TOKEN="PASTE_BOB_ACCESS_TOKEN_HERE"
```

Attempt to access Alice's task using Bob's token:

```bash
curl -i http://127.0.0.1:3000/api/tasks/1 \
    -H "Authorization: Bearer $BOB_TOKEN"
```

Bob should receive:

```text
404 Not Found
```

Even though the task exists, the database query includes Bob's user ID as an ownership condition.

Therefore, the application does not return Alice's task.

The same ownership restrictions should apply when Bob attempts to update or delete Alice's task.

This is one of the most important aspects of authorization: protecting not only endpoints but also the individual resources accessed through them.

### 10. Testing Rate Limiting

Our login endpoint allows a maximum of five requests per minute from the same client under the configured default rate-limit behavior.

To observe this, send several login requests within the same time window.

After the configured limit is exceeded, the server should return:

```text
429 Too Many Requests
```

This demonstrates how rate limiting helps protect authentication endpoints against repeated automated requests.

Remember that this example uses the plugin's default in-memory store.

Production systems running multiple server instances should use an appropriate shared storage mechanism, such as Redis, so that request limits are enforced consistently across instances.

## Important Security Considerations

The authentication and authorization mechanisms we implemented provide a foundation for securing backend applications.

However, production systems require additional controls.

### Password Security

Passwords must be hashed using an appropriate password-hashing algorithm such as Argon2id.

We must never store original passwords in the database.

The hashing parameters should also be benchmarked against the target system to balance security and authentication performance.

### Authentication Rate Limiting

Authentication endpoints should be protected against automated guessing attacks through rate limiting and monitoring.

For larger production systems, rate-limit storage should be shared across server instances.

Additional controls may include progressive delays, abuse detection, and account-level monitoring.

### Account Enumeration

Login responses should not reveal whether an account exists.

We use a generic login error and a dummy Argon2 hash to reduce differences between the existing-account and unknown-account paths.

However, registration can still reveal account existence through its `409` response.

For applications requiring stronger account privacy, account verification and uniform registration responses should be considered.

### JWT Security

JWT secrets must remain private, tokens should have appropriate expiration times, and production communication must use HTTPS.

We explicitly restrict verification to HS256 because that is the signing algorithm selected by our application.

We should also remember that signed JWTs are not encrypted.

Their payloads must never contain secrets or sensitive personal information.

### Token Revocation

Our current implementation uses short-lived access tokens without refresh tokens or server-side token records.

Consequently, a stolen access token can still be used until it expires, provided the associated user account remains valid.

Immediate token invalidation requires additional mechanisms, such as a token denylist, token versioning, or server-side sessions.

### Browser Token Storage

Browser applications need a deliberate token-storage strategy.

Storing tokens in `localStorage` exposes them to JavaScript executing in the same origin.

HttpOnly, Secure, appropriately configured SameSite cookies or a Backend-for-Frontend architecture are alternatives.

Cookie-based authentication must also include appropriate CSRF protection.

### Authorization

Authentication does not replace authorization.

Every operation involving user-owned resources must verify that the authenticated user has permission to access the specific record.

We have demonstrated this by including ownership restrictions directly in our Prisma queries.

### Input Validation

We must validate all data received from clients, including:

- Request bodies.
- Route parameters.
- Query parameters.

TypeScript interfaces do not validate HTTP requests at runtime.

JSON Schema provides that runtime validation.

We must also remember that lifecycle hooks such as `preValidation` execute before schema validation, so any input manipulation performed there must handle missing and unexpected values safely.

### Response Security

We should avoid exposing:

- Password hashes.
- Internal database errors.
- Signing secrets.
- Access tokens in logs.
- Other sensitive application information.

Using explicit Prisma `select` statements and Fastify response schemas helps control what leaves our application.

### Additional Authentication Features

The purpose of this workshop is to establish the correct security architecture.

More advanced mechanisms, including refresh-token rotation, password reset, multi-factor authentication, account verification, and fine-grained permissions, can be introduced in later workshops.

## Tasks

Now that we understand how authentication, authorization, and lifecycle hooks work together, let's apply these concepts through practical exercises.

### Task 1: Authentication and User Management

Extend the Task Management application by implementing additional user-related functionality.

Create the following endpoints:

```text
GET   /api/users/me
PATCH /api/users/me
```

The first endpoint should retrieve the authenticated user's profile.

The second should allow users to update their own names and email addresses.

Additional requirements:

- Require authentication for both endpoints.
- Validate incoming information using JSON Schema.
- Normalize email addresses before updating them.
- Prevent duplicate email addresses.
- Never allow users to modify their own roles through this endpoint.
- Never expose password hashes.
- Handle Prisma unique-constraint errors appropriately.
- Consider whether changing an email address should require email verification.

### Task 2: Role-Based Access Control

Extend the application with a new role called `MANAGER`.

The application should now support three roles:

```text
USER
MANAGER
ADMIN
```

Update the Prisma schema:

```prisma
enum Role {
    USER
    MANAGER
    ADMIN
}
```

Remember that modifying a Prisma enum requires a database migration.

Define the permissions as follows:

| Operation | USER | MANAGER | ADMIN |
|---|---|---|---|
| View own tasks | Yes | Yes | Yes |
| Create tasks | Yes | Yes | Yes |
| Update own tasks | Yes | Yes | Yes |
| Delete own tasks | Yes | Yes | Yes |
| View all tasks | No | Yes | Yes |
| Manage users | No | No | Yes |

Update the authorization type definitions and implement the necessary authorization checks.

The `MANAGER` role should be able to view all tasks without automatically receiving administrative privileges.

### Task 3: Implement a Task Assignment System

Extend the Task Management application so that administrators and managers can assign tasks to other users.

We have already introduced the distinction between the task creator and its assignee in our Prisma schema.

Remember:

- `createdById` identifies the user who created the task.
- `assigneeId` identifies the user responsible for completing it.

Assigning a task must not change its original creator.

Add an endpoint:

```text
PATCH /api/tasks/:id/assign
```

The endpoint should accept a user ID and assign the specified task to that user.

Only managers and administrators should be allowed to perform this operation.

Additional requirements:

- Validate the submitted user ID.
- Ensure that the assigned user exists.
- Prevent regular users from assigning tasks.
- Return an appropriate error when the task does not exist.
- Return an appropriate error when the assigned user does not exist.
- Do not allow the client to change `createdById` through this endpoint.
- Use `assigneeId` to store the new assignment.

Also extend the task-access rules:

- Users should be able to retrieve tasks they created or tasks assigned to them.
- Regular users may update the status of tasks assigned to them, but should not be able to modify their title or description.
- Task creators may manage the tasks they created.
- Managers and administrators may access and manage all tasks according to their roles.

This task introduces another important authorization concept:

**Permission to perform an operation can depend on the user's role, their relationship with a resource, and the specific operation being performed.**

### Task 4: Experiment with Fastify Hooks

Create a separate plugin demonstrating different Fastify lifecycle hooks.

Your implementation should:

- Log every incoming request using `onRequest`.
- Normalize submitted usernames using `preValidation`.
- Add a custom response header using `onSend`.
- Record completed requests using `onResponse`.
- Log errors using `onError`.
- Display application initialization using `onReady`.
- Perform cleanup logging using `onClose`.

Create a simple endpoint that allows you to observe the hooks executing in the expected order.

The objective is to understand how Fastify's lifecycle hooks can be used to implement functionality that applies across multiple routes without duplicating code.

Also experiment with plugin encapsulation:

1. Register a decorator inside a normal plugin.
2. Try accessing it outside that plugin.
3. Wrap the plugin with `fastify-plugin`.
4. Observe how its visibility changes.

## Conclusion

In this workshop, we explored how to secure backend applications by implementing authentication and authorization using Fastify.

We started by understanding the distinction between verifying a user's identity and determining what that user is allowed to access.

We then examined Fastify's request, response, and application hooks, learning how they can be used to execute shared functionality at different stages of the application lifecycle.

We also explored Fastify's plugin architecture and encapsulation, understanding how decorators and shared functionality can be exposed across different parts of an application.

Next, we explored authentication mechanisms, password hashing, and JSON Web Tokens.

We implemented user registration and login using Argon2id and `@fastify/jwt`, then created reusable hooks to authenticate requests and enforce role-based permissions.

Finally, we integrated these mechanisms with PostgreSQL and Prisma to build a protected Task Management API.

The application can now identify users, assign permissions, manage individual resources, and prevent unauthorized access to other users' information.

We also introduced important security practices, including password verification, rate limiting, input validation, response schemas, and resource-level authorization.

These concepts are essential for building backend systems that handle private information and operations involving multiple users.

In the next workshop, we will build on these foundations by exploring more advanced backend application architecture, including services, repositories, centralized error handling, and automated testing.

This will help us move from a collection of working endpoints toward a more structured, maintainable, and scalable backend application.

## References

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Fastify Lifecycle Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [Fastify Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [Fastify Plugin Architecture](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify TypeScript Reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [@fastify/jwt Documentation](https://github.com/fastify/fastify-jwt)
- [@fastify/rate-limit Documentation](https://github.com/fastify/fastify-rate-limit)
- [Argon2 Documentation](https://github.com/ranisalt/node-argon2)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma ORM Documentation](https://www.prisma.io/docs/orm/v7)
- [Prisma Relations](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/relations)
- [Prisma Client Reference](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)