## Objectives

- Understand the role of backend development in web applications.
- Explore Fastify’s features and why it’s a powerful choice for building APIs.
- Utilize Fastify’s plugin-based modular architecture for organized code.
- Structure a Fastify application effectively.
- Create a basic Fastify application from scratch.
- Handle dynamic routes, URL parameters, and query arguments to build flexible APIs.

## What is Backend Development?

When we use a website or mobile app, we interact with the front-end the visual elements like buttons, text, and images displayed on our screen. Behind these interfaces lies the backend, the server-side machinery that powers the application and makes user interactions possible.

Backend development encompasses the hidden processes that drive web applications, including:

1. **Storing and Managing Data**: When we create an account or upload a file, the backend stores this data in a database, ensuring it’s available for future use.
2. **Handling Business Logic**: The backend processes user requests, performs calculations, and enforces rules, such as verifying login credentials or processing payments.
3. **Communicating with the Front-End**: It receives requests from browsers or apps (clients) and sends back data, such as user profiles or search results, to display on the front-end.
4. **Authentication and Security**: The backend manages user sessions, validates identities, and protects sensitive data from unauthorized access.

To visualize this, imagine a restaurant: the front-end is the dining area where customers enjoy their meal, while the backend is the kitchen where we prepare the dishes. As backend developers, we’re the chefs orchestrating the functionality that makes the user experience seamless.

## Introduction to Fastify

Fastify is a high-performance web framework for Node.js, designed to deliver speed, efficiency, and a developer-friendly experience. Let’s explore what sets Fastify apart:

- **Framework**: Fastify provides a structured environment for building web applications and APIs, handling low-level HTTP request processing so we can focus on application logic.
- **High Performance**: Known for its low overhead and high throughput, Fastify is one of the fastest Node.js frameworks, making it ideal for scalable APIs and web services.
- **Developer-Friendly**: With its lightweight design, extensibility, and intuitive API, Fastify balances simplicity with powerful features, enabling rapid development without complexity.

We choose Fastify when we need a fast, scalable backend that offers flexibility to customize as our application evolves, all while maintaining top-tier performance.

## The Plugin-Based Modular Architecture in Fastify

Fastify’s architecture revolves around a **plugin-based modular system**, which organizes code into reusable, encapsulated modules called plugins. This approach enhances modularity, maintainability, and scalability. Let’s break down its core components:

1. **Plugins**: These are self-contained modules that encapsulate specific functionality, such as database connections, authentication, or route handlers. Plugins can register routes, hooks, or middleware, keeping our code organized and focused.
2. **Encapsulation**: Each plugin operates in its own scope, preventing conflicts between different parts of the application. For example, routes in a user plugin won’t interfere with those in a product plugin unless explicitly designed to do so.
3. **Lifecycle Hooks**: Fastify provides hooks (e.g., `onRequest`, `preHandler`) that let plugins tap into the request-response lifecycle, allowing us to add custom logic like logging or authentication checks.

### How Fastify Leverages Plugins

Fastify’s plugin system is central to its flexibility and performance:

- **Routes as Plugins**: We can group related routes (e.g., all `/user/*` endpoints) into a single plugin, making our codebase modular and easier to manage.
- **Reusability**: Plugins can be reused across projects or published as npm packages, reducing redundant code and speeding up development.
- **API Focus**: Fastify is optimized for JSON APIs, with built-in support for JSON Schema validation and fast serialization, ensuring efficient data transfer.

In this workshop, we’ll focus on building JSON-based APIs, aligning with Fastify’s strengths for high-performance server-side applications.

## Structure of a Fastify App

A Fastify application requires minimal setup, making it easy to get started. We need Node.js installed and a project directory with a few key files. Here’s a typical structure for a Fastify app:

```
my_fastify_project/
├── plugins/         # Reusable functionality
├── routes/          # Route definitions
├── node_modules/    # Dependencies installed via npm
├── package.json     # Project metadata and dependencies
└── app.js           # Main Fastify application file
```

By organizing routes and plugins in dedicated folders, we maintain clarity and scalability as our application grows.

## Creating Our First Fastify App

Let’s build a simple Fastify application to understand the setup process, create a web server, and serve a basic response. We’ll walk through initializing the project, installing Fastify, and creating our first endpoint.

### Setting Up the Environment

We begin by creating a project directory and initializing a Node.js project:

```bash
mkdir my_fastify_project
cd my_fastify_project
npm init -y
```

This generates a `package.json` file to manage our project’s dependencies and metadata.

### Installing Fastify

We install Fastify using npm:

```bash
npm install fastify
```

### Creating the "Hello, World!" App

We create a file named `app.js` in our project directory to set up a basic Fastify server.

**`app.js`:**

```javascript
const fastify = require('fastify')({ logger: true })

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

Let’s break down the code:

- We import Fastify and create an instance with `logger: true`, enabling console logging for debugging and development.
- We define a `GET` route for the root path (`/`) that returns a simple "Hello, World!" string. Fastify’s route handlers use async/await, making asynchronous operations straightforward.
- The `listen` method starts the server on port 3000, and the `try/catch` block ensures we handle startup errors gracefully.

We run the app with:

```bash
node app.js
```

We then open `http://127.0.0.1:3000` in our browser and see "Hello, World!" displayed. This confirms our Fastify server is running and responding to requests.

**Explanation**: This minimal setup showcases Fastify’s simplicity and speed. The async/await syntax aligns with modern JavaScript practices, and the logger provides visibility into server activity, making it easier to debug during development.

## Working with Routes, Parameters, and URL Arguments

Static responses like "Hello, World!" are a good start, but real-world applications require dynamic data. Fastify makes it easy to handle URL parameters and query arguments, enabling us to create flexible, data-driven endpoints.

### URL Parameters (Dynamic Routes)

We can define dynamic routes using a colon (`:`) to capture parameters from the URL. Let’s create a route that greets a user by their name.

**Add a Dynamic Route**  
We update `app.js` to include a new route for user greetings.

**`app.js` (updated snippet):**

```javascript
fastify.get('/user/:username', async (request, reply) => {
  const { username } = request.params
  return `Hello, ${username}!`
})
```

We restart the app (`node app.js`) and visit `http://127.0.0.1:3000/user/Alice`. The response is "Hello, Alice!".

**Explanation**: The `:username` in the route path acts as a placeholder, capturing the value from the URL (e.g., `Alice` in `/user/Alice`). This value is available in `request.params.username`, allowing us to create personalized responses. Fastify’s parameter handling is intuitive and efficient, similar to other frameworks but optimized for performance.

### URL Query Arguments

Query arguments are key-value pairs in the URL (e.g., `/search?query=fastify`). Fastify provides `request.query` to access these parameters. Let’s create a search route to demonstrate this.

**Add a Search Route**  
We add a search route to `app.js`.

**`app.js` (updated snippet):**

```javascript
fastify.get('/search', async (request, reply) => {
  const { query } = request.query
  if (query) {
    return `You are searching for: ${query}`
  }
  return 'Please provide a search query.'
})
```

We restart the app and visit:

- `http://127.0.0.1:3000/search?query=nodejs+tutorials` to see "You are searching for: nodejs tutorials".
- `http://127.0.0.1:3000/search` to see "Please provide a search query."

**Explanation**: The `request.query` object contains query parameters, with `query` being the key in this case. We check if `query` exists to provide a meaningful response, demonstrating Fastify’s straightforward approach to handling query strings.

### Organizing Routes with Plugins

To keep our application modular, we move routes into a dedicated plugin, aligning with Fastify’s architecture. Let’s create a `routes` folder and a plugin for user-related routes.

**Updated Structure:**

```
my_fastify_project/
├── plugins/
├── routes/
│   ├── user.js
├── node_modules/
├── package.json
└── app.js
```

**Create a User Routes Plugin**  
We define user-related routes in a separate file.

**`routes/user.js`:**

```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/user/:username', async (request, reply) => {
    const { username } = request.params
    return `Hello, ${username}!`
  })

  fastify.get('/search', async (request, reply) => {
    const { query } = request.query
    if (query) {
      return `You are searching for: ${query}`
    }
    return 'Please provide a search query.'
  })
}
```

**Register the Plugin**  
We update `app.js` to register the routes plugin, keeping the root route separate.

**`app.js` (updated):**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})

fastify.register(require('./routes/user'), { prefix: '/api' })

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

We restart the app and visit:

- `http://127.0.0.1:3000/api/user/Alice` to see "Hello, Alice!".
- `http://127.0.0.1:3000/api/search?query=nodejs` to see "You are searching for: nodejs".

**Explanation**: By moving routes to a plugin, we keep `app.js` focused on server setup and improve modularity. The `prefix: '/api'` option scopes the routes under `/api`, organizing our endpoints cleanly. This approach aligns with Fastify’s plugin system, offering better scalability.

## Building a Simple JSON API

Let’s combine our knowledge to build a simple JSON API, a common use case for Fastify. APIs enable communication between backends and clients, such as mobile apps or front-end frameworks. Our goal is to create an endpoint that:

- Accepts a product `id` as a URL parameter.
- Accepts an optional `currency` query argument.
- Returns a JSON object with product details.

**Create a Products Route Plugin**  
We create a new plugin for product-related routes.

**`routes/products.js`:**

```javascript
module.exports = async (fastify, opts) => {
  const productsDb = {
    '100': { name: 'Laptop', price: 1200 },
    '101': { name: 'Mouse', price: 25 },
    '102': { name: 'Keyboard', price: 75 }
  }

  fastify.get('/products/:productId', async (request, reply) => {
    const { productId } = request.params
    const { currency = 'USD' } = request.query // Default to 'USD'

    const product = productsDb[productId]
    if (!product) {
      reply.code(404).send({ error: 'Product not found' })
      return
    }

    const responseData = {
      id: productId,
      name: product.name,
      price: product.price,
      currency
    }

    return responseData
  })
}
```

**Register the Products Plugin**  
We update `app.js` to include the products plugin.

**`app.js` (updated):**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})

fastify.register(require('./routes/user'), { prefix: '/api' })
fastify.register(require('./routes/products'), { prefix: '/api' })

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

We restart the app and test the following URLs:

- `http://127.0.0.1:3000/api/products/101` to see `{ "id": "101", "name": "Mouse", "price": 25, "currency": "USD" }`.
- `http://127.0.0.1:3000/api/products/101?currency=EUR` to see `{ "id": "101", "name": "Mouse", "price": 25, "currency": "EUR" }`.
- `http://127.0.0.1:3000/api/products/999` to see `{ "error": "Product not found" }`.

**Explanation**: We simulate a database with a `productsDb` object and handle dynamic routes with `request.params` and `request.query`. Fastify’s `reply.code(404)` sets the HTTP status for errors, and the JSON response is automatically serialized for efficiency. By organizing the endpoint in a plugin, we maintain modularity, aligning with Fastify’s architecture and ensuring scalability.

## Putting It All Together

Our project now reflects Fastify’s modular structure, with plugins for routes and a clear separation of concerns.

**Final Structure:**

```
my_fastify_project/
├── plugins/
├── routes/
│   ├── user.js
│   ├── products.js
├── node_modules/
├── package.json
└── app.js
```

**Complete `app.js`:**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})

fastify.register(require('./routes/user'), { prefix: '/api' })
fastify.register(require('./routes/products'), { prefix: '/api' })

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

