# Introduction to Backend Development with Node.js, Fastify, and TypeScript

## Objectives

By the end of this workshop, we will understand how backend applications communicate with clients and how to build a basic HTTP server using Node.js, Fastify, and TypeScript.

We will learn how to:

- Understand backend development and the client-server architecture.
- Understand the roles of Node.js, Fastify, and TypeScript.
- Explore Fastify's plugin-based architecture and encapsulation.
- Understand the HTTP request-response lifecycle and lifecycle hooks.
- Set up a Node.js project using TypeScript and Fastify.
- Create and run our first Fastify application.
- Work with HTTP requests, responses, methods, and status codes.
- Define routes and work with URL and query parameters.
- Organize application functionality using plugins.
- Build a simple REST-style JSON API.
- Validate incoming data and serialize responses using JSON Schema.

## What is Backend Development?

When we interact with a website or mobile application, we primarily see its front-end: the buttons, text, images, forms, and other elements displayed on our screens. However, these elements are only the user-facing part of a larger system.

Behind the scenes, another part of the application processes information, manages data, and performs the operations required to make the application work. This part is known as the **backend**, also called the server-side.

Backend development involves building and maintaining this server-side functionality. For example, when a user creates an account, the backend receives the submitted information, validates it, and stores it in a database. When that user logs in later, the backend verifies their credentials and determines whether they are allowed to access protected resources.

The backend is also responsible for implementing business logic. This includes enforcing application rules, performing calculations, processing transactions, and coordinating operations between different services.

Another important responsibility is communication with the front-end. The backend receives requests from clients, processes them, and returns responses containing the information or results they need.

Essentially, the front-end provides the interface through which users interact with an application, while the backend implements much of the functionality that makes those interactions possible.

### Understanding the Client-Server Architecture

To understand how the front-end communicates with the backend, we first need to understand the **Client-Server Architecture**.

In this architecture, an application is divided into two main components:

- **Client:** The application used by the user, such as a web browser or mobile application. It sends requests to the server and displays the responses.
- **Server:** The application responsible for receiving requests, executing business logic, accessing resources such as databases, and sending responses back to clients.

Communication between these components commonly happens through the **HTTP protocol (Hypertext Transfer Protocol)**.

Let's consider an online store where a user wants to display a list of available products.

The process begins when the client sends an HTTP request asking the server for the products. The backend receives that request, determines what operation is required, and executes the corresponding business logic. It might retrieve the product information from a database before constructing an HTTP response containing the results.

The client then receives the response and uses the returned information to update its interface.

The communication can be represented as follows:

```text
             CLIENT
       (Browser / Mobile App)
                 |
                 |
           HTTP Request
                 |
                 v
              SERVER
          (Backend App)
                 |
                 v
           Business Logic
                 |
                 v
              Database
                 |
                 v
          HTTP Response
                 |
                 v
              CLIENT
```

Notice that the client does not need to know how the server stores or processes the information internally. It only needs to understand how to communicate with the backend through its API.

This separation is particularly useful because the same backend can serve different clients. For example, a website, a mobile application, and another external service can all communicate with the same backend API.

In this workshop, we will focus on building this server-side component using Node.js, Fastify, and TypeScript.

## Introduction to Node.js, Fastify, and TypeScript

Before building our backend application, we need to understand the technologies we will use and, more importantly, the role each one plays.

### Node.js

Node.js is a **JavaScript runtime environment** that allows us to execute JavaScript code outside the browser.

JavaScript is traditionally associated with web browsers, where it controls the behavior of web pages. Node.js allows us to use the same language to build server-side applications and other programs that run directly on a computer or server.

Node.js uses the V8 JavaScript engine and provides built-in modules that allow us to interact with the operating system and perform operations that would not normally be available to browser JavaScript.

For example, its built-in modules include:

- `http`: Creating HTTP servers and handling HTTP communication.
- `fs`: Reading, writing, and managing files.
- `path`: Working with file and directory paths.
- `crypto`: Performing cryptographic operations.

Node.js also provides an asynchronous, event-driven approach to handling I/O operations. This makes it particularly suitable for applications that spend much of their time communicating with databases, reading files, or interacting with external services.

However, Node.js is not a web framework. Although it provides the underlying capabilities required to create HTTP servers, building an entire backend directly with its native modules can require considerable additional code.

This is where web frameworks become useful.

### Fastify

Fastify is a **high-performance web framework built on top of Node.js**.

While Node.js provides the runtime environment and the underlying APIs for handling HTTP communication, Fastify provides a structured way to build web servers and APIs.

Instead of manually handling every aspect of incoming HTTP requests, we can use Fastify's APIs to define routes, organize functionality, validate data, and construct responses.

For example, Fastify provides:

- **Routing:** Defining how the application responds to different HTTP methods and URLs.
- **Plugin Architecture:** Organizing functionality into independent and reusable modules.
- **Request and Response Handling:** Accessing incoming request information and constructing HTTP responses.
- **Lifecycle Hooks:** Executing custom logic at specific stages of request processing.
- **Schema Validation:** Validating incoming data using JSON Schema.
- **Response Serialization:** Efficiently converting application data into JSON responses.

Fastify is designed to keep request handling efficient while providing an architecture suitable for applications that grow in complexity.

We choose Fastify when we want a lightweight and flexible framework with strong performance characteristics, a modular architecture, and built-in support for common API development tasks.

### TypeScript

Since we will use TypeScript throughout this workshop, we also need to understand what it is and why it is useful.

TypeScript is a programming language built on top of JavaScript that introduces a **static type system**.

JavaScript is dynamically typed, meaning that variables can hold values of different types during execution without requiring us to declare their types explicitly.

For example:

```javascript
let username = "Alice";

username = 25;
```

JavaScript allows this assignment because it does not enforce a fixed type for the variable.

TypeScript allows us to describe the types of values we expect:

```typescript
let username: string = "Alice";

username = 25; // TypeScript Error
```

Here, we explicitly declare that `username` must contain a string. TypeScript detects the incorrect assignment during development, before the application is executed.

This helps us catch programming mistakes earlier and makes our code easier to understand.

TypeScript also provides better editor support, including autocomplete, navigation, and more useful error information. These features become increasingly valuable as applications grow and their codebases become more complex.

However, there is an important detail to understand: **TypeScript types do not exist at runtime.**

TypeScript code is transformed into JavaScript before Node.js executes it. During this process, TypeScript-specific information, such as type annotations and interfaces, is removed.

This means that TypeScript can check the code we write, but it cannot automatically guarantee that information received from an external client follows our declared types.

For example, declaring that a user's age is a number does not prevent someone from sending a request containing a string instead.

We will address this distinction later when we introduce runtime validation using JSON Schema.

During development, we will use a tool called `tsx` to execute TypeScript files directly without manually compiling them first.

### Understanding the Relationship Between Node.js, Fastify, and TypeScript

Now that we understand each technology individually, let's connect them.

These technologies have different responsibilities, but they work together when developing a backend application.

We write our application using TypeScript, which provides static type checking during development. TypeScript is then transformed into JavaScript, which is executed by the Node.js runtime.

Within that application, we use Fastify to create the HTTP server, define routes, and handle incoming requests.

Their relationship can be represented as follows:

```text
          TypeScript
        (Source Code)
              |
              v
          JavaScript
        (Compiled Code)
              |
              v
            Node.js
       (Runtime Environment)
              |
              v
           Fastify
        (Web Framework)
              |
              v
       HTTP Server and API
```

In other words, Node.js provides the environment in which our backend runs, Fastify provides the framework used to build the server, and TypeScript helps us write and maintain the application code.

Understanding this distinction will make the development process much easier because we will know which technology is responsible for each part of our application.

## Understanding Fastify's Plugin-Based Architecture

One of the defining characteristics of Fastify is its **plugin-based architecture**.

As an application grows, placing all its functionality inside one file quickly becomes difficult to maintain. We need a way to separate responsibilities, reuse functionality, and prevent different parts of the application from becoming unnecessarily dependent on one another.

Fastify addresses this through plugins.

### Plugins

A plugin is a function that allows us to extend a Fastify application with additional functionality.

A plugin can define routes, register lifecycle hooks, add decorators, connect to databases, or provide other services needed by the application.

For example, imagine that we are building an online store. Instead of implementing everything inside one file, we can separate the application into different plugins:

```text
             FASTIFY APPLICATION
                      |
          ┌───────────┼───────────┐
          |           |           |
          v           v           v
        USERS      PRODUCTS    DATABASE
        PLUGIN      PLUGIN      PLUGIN
          |           |           |
          v           v           v
       User API   Product API  Connection
```

Each plugin focuses on a particular responsibility. This separation makes the application easier to understand and allows us to develop individual components without having to modify the entire codebase.

A plugin is not necessarily a route file. Routes are only one possible responsibility of a plugin. We can also create plugins for database connections, authentication, logging, and other shared functionality.

### Creating a Simple Plugin

Let's understand how plugins work through a simple example.

Create a file named `users.ts` inside a directory called `routes`.

**`users.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const usersPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.get('/users', async () => {
        return {
            message: 'User routes'
        }
    })

}

export default usersPlugin
```

Here, we define a plugin called `usersPlugin`.

The `FastifyPluginAsync` type describes an asynchronous Fastify plugin. Fastify provides the `fastify` instance as an argument when the plugin is registered, allowing us to extend the application or define routes within its scope.

Inside the plugin, we use `fastify.get()` to define a GET route. This route returns a JSON object containing a simple message.

Exporting the plugin makes it available to other files. However, defining a plugin does not automatically make its functionality available in the application. We must register it using `fastify.register()`.

For example:

```typescript
fastify.register(usersPlugin)
```

This tells Fastify to load the plugin and register the functionality it provides.

### Understanding Encapsulation

An important characteristic of Fastify's plugin architecture is **encapsulation**.

Whenever we register a normal plugin using `fastify.register()`, Fastify creates a new scope for that plugin.

This means that functionality added inside the plugin, such as decorators and hooks, is available within that plugin and its child plugins, but it is not automatically available to its parent or sibling plugins.

Consider an application containing two independent route plugins:

```text
           MAIN APPLICATION
                  |
          ┌───────┴───────┐
          |               |
          v               v
      USERS PLUGIN   PRODUCTS PLUGIN
          |               |
          v               v
       User Routes    Product Routes
       User Hooks     Product Hooks
```

The two plugins have separate scopes. A decorator created inside the users plugin, for example, is not automatically available inside the products plugin.

This prevents unrelated components from accidentally depending on each other's internal functionality.

However, applications often need to share resources. A database connection, for example, may need to be accessible to both the users and products plugins.

To achieve this, we must deliberately expose the shared functionality at an appropriate parent scope. Fastify provides mechanisms such as `fastify-plugin` for this purpose.

The important idea is that plugin registration creates boundaries, and we should decide intentionally which functionality belongs inside each boundary and which functionality needs to be shared.

This makes the architecture more predictable and reduces unwanted dependencies between different parts of an application.

### Lifecycle Hooks

While plugins help us organize application functionality, Fastify also provides **lifecycle hooks** to execute custom logic during request processing.

A hook is a function that runs at a specific stage of the HTTP request-response lifecycle.

For example, we might want to log incoming requests, check whether a user is authenticated, or perform an operation before sending a response. Instead of repeating this logic in every route handler, we can register hooks to execute it at the appropriate stage.

Some commonly used hooks include:

- `onRequest`: Runs when Fastify begins processing a routed request.
- `preParsing`: Runs before the request payload is parsed.
- `preValidation`: Runs before request validation.
- `preHandler`: Runs after validation and before the route handler.
- `preSerialization`: Runs before an applicable response payload is serialized.
- `onSend`: Runs before the response is sent.
- `onResponse`: Runs after the response has been sent.
- `onError`: Runs when an error occurs during request processing.

To understand where these hooks execute, let's examine the request lifecycle.

```text
          INCOMING REQUEST
                  |
                  v
                ROUTING
                  |
                  v
             INSTANCE LOGGER
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
                Reply
                  |
                  v
           preSerialization
                  |
                  v
                onSend
                  |
                  v
            HTTP Response
                  |
                  v
              onResponse
```

This is the normal request-processing path. Errors create separate paths through Fastify's error-handling mechanisms, so hooks such as `onError` do not form another mandatory step in the normal sequence.

Also, `preSerialization` is not executed for every response payload. For example, it is skipped for strings, buffers, streams, and `null`.

Notice that routing happens before `onRequest`. Fastify first determines which route matches the incoming request and then executes the corresponding lifecycle stages.

Understanding this order is important because different operations belong at different stages. For example, request-body validation must happen after the body has been parsed, while logging can be performed near the beginning of processing.

### Creating a Simple Hook

Let's see how to register a hook that logs incoming requests.

```typescript
fastify.addHook('onRequest', async (request) => {
    fastify.log.info(
        `${request.method} ${request.url}`
    )
})
```

Here, we register an `onRequest` hook. Whenever a request reaches the scope where this hook applies, Fastify executes the callback.

The `request` object provides information about the incoming request, including its HTTP method and URL.

We use this information to generate a log message.

For example, visiting:

```text
http://localhost:3000/
```

will produce a log entry containing:

```text
GET /
```

And visiting:

```text
http://localhost:3000/users/Alice
```

will produce:

```text
GET /users/Alice
```

Hooks can be registered at different plugin scopes. A hook registered in the main application can apply to routes inside its child plugins, while a hook registered inside a particular plugin remains limited to that plugin and its descendants.

An important difference from Express is that Fastify's built-in extension and request-processing model is centered around plugins and lifecycle hooks rather than relying on the same middleware-based approach.

We will use these features as our application becomes more complex.

## Structure of a Fastify Application

Before implementing our server, it is useful to establish a project structure that separates application initialization from individual responsibilities.

For our workshop, we will use the following structure:

```text
my_fastify_project/
│
├── src/
│   │
│   ├── plugins/          # Shared application functionality
│   │   ├── database.ts
│   │   └── authentication.ts
│   │
│   ├── routes/           # Route plugins
│   │   ├── users.ts
│   │   ├── search.ts
│   │   └── products.ts
│   │
│   ├── app.ts            # Creates and configures Fastify
│   └── server.ts         # Starts the HTTP server
│
├── dist/                 # Compiled JavaScript files
│
├── node_modules/         # Installed dependencies
│
├── package.json          # Project configuration and dependencies
├── package-lock.json     # Exact dependency versions
└── tsconfig.json         # TypeScript compiler configuration
```

Let's understand how these parts fit together.

The `src` directory contains the application's TypeScript source code. Inside it, we separate shared infrastructure plugins from route plugins.

The `plugins` directory is intended for functionality used by different parts of the application, such as database connections and authentication.

The `routes` directory contains plugins responsible for defining related API endpoints. For example, all endpoints related to users can be placed inside `users.ts`, while product-related endpoints belong in `products.ts`.

The `app.ts` file creates the Fastify instance and configures the application by registering its routes, hooks, and other plugins.

The `server.ts` file is responsible for starting the HTTP server. Keeping server startup separate from application construction makes it easier to reuse the application in automated tests without opening a network port.

The `dist` directory contains the JavaScript files generated by the TypeScript compiler. These are the files that Node.js will execute in production.

Finally, `node_modules` contains installed packages, `package.json` stores project information and dependencies, `package-lock.json` records the exact dependency versions installed by npm, and `tsconfig.json` defines how TypeScript processes our source files.

We will not implement every directory in this workshop. The structure simply gives us a clear place for each responsibility as our application develops.

## Creating Our First Fastify Application

Now that we understand the architecture, let's build our first Fastify application.

We will begin by setting up the development environment, configuring TypeScript, and creating a basic server that responds to an HTTP request.

### Setting Up the Environment

Before getting started, make sure Node.js and npm are installed on your system.

Fastify 5 requires Node.js 20 or newer. It is recommended to use a currently supported Node.js LTS release.

You can verify your installed versions using:

```bash
node -v
npm -v
```

Next, create a new project directory and initialize it using npm:

```bash
mkdir my_fastify_project
cd my_fastify_project

npm init -y
```

The `npm init -y` command initializes a new Node.js project and generates a `package.json` file using the default configuration.

### Installing Fastify and TypeScript

With the project initialized, we can install Fastify:

```bash
npm install fastify
```

Next, install TypeScript and the development dependencies:

```bash
npm install -D typescript tsx @types/node
```

These packages serve different purposes.

The `fastify` package provides the web framework we will use to build our backend application.

The `typescript` package provides the TypeScript compiler, which checks our source code and transforms it into JavaScript.

The `tsx` package allows us to execute TypeScript files directly during development. It also provides a watch mode that automatically restarts the application when files change.

The `@types/node` package provides TypeScript definitions for Node.js APIs, allowing TypeScript to understand built-in objects and modules such as `process` and `http`.

Notice that we do not need to install a separate Fastify types package because Fastify already includes its TypeScript definitions.

### Configuring the Module System

Node.js supports different module systems, primarily CommonJS and ECMAScript Modules (ESM).

For this workshop, we will use **ECMAScript Modules**, which use the standard `import` and `export` syntax.

Open `package.json` and add:

```json
{
    "type": "module"
}
```

This tells Node.js to interpret ordinary `.js` files in this package as ECMAScript Modules.

Since we are using TypeScript with modern Node.js module resolution, we will also configure the compiler to understand the same module system.

### Configuring TypeScript

Create a file named `tsconfig.json` in the project's root directory:

**`tsconfig.json`:**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "rootDir": "./src",
        "outDir": "./dist",
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*.ts"]
}
```

Let's understand the most important options.

The `target` option specifies the JavaScript language version generated by the compiler. We use ES2022 as our target.

The `module` and `moduleResolution` options configure TypeScript to follow Node.js's modern module system. This allows TypeScript to understand how Node.js resolves ECMAScript Modules.

The `rootDir` option identifies the directory containing our source files, while `outDir` specifies where the compiled JavaScript files will be generated.

The `strict` option enables strict type-checking rules, helping us detect potential programming errors.

We also enable `noUncheckedIndexedAccess`. This option makes indexed access more accurate by considering that a key might not exist in an object or record.

This will be useful when we access products by their IDs later in the workshop.

The `esModuleInterop` option improves compatibility when importing packages that use CommonJS exports.

Finally, `skipLibCheck` skips type-checking declaration files from dependencies, and `forceConsistentCasingInFileNames` helps prevent problems caused by inconsistent file-name casing.

The `include` option tells TypeScript to process the `.ts` files inside our `src` directory.

**An important detail about NodeNext:** When we import another local TypeScript file, we will use its future JavaScript extension in the import path.

For example:

```typescript
import usersRoutes from './routes/users.js'
```

Although the source file is named `users.ts`, the generated JavaScript file will be named `users.js`. Using the `.js` extension allows the compiled application to resolve the module correctly when Node.js executes it.

### Configuring npm Scripts

Next, modify the `scripts` section of `package.json`:

```json
{
    "scripts": {
        "dev": "tsx watch src/server.ts",
        "typecheck": "tsc --noEmit",
        "build": "tsc -p tsconfig.json",
        "start": "node dist/server.js"
    }
}
```

We now have four useful commands.

The `npm run dev` command starts the application in development mode. The `tsx watch` tool monitors our source files and restarts the application when changes are detected.

The `npm run typecheck` command asks TypeScript to check our source code without generating JavaScript files.

The `npm run build` command compiles our TypeScript source files and places the resulting JavaScript files inside `dist`.

Finally, `npm start` executes the compiled application using Node.js.

It is important to understand that `tsx` executes TypeScript files, but executing them does not automatically mean that all TypeScript errors have been checked. That is why we provide a separate `typecheck` command.

This separation allows us to run the application during development, check our types, and generate production-ready JavaScript when needed.

### Creating the Application

Before creating the server, we will separate application construction from server startup.

This makes the application easier to test and reuse later.

Create the `src` directory and an `app.ts` file:

```bash
mkdir src
touch src/app.ts
```

Inside `app.ts`, create the Fastify application:

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Define the root route
    fastify.get('/', async () => {
        return {
            message: 'Hello, World!'
        }
    })

    return fastify
}
```

First, we import Fastify using the ES module import syntax.

We then call `Fastify()` to create an application instance. We enable logging by setting `logger: true`, which allows Fastify to generate structured logs containing information about incoming requests and application events.

Next, we define our first route:

```typescript
fastify.get('/', async () => {
    return {
        message: 'Hello, World!'
    }
})
```

The `fastify.get()` method registers a route that listens for GET requests sent to the root URL (`/`).

When a client requests this URL, Fastify matches the request with our route and executes its handler.

The handler returns a JavaScript object. Fastify automatically serializes this object into JSON and sends it as the HTTP response.

Finally, we return the Fastify instance from `buildApp()`.

This function is responsible for constructing and configuring the application, but it does not start the HTTP server.

### Starting the Server

Create another file named `server.ts`:

```bash
touch src/server.ts
```

Inside it, we import the application factory and start the server.

**`src/server.ts`:**

```typescript
import { buildApp } from './app.js'

const start = async (): Promise<void> => {

    const fastify = buildApp()

    try {

        const address = await fastify.listen({
            port: 3000,
            host: '127.0.0.1'
        })

        fastify.log.info(`Server listening at ${address}`)

    } catch (error) {

        fastify.log.error(error)
        process.exit(1)

    }
}

void start()
```

We first import `buildApp()` and call it to create our configured Fastify instance.

The `fastify.listen()` method starts the HTTP server and tells it to listen for incoming requests on port `3000`.

Because starting a server is an asynchronous operation, we use `async/await` to wait for it to complete.

We also use `try/catch` to handle potential errors during startup. For example, the requested port might already be in use by another application.

Notice that we use `Promise<void>` to describe the return type of our asynchronous `start` function. This indicates that the function resolves without returning a meaningful value.

We also use:

```typescript
void start()
```

to indicate that we are intentionally starting the asynchronous function without awaiting its result at the top level.

An important detail is our host configuration:

```typescript
host: '127.0.0.1'
```

This restricts the server to the local loopback interface, meaning it can be accessed from the same machine.

For container-based deployments, we will commonly use:

```typescript
host: '0.0.0.0'
```

This allows the application to listen on all available IPv4 interfaces, making it accessible through the container's exposed network interface.

For now, we will keep `127.0.0.1` because we are working locally.

### Running Our Application

With the files configured, open your terminal and run:

```bash
npm run dev
```

The terminal should display a message indicating that the server is running.

Now open your browser and visit:

```text
http://127.0.0.1:3000
```

You should receive the following JSON response:

```json
{
    "message": "Hello, World!"
}
```

This confirms that our Fastify server is running and responding to HTTP requests.

At the same time, the terminal displays a request log generated by Fastify.

To stop the server, return to the terminal and press `Ctrl + C`.

We now have a working server, so we can examine what happens internally whenever a client sends a request.

## Understanding the Request-Response Lifecycle

When a client communicates with our backend, it sends an HTTP request, and the server processes that request before returning an HTTP response.

Fastify manages this process through its request-response lifecycle.

Consider what happens when we visit:

```text
http://127.0.0.1:3000/
```

The browser sends a GET request to the server requesting the root URL.

Fastify receives the request and uses its router to identify the matching route. Once the route has been selected, it proceeds through the relevant lifecycle stages, executing registered hooks and validating the request where necessary.

After the request passes through the applicable hooks and validation, Fastify executes the route handler.

In our application, that handler returns:

```typescript
return {
    message: 'Hello, World!'
}
```

Fastify then processes the returned value, serializes it into JSON, and sends the HTTP response to the client.

The overall process can be represented as follows:

```text
             CLIENT
                |
                | GET /
                |
                v
        FASTIFY APPLICATION
                |
                v
          ROUTE MATCHING
                |
                v
          REQUEST HOOKS
                |
                v
            VALIDATION
                |
                v
          ROUTE HANDLER
                |
                v
        RESPONSE PROCESSING
                |
                v
          HTTP RESPONSE
                |
                v
              CLIENT
```

This is a simplified representation of the process. The complete lifecycle also includes request parsing, additional hooks, serialization, and error-handling paths, as discussed earlier.

Understanding this process is important because almost every API endpoint we create follows the same general pattern: receive a request, process it, and return a response.

## Understanding HTTP Requests and Responses

Now that we understand how Fastify processes incoming requests, let's examine the information available to us when implementing route handlers.

Fastify provides two important objects: `request` and `reply`.

### The Request Object

The `request` object contains information sent by the client to the server.

It provides access to several useful properties, including:

- `request.method`: The HTTP method used in the request, such as GET or POST.
- `request.url`: The requested URL.
- `request.params`: The parameters defined in the route path.
- `request.query`: The query parameters included in the URL.
- `request.body`: The parsed data sent in the request body, when a body is included.

For example, when a client sends a request to:

```text
/api/users/10?details=true
```

we can access the URL parameters through:

```typescript
request.params
```

And the query parameters through:

```typescript
request.query
```

If the client sends a JSON request body, Fastify parses it and makes the resulting data available through `request.body`, provided that the request uses a supported content type such as `application/json`.

We will work with these properties in the next sections.

### The Reply Object

While the request object gives us access to incoming information, the `reply` object allows us to construct and send HTTP responses.

It provides several useful methods:

- `reply.send()`: Sends a response to the client.
- `reply.code()`: Sets the HTTP status code.
- `reply.header()`: Adds an HTTP response header.
- `reply.type()`: Sets the response content type.

For example:

```typescript
fastify.get('/example', async (request, reply) => {

    return reply.code(200).send({
        message: 'Request successful'
    })

})
```

Here, we set the response status code to `200` and send a JSON object to the client.

However, Fastify also allows us to return values directly from route handlers.

For example:

```typescript
fastify.get('/example', async () => {

    return {
        message: 'Request successful'
    }

})
```

Fastify automatically sends the returned object as a JSON response.

This is often the simpler approach when we do not need to customize the response manually.

In general, we can return a value directly or use `reply.send()` when we need more control over the response. We should avoid sending a response manually and then returning another payload from the same handler.

### Understanding HTTP Methods

HTTP methods describe the operation that a client wants to perform on a resource.

For example, an online store might need to retrieve products, create new products, update existing products, and delete them.

The most commonly used methods include:

| Method | Purpose |
|---|---|
| GET | Retrieve a resource or collection of resources. |
| POST | Submit data, commonly to create a new resource. |
| PUT | Replace an existing resource. |
| PATCH | Partially update an existing resource. |
| DELETE | Delete a resource. |

A typical REST-style API might define the following endpoints:

```text
GET     /api/products
GET     /api/products/100
POST    /api/products
PUT     /api/products/100
PATCH   /api/products/100
DELETE  /api/products/100
```

Notice that these URLs represent resources rather than specific application actions. The HTTP method describes what operation we want to perform on the resource.

For example, `GET /api/products/100` retrieves a product, while `DELETE /api/products/100` requests its deletion.

An important aspect of HTTP is that methods have defined semantics. GET is intended for safe retrieval and is idempotent, while PUT and DELETE are also idempotent by definition. POST is not generally idempotent, meaning that repeating the same request may create additional resources or perform an operation more than once.

These distinctions become important when designing APIs because clients and other systems rely on HTTP methods to understand how operations behave.

### Understanding HTTP Status Codes

Every HTTP response includes a status code describing the result of processing the client's request.

Status codes are grouped into different categories, but backend developers most frequently work with the following:

| Status Code | Meaning | Description |
|---|---|---|
| 200 | OK | The request was processed successfully. |
| 201 | Created | A new resource was successfully created. |
| 204 | No Content | The request succeeded, but no response body is returned. |
| 400 | Bad Request | The request contains invalid or incorrect data. |
| 401 | Unauthorized | Authentication is missing or has failed. |
| 403 | Forbidden | The client is not permitted to access the resource. |
| 404 | Not Found | The requested resource could not be found. |
| 500 | Internal Server Error | An unexpected error occurred on the server. |

For example, when a client requests a product that does not exist, returning a `404 Not Found` response is more appropriate than returning a normal successful response.

Fastify allows us to set the status code using `reply.code()`:

```typescript
return reply.code(404).send({
    error: 'Product not found'
})
```

This sends a JSON error response with the HTTP status code `404`.

Status codes are an important part of API design because clients should be able to understand the result of a request without having to examine the response body alone.

## Working with Routes and URL Parameters

So far, our server has responded to a static route. However, real applications frequently need to handle dynamic information.

For example, imagine an application that displays user profiles or allows clients to retrieve information about specific products.

The server needs a way to identify which resource the client wants to access. One common approach is to use **URL parameters**.

A URL parameter is a variable part of the URL path that allows the client to identify a particular resource.

In Fastify, we define URL parameters by prefixing their names with a colon (`:`).

### Creating a Dynamic Route

Let's create a route that returns a greeting using a username provided by the client.

Add the following code to `app.ts`:

```typescript
fastify.get<{ Params: { username: string } }>(
    '/users/:username',
    async (request) => {

        const username = request.params.username

        return {
            message: `Hello, ${username}!`
        }

    }
)
```

In this example, `:username` is a URL parameter.

The generic type passed to `fastify.get()` describes the expected structure of the route parameters.

We use `Params` to tell TypeScript that the route contains a parameter named `username`, and we specify that its value should be treated as a string.

The `request.params` object contains the parameters extracted from the URL, while `request.params.username` gives us access to the particular username.

When someone visits:

```text
http://127.0.0.1:3000/users/Alice
```

Fastify extracts `Alice` from the URL and makes it available through:

```typescript
request.params.username
```

The route handler then returns:

```json
{
    "message": "Hello, Alice!"
}
```

Changing the URL to:

```text
http://127.0.0.1:3000/users/Bob
```

automatically changes the response:

```json
{
    "message": "Hello, Bob!"
}
```

This mechanism is commonly used when accessing individual resources, such as user profiles, products, or orders.

### Understanding TypeScript Route Types

You might have noticed the following syntax:

```typescript
fastify.get<{ Params: { username: string } }>(
    '/users/:username',
    // ...
)
```

This syntax uses a TypeScript feature called **generics**.

Fastify uses generics to describe the structure of information available to a route handler.

In this example, we tell TypeScript that the `request.params` object contains a property named `username`, whose value is a string.

Without this definition, TypeScript might not know the specific structure of our custom route parameters.

This improves autocomplete and type checking, making it easier to work with request information.

However, remember that these TypeScript definitions are only compile-time information. They do not validate incoming requests at runtime.

We will use JSON Schema to handle that responsibility later in the workshop.

## Working with Query Parameters

URL parameters are useful when identifying specific resources, but sometimes a client needs to provide additional information without changing the resource path.

For example, an application might allow clients to filter products, sort results, or control how much information is returned.

For these situations, we commonly use **query parameters**.

Query parameters are added to the end of a URL after a question mark (`?`). They usually consist of key-value pairs.

Consider:

```text
/search?query=fastify
```

Here, `query` is the parameter name, and `fastify` is its value.

We can include multiple parameters by separating them with an ampersand (`&`):

```text
/products?category=electronics&sort=price
```

This URL contains two query parameters: `category` and `sort`.

Fastify automatically parses query parameters and makes them available through the `request.query` object.

### Creating a Search Route

Let's create a simple search route that receives a search term and returns a message describing the search.

Add the following code to `app.ts`:

```typescript
fastify.get<{ Querystring: { query?: string } }>(
    '/search',
    async (request) => {

        const searchTerm = request.query.query

        if (searchTerm) {
            return {
                message: `You are searching for: ${searchTerm}`
            }
        }

        return {
            message: 'Please provide a search query.'
        }

    }
)
```

The `Querystring` generic describes the expected structure of the query parameters.

We specify:

```typescript
query?: string
```

The question mark indicates that the query parameter is optional. This means that the client may provide it, but the request is also valid when it is missing.

We access its value through:

```typescript
request.query.query
```

If the client provides a search term, the handler returns a message containing that term. Otherwise, it asks the client to provide a search query.

### Testing the Search Route

When we visit:

```text
http://127.0.0.1:3000/search?query=nodejs+tutorials
```

the server returns:

```json
{
    "message": "You are searching for: nodejs tutorials"
}
```

If we visit the route without a query parameter:

```text
http://127.0.0.1:3000/search
```

the response becomes:

```json
{
    "message": "Please provide a search query."
}
```

Notice that query parameter values are generally received as strings.

Also, TypeScript's type definitions do not validate the actual values received from clients. Even though we declared `query` as a string, runtime validation is still needed when we want to enforce specific requirements.

### URL Parameters vs Query Parameters

Both URL parameters and query parameters allow clients to pass information through a URL, but they are commonly used for different purposes.

| URL Parameters | Query Parameters |
|---|---|
| Part of the URL path. | Added after the question mark (`?`). |
| Commonly used to identify a resource. | Commonly used to filter, sort, or customize results. |
| Accessed through `request.params`. | Accessed through `request.query`. |
| Example: `/users/10` | Example: `/users?role=admin` |

For example, when retrieving a specific product, we could use:

```text
/api/products/100
```

Here, `100` identifies the product.

However, when retrieving products belonging to a particular category, we could use:

```text
/api/products?category=electronics
```

In this case, the query parameter determines which products should be returned.

Other common examples include:

```text
/api/products?sort=price
/api/products?page=2&limit=20
/api/products?category=electronics&sort=price
```

These examples demonstrate how query parameters can customize the results returned by an endpoint without changing the resource being accessed.

Both URL and query parameters originate from the client, so we should validate them before using them in application logic.

## Organizing Routes Using Plugins

Until now, we have been defining our routes directly inside `app.ts`.

This is acceptable for a small application, but as the number of endpoints increases, keeping everything in one file becomes difficult to maintain.

Imagine an online store with hundreds of endpoints covering users, products, orders, payments, and authentication.

Instead of keeping all these routes together, we can group related endpoints into separate files using Fastify plugins.

We already introduced plugins earlier. Now we will apply that concept to reorganize our application.

### Creating the User Routes Plugin

Create a `routes` directory inside `src` and add a file named `users.ts`:

```bash
mkdir src/routes
touch src/routes/users.ts
```

Inside `users.ts`, move the user-related route into a Fastify plugin.

**`src/routes/users.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const usersRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{ Params: { username: string } }>(
        '/users/:username',
        async (request) => {

            const username = request.params.username

            return {
                message: `Hello, ${username}!`
            }

        }
    )

}

export default usersRoutes
```

Here, we define the user-related route inside a separate plugin.

Notice that we do not create a new Fastify server inside this file. Instead, the plugin receives an existing Fastify instance when it is registered.

This is important because application initialization and route definitions now have separate responsibilities.

### Creating the Search Routes Plugin

Our search route is not specifically part of user management, so we will place it in its own plugin.

Create:

```bash
touch src/routes/search.ts
```

Inside `search.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify'

const searchRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{ Querystring: { query?: string } }>(
        '/search',
        async (request) => {

            const searchTerm = request.query.query

            if (searchTerm) {
                return {
                    message: `You are searching for: ${searchTerm}`
                }
            }

            return {
                message: 'Please provide a search query.'
            }

        }
    )

}

export default searchRoutes
```

We now have separate plugins for users and search functionality.

This organization helps each file maintain a clear responsibility.

### Registering the Plugins

Now update `app.ts` to import and register these plugins.

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

import usersRoutes from './routes/users.js'
import searchRoutes from './routes/search.js'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Log incoming requests
    fastify.addHook('onRequest', async (request) => {
        fastify.log.info(
            `${request.method} ${request.url}`
        )
    })

    // Root route
    fastify.get('/', async () => {
        return {
            message: 'Hello, World!'
        }
    })

    // Register route plugins
    fastify.register(usersRoutes, {
        prefix: '/api'
    })

    fastify.register(searchRoutes, {
        prefix: '/api'
    })

    return fastify
}
```

We import each plugin and register it using `fastify.register()`.

Notice that we pass an additional option:

```typescript
{
    prefix: '/api'
}
```

The `prefix` option tells Fastify to add `/api` to every route registered inside that plugin.

As a result:

```text
/users/:username
/search
```

become:

```text
/api/users/:username
/api/search
```

We also registered an `onRequest` hook in the main application before registering the route plugins.

Because the hook is registered in the parent scope, it also applies to requests handled by its child route plugins.

Our `app.ts` file is now responsible for constructing the application, registering common functionality, and connecting the route plugins.

This is a much more maintainable approach than placing every endpoint inside a single file.

## Building a Simple JSON API

Now that we understand how to define routes, access request information, and organize functionality using plugins, we can build a more realistic API.

So far, our endpoints have returned simple messages. However, modern applications usually need to exchange structured information between different systems.

This is where **APIs (Application Programming Interfaces)** become important.

An API provides an interface through which different applications or components can communicate and exchange information.

For example, imagine we are building an online store with both a website and a mobile application.

Instead of implementing product management separately in each application, we can create a backend API that provides product information.

The website and mobile application can then send requests to the same API and receive product data in a structured format, usually JSON.

This allows different clients to use the same backend functionality without needing to know how the information is stored or processed internally.

### Understanding JSON Responses

JSON (JavaScript Object Notation) is a lightweight data format commonly used to exchange information between applications.

For example, our server might return the following response:

```json
{
    "id": "100",
    "name": "Laptop",
    "price": 1200
}
```

This response describes a product using a structured collection of key-value pairs.

Because JSON is widely supported, different programming languages and applications can easily process this information.

Fastify automatically serializes returned JavaScript objects into JSON responses.

For example:

```typescript
fastify.get('/products', async () => {

    return {
        id: '100',
        name: 'Laptop',
        price: 1200
    }

})
```

We do not need to manually call `JSON.stringify()` or construct the response as a JSON string.

Fastify handles serialization and sends the appropriate HTTP response.

### REST-Style API Design

Before implementing our product API, it is useful to understand the basic idea behind resource-oriented API design.

A common approach is to organize an API around resources rather than defining a separate URL for every operation.

For example, in an online store, products are resources. We can use a common endpoint to perform different operations depending on the HTTP method.

```text
GET     /api/products
GET     /api/products/100
POST    /api/products
PUT     /api/products/100
PATCH   /api/products/100
DELETE  /api/products/100
```

This is a common REST-style approach.

REST is an architectural style with several constraints, not simply a rule that says to use HTTP methods with URLs. Resource-oriented design, stateless communication, and a uniform interface are among its important ideas.

For this workshop, we will focus on the practical conventions needed to create consistent API endpoints.

### Building the Product API

Let's build a simple product API using what we have learned so far.

Our goal is to create an endpoint that retrieves information about a specific product.

The endpoint should:

- Accept a product `id` as a URL parameter.
- Accept an optional query parameter called `includeStock`.
- Return the product information in JSON format.
- Include stock availability only when requested.
- Return an appropriate HTTP status code if the product does not exist.
- Validate incoming parameters using JSON Schema.
- Define response schemas for the successful and unsuccessful cases.

To keep the example focused on Fastify, we will use a simple TypeScript object as a fake database.

In a real application, this information would usually be retrieved from a database such as PostgreSQL or MongoDB.

### Creating the Products Route Plugin

Create a new file inside the routes directory:

```bash
touch src/routes/products.ts
```

Inside this file, we will define our product-related route.

**`src/routes/products.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

// Define the product structure
type Product = {
    name: string
    price: number
    inStock: boolean
}

// Fake database
const products: Record<string, Product> = {

    '100': {
        name: 'Laptop',
        price: 1200,
        inStock: true
    },

    '101': {
        name: 'Mouse',
        price: 25,
        inStock: true
    },

    '102': {
        name: 'Keyboard',
        price: 75,
        inStock: false
    }

}

const productsRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Params: {
            productId: string
        }
        Querystring: {
            includeStock?: 'true' | 'false'
        }
    }>(
        '/products/:productId',
        {
            schema: {

                // Validate URL parameters
                params: {
                    type: 'object',
                    properties: {
                        productId: {
                            type: 'string'
                        }
                    },
                    required: ['productId']
                },

                // Validate query parameters
                querystring: {
                    type: 'object',
                    properties: {
                        includeStock: {
                            type: 'string',
                            enum: ['true', 'false']
                        }
                    }
                },

                // Define response structures
                response: {

                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' },
                            inStock: { type: 'boolean' }
                        },
                        required: ['id', 'name', 'price'],
                        additionalProperties: false
                    },

                    404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        },
                        required: ['error'],
                        additionalProperties: false
                    }

                }

            }
        },

        async (request, reply) => {

            // Get the product ID
            const productId = request.params.productId

            // Find the product
            const product = products[productId]

            // Check whether the product exists
            if (!product) {
                return reply.code(404).send({
                    error: 'Product not found'
                })
            }

            // Check whether stock information was requested
            const includeStock =
                request.query.includeStock === 'true'

            // Construct the response
            const responseData = {
                id: productId,
                name: product.name,
                price: product.price,

                ...(includeStock
                    ? { inStock: product.inStock }
                    : {})

            }

            return responseData
        }
    )

}

export default productsRoutes
```

Let's understand how this implementation works.

### Understanding the Product Structure

We begin by defining a TypeScript type:

```typescript
type Product = {
    name: string
    price: number
    inStock: boolean
}
```

This describes the structure expected for each product in our fake database.

We then create the products object:

```typescript
const products: Record<string, Product> = {

    '100': {
        name: 'Laptop',
        price: 1200,
        inStock: true
    },

    '101': {
        name: 'Mouse',
        price: 25,
        inStock: true
    },

    '102': {
        name: 'Keyboard',
        price: 75,
        inStock: false
    }

}
```

The `Record<string, Product>` type tells TypeScript that the object uses string keys and that its values follow the `Product` structure.

Each product is identified by a unique ID.

Notice that we enabled `noUncheckedIndexedAccess` in our TypeScript configuration. As a result, accessing an arbitrary key in this object is correctly treated as potentially returning `undefined`.

This is important because a requested product ID might not exist.

### Defining the Route and Its Types

After defining the fake database, we create the route:

```typescript
fastify.get<{
    Params: {
        productId: string
    }
    Querystring: {
        includeStock?: 'true' | 'false'
    }
}>(
    '/products/:productId',
    // ...
)
```

Here, we describe the information expected by our route.

The `Params` property tells TypeScript that `request.params.productId` is a string.

The `Querystring` property describes an optional query parameter named `includeStock`.

We use a **union type**:

```typescript
includeStock?: 'true' | 'false'
```

This tells TypeScript that the parameter is optional and, when provided, should contain one of the two specified string values.

However, these definitions only help TypeScript during development. They do not validate the actual information received from clients.

For that, we need the route schema.

### Understanding JSON Schema Validation

JSON Schema is a standard way of describing the expected structure and constraints of JSON data.

Fastify provides built-in support for JSON Schema and uses it to validate incoming requests and serialize outgoing responses.

By defining a schema for a route, we tell Fastify what kind of information the endpoint expects and how its responses should be structured.

Let's examine the schemas used in our product route.

#### 1. Validating URL Parameters

```typescript
params: {
    type: 'object',
    properties: {
        productId: {
            type: 'string'
        }
    },
    required: ['productId']
}
```

This schema describes our route parameters.

We define an object containing a property called `productId`, whose value must be a string.

The `required` property specifies that `productId` must be present.

Fastify uses this schema to validate the incoming parameters before executing the route handler.

#### 2. Validating Query Parameters

```typescript
querystring: {
    type: 'object',
    properties: {
        includeStock: {
            type: 'string',
            enum: ['true', 'false']
        }
    }
}
```

This schema describes the accepted query parameter.

The `enum` keyword restricts its value to either `'true'` or `'false'`.

Because we have not added `includeStock` to the required properties, the client is not required to provide it.

This means that our API accepts:

```text
/api/products/100?includeStock=true
```

It also accepts:

```text
/api/products/100
```

However, a request containing:

```text
/api/products/100?includeStock=invalid
```

will fail validation because `invalid` is not one of the accepted values.

Fastify automatically returns a `400 Bad Request` response when request validation fails. The route handler is not executed.

We can now distinguish two responsibilities:

**TypeScript provides compile-time type checking, while JSON Schema provides runtime validation.**

TypeScript helps us detect mistakes while writing our application, but its type information is removed during compilation.

JSON Schema allows Fastify to validate actual information received from external clients.

This distinction is fundamental when building reliable APIs.

#### 3. Defining the Response Schema

We also define schemas for our outgoing responses:

```typescript
response: {

    200: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            inStock: { type: 'boolean' }
        },
        required: ['id', 'name', 'price'],
        additionalProperties: false
    }

}
```

Unlike request schemas, which describe incoming information, response schemas describe the structure of the information we intend to send back to clients.

Fastify uses these schemas for response serialization.

This can improve serialization performance and helps prevent accidental exposure of properties that are not part of the response schema.

Notice that `inStock` is not included in the required properties. This is intentional because our API only includes stock availability when the client requests it.

We also define a separate schema for the `404` response:

```typescript
404: {
    type: 'object',
    properties: {
        error: { type: 'string' }
    },
    required: ['error'],
    additionalProperties: false
}
```

This describes the JSON structure returned when a product cannot be found.

Fastify uses different response schemas depending on the HTTP status code.

An important detail is that our TypeScript route types and JSON Schemas are written separately in this example. They must remain consistent with each other. Fastify also provides Type Providers that can derive TypeScript types from schemas, but we will explore that approach in a more advanced workshop.

### Understanding the Route Logic

Now let's examine what happens when the route handler receives a valid request.

First, we retrieve the product ID:

```typescript
const productId = request.params.productId
```

Then we use that ID to look up the corresponding product:

```typescript
const product = products[productId]
```

Because the requested ID might not exist, we check whether the lookup succeeded:

```typescript
if (!product) {
    return reply.code(404).send({
        error: 'Product not found'
    })
}
```

If the product does not exist, we return a `404 Not Found` response containing an error message.

Next, we check whether the client requested stock information:

```typescript
const includeStock =
    request.query.includeStock === 'true'
```

Notice that we use strict comparison because query parameter values are strings.

Finally, we construct the response:

```typescript
const responseData = {
    id: productId,
    name: product.name,
    price: product.price,

    ...(includeStock
        ? { inStock: product.inStock }
        : {})
}
```

Here, we use the spread operator with a conditional expression.

When `includeStock` is `true`, the expression adds the `inStock` property to the response object.

When it is `false`, an empty object is spread instead, so the stock property is omitted.

This allows the API to return different levels of information depending on the client's request.

### Registering the Products Plugin

Now that we have created the products plugin, we need to register it in our main application.

Update `app.ts`:

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

import usersRoutes from './routes/users.js'
import searchRoutes from './routes/search.js'
import productsRoutes from './routes/products.js'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Log incoming requests
    fastify.addHook('onRequest', async (request) => {
        fastify.log.info(
            `${request.method} ${request.url}`
        )
    })

    // Root route
    fastify.get('/', async () => {
        return {
            message: 'Hello, World!'
        }
    })

    // Register route plugins
    fastify.register(usersRoutes, {
        prefix: '/api'
    })

    fastify.register(searchRoutes, {
        prefix: '/api'
    })

    fastify.register(productsRoutes, {
        prefix: '/api'
    })

    return fastify
}
```

We now have three route plugins registered inside the application.

Each plugin is responsible for its own routes, while the main application remains focused on initialization and configuration.

The `/api` prefix is automatically applied to all routes registered inside these plugins.

Our application now exposes the following endpoints:

```text
GET /api/users/:username
GET /api/search
GET /api/products/:productId
```

This organization allows us to add more functionality without making the main application file unnecessarily complicated.

### Testing Our API

Make sure your application is running:

```bash
npm run dev
```

We can now test the product API using a browser or an HTTP client.

**Example 1: Requesting a product**

Request:

```text
http://127.0.0.1:3000/api/products/100
```

Response:

```json
{
    "id": "100",
    "name": "Laptop",
    "price": 1200
}
```

**Example 2: Requesting stock information**

Request:

```text
http://127.0.0.1:3000/api/products/100?includeStock=true
```

Response:

```json
{
    "id": "100",
    "name": "Laptop",
    "price": 1200,
    "inStock": true
}
```

**Example 3: Requesting a product that does not exist**

Request:

```text
http://127.0.0.1:3000/api/products/999
```

Response:

```json
{
    "error": "Product not found"
}
```

The server also returns the HTTP status code `404`.

**Example 4: Sending an invalid query parameter**

Request:

```text
http://127.0.0.1:3000/api/products/100?includeStock=invalid
```

Fastify rejects the request because the value does not match the enum defined in our JSON Schema.

The HTTP status will be:

```text
400 Bad Request
```

Through this example, we have combined URL parameters, query parameters, TypeScript, conditional logic, JSON responses, HTTP status codes, and runtime validation to build a small but functional API endpoint.

### Testing APIs Using curl

Although a browser is sufficient for testing simple GET endpoints, backend developers often need more control over the requests they send.

One useful tool is `curl`, which allows us to send HTTP requests directly from the terminal.

For example:

```bash
curl -i http://127.0.0.1:3000/api/products/100
```

The `-i` option displays the response headers along with the response body.

This allows us to examine the status code, content type, response headers, and returned JSON data.

We can also test our query parameter:

```bash
curl -i "http://127.0.0.1:3000/api/products/100?includeStock=true"
```

And request a product that does not exist:

```bash
curl -i http://127.0.0.1:3000/api/products/999
```

Finally, we can test the validation rules by sending an invalid value:

```bash
curl -i "http://127.0.0.1:3000/api/products/100?includeStock=invalid"
```

This demonstrates an important aspect of API testing: we should examine not only the returned data but also the HTTP status code and response headers.

A successful API implementation must handle valid requests correctly and respond appropriately when clients provide invalid information.

## Tasks

Now that we understand the basic concepts of Fastify and TypeScript, let's apply them through two practical exercises.

The first task reinforces what we have learned about routes and query parameters. The second introduces a new concept: receiving and validating JSON request bodies.

### Task 1: User Profile API

In this task, we will create a simple **user profile API** using Fastify.

The goal is to simulate how a backend provides dynamic user information in JSON format.

Instead of using a database, we will work with hardcoded data to keep the implementation focused on the concepts introduced in this workshop.

Create a new plugin file:

```text
src/routes/profile.ts
```

Define the following endpoint:

```text
GET /profile/:username
```

The endpoint should return a user profile based on the provided username.

It should also accept an optional query parameter called `details`.

When `details=true`, the response should include extended information, such as the user's email and role. Otherwise, it should return only basic information, such as the username.

If the requested user does not exist, the API should return a `404 Not Found` response with an appropriate error message.

**Example 1: Basic Profile**

Request:

```text
GET /api/profile/Alice
```

Response:

```json
{
    "username": "Alice"
}
```

**Example 2: Extended Profile**

Request:

```text
GET /api/profile/Alice?details=true
```

Response:

```json
{
    "username": "Alice",
    "email": "alice@example.com",
    "role": "admin"
}
```

**Example 3: Unknown User**

Request:

```text
GET /api/profile/Unknown
```

Expected HTTP status:

```text
404 Not Found
```

Additional requirements:

- Define an appropriate TypeScript type for the user profile.
- Use URL parameters to identify the requested user.
- Use a query parameter to control the amount of information returned.
- Remember that query parameter values are strings.
- Use strict comparison when checking whether `details` equals `'true'`.
- Use JSON Schema to validate the accepted query parameter values.
- Define appropriate response schemas for successful and unsuccessful requests.
- Register the plugin in `app.ts` using the `/api` prefix.

### Task 2: Book Management API

In this task, we will extend what we have learned by building a simple **book management API**.

Unlike the previous exercise, this API will not only retrieve information. It will also accept data from clients and create new resources.

We will continue using hardcoded data to simulate a database.

Create a new plugin file:

```text
src/routes/books.ts
```

The API should provide two endpoints:

```text
GET  /books/:bookId
POST /books
```

The GET endpoint should retrieve information about a specific book using its `bookId` URL parameter.

It should also accept an optional query parameter called `summary`.

When `summary=true`, return only the book's title and author. Otherwise, return the complete book information, including its ID, title, author, and price.

If the requested book does not exist, return a `404 Not Found` response.

The POST endpoint should allow clients to create a new book by sending its information in a JSON request body.

It should validate the submitted information before creating the book. At a minimum, the request body must contain a title, author, and price with appropriate data types.

When a book is successfully created, the API should return the newly created book and use the HTTP status code `201 Created`.

Invalid request bodies should be rejected with an appropriate validation error.

**Example 1: Requesting a Book**

Request:

```text
GET /api/books/201
```

Response:

```json
{
    "id": "201",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "price": 35
}
```

**Example 2: Requesting a Book Summary**

Request:

```text
GET /api/books/201?summary=true
```

Response:

```json
{
    "title": "Clean Code",
    "author": "Robert C. Martin"
}
```

**Example 3: Creating a Book**

Request:

```http
POST /api/books
Content-Type: application/json
```

Request body:

```json
{
    "title": "The Pragmatic Programmer",
    "author": "David Thomas",
    "price": 40
}
```

Expected HTTP status:

```text
201 Created
```

The response should contain the newly created book, including its generated ID.

Additional requirements:

- Define an appropriate TypeScript type for the book information.
- Use URL parameters to identify books.
- Use query parameters to control the returned information.
- Use `request.body` to access submitted JSON data.
- Define a JSON Schema for the POST request body.
- Validate that the title and author are strings and that the price is a positive number.
- Handle nonexistent book IDs.
- Return appropriate HTTP status codes.
- Define response schemas for the successful operations.
- Register the plugin in `app.ts` using the `/api` prefix.

You can test the POST endpoint using `curl`:

```bash
curl -i -X POST http://127.0.0.1:3000/api/books \
    -H "Content-Type: application/json" \
    -d '{"title":"The Pragmatic Programmer","author":"David Thomas","price":40}'
```

The objective of these exercises is to move beyond simply defining routes and become comfortable building APIs that receive information, validate it, process it, and return structured responses.

## Conclusion

In this workshop, we explored the fundamental concepts behind backend development and learned how Node.js, Fastify, and TypeScript work together to build server-side applications.

We started by understanding the client-server architecture, then examined Fastify's plugin-based architecture, encapsulation, and lifecycle hooks. After configuring our development environment, we created our first server and learned how to handle HTTP requests and responses.

We then explored URL parameters, query parameters, and plugin-based route organization before building a small JSON API with runtime validation and response serialization.

The application we created uses hardcoded data, so it is not yet a complete backend system. In future workshops, we will extend these foundations by introducing database integration, CRUD operations, authentication, authorization, error-handling strategies, and automated testing.

These concepts will allow us to move from simple API examples toward building more complete and maintainable backend applications.

## References

- [Node.js Documentation](https://nodejs.org/docs/latest/api/)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Fastify Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify Plugin Architecture](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [Fastify Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [Fastify Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify TypeScript Reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify Type Providers](https://fastify.dev/docs/latest/Reference/Type-Providers/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [MDN: An Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)
- [MDN: HTTP Request Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
- [MDN: HTTP Response Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)