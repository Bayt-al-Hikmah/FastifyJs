## Objectives

- Develop a **Single-Page Application (SPA)** frontend with vanilla JavaScript, seamlessly connected to a Fastify API backend.
- Master the **Node.js REPL with Fastify context** for efficient database management using Prisma.
- Implement **real-time communication** with WebSockets to build a live chat application.
- Understand the professional approach to **decoupling the backend from the frontend** using React for scalable full-stack development.

## The Full-Stack Divide

So far in our course, our Fastify applications have been monolithic, meaning a single codebase handles everything from processing incoming HTTP requests, querying the database for data, applying business logic, and finally rendering HTML templates to send back to the browser. This approach is straightforward and works well for simple, server-rendered websites where performance demands are low and interactions are mostly form submissions leading to page reloads. However, in today's web landscape, users expect highly interactive, app-like experiences think of platforms like Gmail or Trello, where content updates dynamically without interrupting the flow with full page refreshes. These experiences reduce latency, improve usability, and feel more responsive. To deliver this, we need to adopt a **decoupled architecture**, splitting the application into two independent layers:

- **The Backend (Fastify API)**: This acts as the "server-side brain," responsible purely for data management. It exposes endpoints that accept requests (e.g., via POST for creating data), interacts with the database to store or retrieve information, enforces security (like authentication), and responds with lightweight JSON data. No HTML rendering occurs here, which keeps the backend focused, reusable (e.g., for mobile apps), and easier to scale horizontally.
- **The Frontend (JavaScript/React Client)**: This is the "client-side face," running entirely in the user's browser. It handles rendering the user interface, managing local state (e.g., form inputs), and orchestrating user interactions. The frontend communicates asynchronously with the backend via API calls (using tools like Fetch or Axios), processes the JSON responses, and updates the DOM (Document Object Model) dynamically. This eliminates page reloads, enabling a fluid, single-page experience.

This separation aligns with the **Single Responsibility Principle** in software design, making the codebase more maintainable: backend developers can focus on data integrity and APIs, while frontend specialists handle UI/UX. It also facilitates better testing (unit tests for APIs, integration tests for frontend), version control, and deployment (e.g., static hosting for frontend). Potential downsides include increased complexity in handling cross-origin requests (CORS) and ensuring data consistency, but these are manageable with best practices. In this lecture, we'll build two practical examples a **task manager SPA** for CRUD operations and a **real-time chat app** for live interactions incorporating secure authentication (with password hashing to prevent breaches), Tailwind CSS for rapid, utility-based styling that's responsive and customizable, Joi for robust form validation (protecting against invalid data and attacks), and Prisma as an ORM for abstracting database queries (making code database-agnostic and reducing SQL injection risks). We'll conclude by transitioning to React, showing how it elevates the frontend for larger-scale apps.

## The Single-Page Application (SPA)

### Introduction

In traditional server-rendered Fastify apps, every user action like adding a task, logging in, or updating a form triggers a full HTTP request-response cycle, causing the browser to reload the entire page. This leads to visible delays (especially on slow networks), loss of unsaved state (e.g., scroll position or temporary inputs), and a disjointed user experience that feels archaic compared to native apps. Moreover, as apps grow, mixing server-side rendering with client-side logic creates tangled code, making it hard to debug or extend features without affecting the whole system. Let's explore this in more detail. When we think about the request-response cycle in a monolithic setup, each interaction sends the entire page back, which includes not just the updated data but also static elements like headers and footers. This redundancy increases load times and server strain. In contrast, by shifting to a decoupled model, we optimize for efficiency only the necessary data travels over the wire, and the browser handles the rendering. This is where SPAs shine, as they load once and update partially, creating a smoother flow. We'll see how this plays out as we build our task manager.

### The Approach

To solve this, we'll create a Task Manager SPA that allows authenticated users to add, view, and delete tasks in real-time without page reloads. The backend will serve as a RESTful API (following principles like stateless requests, standard HTTP methods GET for reading, POST for creating, DELETE for removing and JSON payloads for data exchange), ensuring it's lightweight and extensible. The frontend will use vanilla JavaScript to handle API interactions via the Fetch API (a modern, promise-based alternative to XMLHttpRequest), manipulate the DOM for dynamic updates, and provide immediate feedback. We'll enforce security with session-based authentication, hash passwords to protect against database leaks, and use a modular project structure to adhere to the DRY (Don't Repeat Yourself) principle. Tailwind CSS will enable quick, responsive designs without writing custom CSS, while Joi and Prisma handle validation and database safely. This approach not only improves performance (by minimizing data transfer to just JSON) but also teaches core full-stack concepts: API design (e.g., error handling with status codes like 400 for bad requests, 401 for unauthorized), client-server communication, and state management on the client side. As we proceed, we'll break down each part step by step, starting with the backend, to ensure the ideas connect logically understanding how Fastify's plugin system and schema validation integrate to make our API robust and fast.

### The Backend: A Pure Fastify API

We start by configuring Fastify with plugins for database (Prisma), validation (Joi via fastify-joi or built-in schema), and security (fastify-bcrypt for hashing, fastify-session for auth). Prisma acts as an ORM, mapping JavaScript classes to database tables and handling queries safely (e.g., via parameterized statements to prevent SQL injection). Joi validates user input server-side, ensuring data integrity before it hits the database. The modular structure separates concerns: models for data schema (via Prisma schema), validation schemas for input handling, utils for reusable logic like decorators, reducing code duplication and improving readability. Let's dive deeper into why this matters. Fastify is designed for speed and low overhead, using a schema-based approach for routes that automatically validates requests and responses. This not only catches errors early but also generates documentation (via plugins like fastify-swagger). By using Prisma, we get type-safe queries, which means our code editor can catch mistakes before runtime, and migrations are handled declaratively through schema files. As we set up the project, we'll see how these pieces fit together to create a performant backend.

#### Project Structure

This organization follows best practices for Fastify projects, inspired by modular Node.js patterns. It allows easy scaling e.g., adding more models or routes without bloating the main file and facilitates collaboration in teams.

```
project/
│
├── app.js             # Main Fastify app with routes and configurations
├── prisma/            # Prisma-related files
│   └── schema.prisma  # Database schema defining structure
├── validation.js      # Joi schemas for validation
├── utils.js           # Utility functions, like authentication middleware
├── templates/         # HTML templates for initial page loads and auth
│   ├── index.html     # SPA entry point with placeholders for dynamic content
│   ├── login.html     # Simple login form template
│   ├── register.html  # Registration form template
├── static/            # Static files served directly by Fastify
│   ├── js/app.js      # Client-side JavaScript logic for the SPA
│   └── css/styles.css # Compiled Tailwind CSS (though we're using CDN for simplicity)
```

#### Backend Setup

**Install Dependencies**:

```
npm install fastify @fastify/static @fastify/formbody @fastify/session @fastify/cookie fastify-bcrypt prisma joi ejs
npx prisma init
```

These provide the core framework, static serving, form parsing, session management, secure hashing, ORM, validation, and template rendering. Prisma requires setup with npx prisma init, which generates the schema file and configures the database connection. **Database Schema (prisma/schema.prisma)**: Here, we define models that represent database tables. Prisma automatically generates migrations and client code for type-safe queries, making database operations intuitive and safe.
```
datasource db {
  provider = "sqlite"
  url      = "file:./spa.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            Int      @id @default(autoincrement())
  username      String   @unique
  passwordHash  String
  tasks         Task[]
}

model Task {
  id        Int     @id @default(autoincrement())
  content   String
  completed Boolean @default(false)
  userId    Int
  user      User    @relation(fields: [userId], references: [id])
}
```

The relation ensures referential integrity tasks are tied to users, preventing orphan records. In production, we can switch providers (e.g., to PostgreSQL) easily. After defining, run npx prisma generate to create the client, and npx prisma migrate dev to apply to the DB.

**Validation Schemas (validation.js)**: Joi provides declarative validation, checking inputs against schemas to prevent invalid data.

```
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(4).max(25).required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

module.exports = { registerSchema, loginSchema };
```

These schemas enforce rules like length and presence, providing clear error messages.

**Authentication Middleware (utils.js)**: Middleware in Fastify are hooks that run before routes, adding behavior like auth checks without modifying route code, promoting DRY.

```
const authRequired = async (request, reply) => {
  if (!request.session.userId) {
    reply.code(401).send({ error: 'You must log in to access this page.' });
    return;
  }
};

module.exports = { authRequired };
```

This can be applied to routes, enforcing access control centrally. Fastify's async nature allows non-blocking checks.

**Fastify Application (app.js)**: This ties everything together, registering plugins, initializing Prisma, and defining routes. We use sessions for auth (stored client-side but signed for security).
```
const fastify = require('fastify')({ logger: true });
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { registerSchema, loginSchema } = require('./validation');
const { authRequired } = require('./utils');
const bcrypt = require('fastify-bcrypt');
const ejs = require('ejs');

fastify.register(require('@fastify/static'), { root: path.join(__dirname, 'static') });
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/session'), { secret: 'your-very-secret-key-for-spas', cookie: { secure: false } }); // Secure in prod
fastify.register(require('@fastify/cookie'));
fastify.register(bcrypt, { saltWorkFactor: 12 });

const prisma = new PrismaClient();

fastify.register(async (instance) => {
  // Authentication Routes
  instance.post('/register', async (request, reply) => {
    const { error, value } = registerSchema.validate(request.body);
    if (error) return reply.code(400).send({ error: error.details[0].message });

    const existingUser = await prisma.user.findUnique({ where: { username: value.username } });
    if (existingUser) return reply.code(400).send({ error: 'Username already exists!' });

    const passwordHash = await instance.bcrypt.hash(value.password);
    const newUser = await prisma.user.create({ data: { username: value.username, passwordHash } });
    reply.code(201).send({ message: 'Registration successful! Please log in.' });
  });

  instance.post('/login', async (request, reply) => {
    const { error, value } = loginSchema.validate(request.body);
    if (error) return reply.code(400).send({ error: error.details[0].message });

    const user = await prisma.user.findUnique({ where: { username: value.username } });
    if (!user || !(await instance.bcrypt.compare(value.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password.' });
    }

    request.session.userId = user.id;
    request.session.username = user.username;
    reply.send({ message: 'Logged in successfully!' });
  });

  instance.get('/logout', { preHandler: authRequired }, async (request, reply) => {
    request.session.destroy();
    reply.send({ message: 'You have been logged out.' });
  });

  // API Endpoints (RESTful design)
  instance.get('/api/tasks', { preHandler: authRequired }, async (request) => {
    const tasks = await prisma.task.findMany({ where: { userId: request.session.userId } });
    return tasks.map(task => ({ id: task.id, content: task.content, completed: task.completed }));
  });

  instance.post('/api/tasks', { preHandler: authRequired }, async (request, reply) => {
    if (!request.body.content) return reply.code(400).send({ error: 'Missing content' });
    const newTask = await prisma.task.create({
      data: { content: request.body.content, userId: request.session.userId }
    });
    reply.code(201).send({ id: newTask.id, content: newTask.content, completed: newTask.completed });
  });

  instance.delete('/api/tasks/:taskId', { preHandler: authRequired }, async (request, reply) => {
    const task = await prisma.task.findUnique({ where: { id: parseInt(request.params.taskId) } });
    if (!task || task.userId !== request.session.userId) return reply.code(403).send({ error: 'Forbidden' });
    await prisma.task.delete({ where: { id: task.id } });
    reply.send({ success: true });
  });

  // SPA Entry Point
  instance.get('/', { preHandler: authRequired }, async (request, reply) => {
    const html = await ejs.renderFile('./templates/index.html', {}, { async: true });
    reply.type('text/html').send(html);
  });

  // Render auth templates
  instance.get('/register', async (request, reply) => {
    const html = await ejs.renderFile('./templates/register.html', {}, { async: true });
    reply.type('text/html').send(html);
  });

  instance.get('/login', async (request, reply) => {
    const html = await ejs.renderFile('./templates/login.html', {}, { async: true });
    reply.type('text/html').send(html);
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
});
```
Fastify uses schemas for validation (we can add via opts), and preHandlers for middleware. Use HTTP status codes for semantic responses. In production, add CORS plugin if needed.

#### Frontend Setup

The frontend loads once and uses JavaScript to handle all subsequent interactions, leveraging the browser's event loop for responsiveness. **HTML Template (templates/index.html)**: This is the SPA's "shell" a static structure with IDs for JavaScript to target. Tailwind classes provide styling: responsive (e.g., max-w-2xl for mobile/desktop), hover effects for interactivity.
```
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Task Manager SPA</title>
	<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
	<div class="container mx-auto max-w-2xl mt-10 p-8 bg-white rounded-lg shadow-xl">
		<h1 class="text-3xl font-bold mb-6 text-gray-800">My Tasks</h1>
		<a href="/logout" class="text-red-500 hover:text-red-700 mb-4 inline-block">Logout</a>
		<form id="task-form" class="flex mb-6">
			<input type="text" id="task-content" class="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What needs to be done?" required>
			<button type="submit" class="bg-blue-500 text-white px-6 py-3 rounded-r-md hover:bg-blue-600 transition duration-300">Add Task</button>
		</form>
		<ul id="task-list" class="space-y-3"></ul>
	</div>
	<script src="/js/app.js"></script>
</body>
</html>
```

We use EJS for rendering, but since no dynamic data, it's simple. For auth templates, adapt similarly with forms posting to /register and /login.

**JavaScript (static/js/app.js)**: This script runs after DOM load, using async/await for readable API calls. Fetch handles promises, allowing non-blocking operations.
```
document.addEventListener('DOMContentLoaded', () => {
	const taskForm = document.getElementById('task-form');
	const taskContentInput = document.getElementById('task-content');
	const taskList = document.getElementById('task-list');

	const renderTask = (task) => {
		const li = document.createElement('li');
		li.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm';
		li.dataset.id = task.id;
		li.innerHTML = `
			<span class="text-gray-700">${task.content}</span>
			<button class="text-red-500 hover:text-red-700 font-semibold">Delete</button>
		`;
		li.querySelector('button').addEventListener('click', async () => {
			await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
			li.remove();
		});
		taskList.appendChild(li);
	};

	const fetchTasks = async () => {
		const response = await fetch('/api/tasks');
		if (response.status === 401) {
			window.location.href = '/login';
			return;
		}
		const tasks = await response.json();
		taskList.innerHTML = '';
		tasks.forEach(renderTask);
	};

	taskForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const content = taskContentInput.value.trim();
		if (!content) return;
		const response = await fetch('/api/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		});
		const newTask = await response.json();
		renderTask(newTask);
		taskContentInput.value = '';
	});

	fetchTasks();
});
```

This emphasizes event-driven programming: listeners respond to actions, keeping UI reactive. We can add error handling for robustness.
**Running the App**:

- Initialize the database: Run npx prisma migrate dev to create tables.
- Start the server: node app.js (runs on localhost:3000).
- Usage: Navigate to /register, create an account (password hashed), log in (session established), manage tasks. The SPA updates dynamically.

This setup demonstrates a robust SPA: secure, efficient, user-friendly. Common pitfalls include session config in prod or handling network errors.

## Managing Our App with the Node.js REPL

### Introduction
During development or maintenance, we often need to inspect or manipulate database data directly e.g., seeding initial users, debugging query issues, or correcting erroneous entries. Building a full admin dashboard for this is overkill for small projects, and raw SQL tools lack integration with our app's models and context, leading to errors or duplicated effort. The **Node.js REPL** with Fastify context is an enhanced interactive shell that we can load with our app's Prisma client, providing direct access to database operations. This allows interactive, JavaScript-based database tasks using Prisma's ORM, which abstracts SQL into object-oriented queries. It's faster than writing throwaway scripts and safer than manual SQL (ORM handles escaping). For deeper insight, understand that Prisma uses a **client** pattern: changes are executed transactionally, ensuring integrity (all or nothing on failure). Let's explore how this fits into our workflow by loading the Prisma client in the REPL, we can query and modify data as if in our app, bridging development and debugging seamlessly.

### Working with the Shell

**Open the REPL**:

```
node
```
Then, in the REPL, load the context:

```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```
 In the REPL, we use Prisma for queries, which return promises so use async/await or .then(). Queries are type-safe and efficient.

```
// Create database schema (run migrations outside REPL if needed)

// Add a new user (demonstrates hashing)
const bcrypt = require('bcrypt');
const salt = await bcrypt.genSalt(12);
const passwordHash = await bcrypt.hash('supersecret', salt);
const newUser = await prisma.user.create({ data: { username: 'admin', passwordHash } });

// Query users
const users = await prisma.user.findMany();

// Find a specific user
const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
console.log(adminUser.id);

// Add a task for a user
const task = await prisma.task.create({ data: { content: 'Sample task', userId: adminUser.id } });

// Delete a task
const taskToDelete = await prisma.task.findUnique({ where: { id: 1 } });
await prisma.task.delete({ where: { id: taskToDelete.id } });
```
Advanced usage: Chain queries like `await prisma.user.findMany({ where: { username: { contains: 'admin' } }, orderBy: { id: 'desc' }, take: 5 })` for filtering/sorting/pagination.   
Pitfalls: Always await promises; test in dev DB to avoid prod data loss. The Node.js REPL streamlines workflows, reducing development time by providing a familiar JS environment for database tasks.

## Real-Time Magic with WebSockets

While our SPA excels at on-demand data fetching via HTTP (a request-response, stateless protocol), it's inefficient for scenarios requiring instant updates pushed from the server, like chat apps. Polling (repeated client requests) wastes bandwidth and battery, introduces delays, and scales poorly with many users. Long-polling or server-sent events help but still rely on HTTP's unidirectional nature. **WebSockets** establish a persistent, full-duplex connection over TCP, allowing the server to push data anytime without requests. This enables true real-time features, like live messaging. We'll use **@fastify/websocket** with Socket.IO compatibility, integrating seamlessly with Fastify. Events (e.g., 'connect', 'new_message') drive the logic, similar to pub-sub patterns. We persist messages in Prisma for history, ensuring reloads don't lose data, and enforce auth to prevent unauthorized access. Deeper: WebSockets in Fastify are handled via plugins, supporting upgrades from HTTP. This reduces latency (no HTTP overhead) but requires handling connections (e.g., close on disconnect). As we build, we'll see how events flow bidirectionally, making the app feel alive.

### Setup

**Install Dependencies**:

```
npm install @fastify/websocket socket.io
```

**Project Structure** (extends SPA structure): Adds chat-specific files while reusing auth/models.

```
project/
├── app.js
├── prisma/schema.prisma
├── validation.js
├── utils.js
├── templates/
│   ├── chat.html  # Chat UI skeleton
│   └── ...        
├── static/
│   ├── js/chat.js # Client-side Socket.IO logic
│   └── css/styles.css
```

Update Schema (prisma/schema.prisma): Add Message model with timestamp.
```
model Message {
  id        Int      @id @default(autoincrement())
  content   String
  userId    Int
  timestamp DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```
Run npx prisma migrate dev.

**Backend with WebSockets (app.js)**: Register websocket plugin; handle events with socket.on.

```
// ... (previous imports and registrations) ...
fastify.register(require('@fastify/websocket'));

fastify.register(async (instance) => {
  // ... (previous routes) ...

  instance.get('/chat', { preHandler: authRequired }, async (request, reply) => {
    const html = await ejs.renderFile('./templates/chat.html', {}, { async: true });
    reply.type('text/html').send(html);
  });

  instance.get('/ws', { websocket: true }, (connection, req) => {
    if (!req.session.userId) {
      connection.socket.close();
      return;
    }

    connection.socket.on('connect', async () => {
      const messages = await prisma.message.findMany({ orderBy: { timestamp: 'asc' }, include: { user: true } });
      messages.forEach(msg => {
        connection.socket.emit('message_received', { username: msg.user.username, text: msg.content });
      });
    });

    connection.socket.on('new_message', async (data) => {
      const msg = await prisma.message.create({
        data: { content: data.text, userId: req.session.userId }
      });
      const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
      instance.websocketServer.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ event: 'message_received', data: { username: user.username, text: data.text } }));
        }
      });
    });
  });
});
```
For full Socket.IO, use fastify-socket.io plugin. In prod, use scalable servers.

**Frontend Setup** The client uses Socket.IO library for connection and events.   
**HTML Template (templates/chat.html)**:
```
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Live Chat</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.js"></script>
</head>
<body class="bg-gray-200">
	<div class="container mx-auto max-w-3xl mt-10 flex flex-col h-[80vh]">
		<h1 class="text-3xl font-bold mb-4 text-center">Live Chat</h1>
		<a href="/logout" class="text-red-500 hover:text-red-700 mb-4">Logout</a>
		<div id="messages" class="flex-grow bg-white p-4 rounded-t-lg shadow-inner overflow-y-auto"></div>
		<form id="chat-form" class="flex">
			<input id="message-input" class="flex-grow p-3 border border-gray-300 focus:outline-none" autocomplete="off" placeholder="Type a message...">
			<button class="bg-green-500 text-white px-6 py-3 hover:bg-green-600">Send</button>
		</form>
	</div>
	<script src="/js/chat.js"></script>
</body>
</html>
```

**JavaScript (static/js/chat.js)**:
```
document.addEventListener('DOMContentLoaded', () => {
	const socket = io(); 
	const chatForm = document.getElementById('chat-form');
	const messageInput = document.getElementById('message-input');
	const messagesDiv = document.getElementById('messages');

	chatForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const text = messageInput.value.trim();
		if (text) {
			socket.emit('new_message', { text });
			messageInput.value = '';
		}
	});

	socket.on('message_received', (msg) => {
		const msgElement = document.createElement('div');
		msgElement.className = 'mb-2';
		msgElement.innerHTML = `<strong class="text-blue-600">${msg.username}:</strong> <span>${msg.text}</span>`;
		messagesDiv.appendChild(msgElement);
		messagesDiv.scrollTop = messagesDiv.scrollHeight;
	});
});
```

This is event-driven: emit sends, on receives. Add robustness with error listeners.

**Running the App**:

- Migrate DB: npx prisma migrate dev.
- Start: node app.js.
- Usage: Log in, go to /chat; messages broadcast and persist.

This illustrates WebSockets' efficiency. Extend with typing indicators.

## Decoupling with React

Our vanilla JavaScript SPA works but scales poorly: As features expand (e.g., nested components, complex state, routing), code becomes repetitive and hard to manage manual DOM updates lead to bugs, state is scattered, and reusability is limited. Vanilla JS lacks built-in tools for component isolation or lifecycle management. **React** introduces a declarative, component-based paradigm: UIs are built from reusable components that manage their own state and props. Hooks (e.g., useState, useEffect) handle side effects and lifecycle, while JSX blends HTML/JS for intuitive rendering. This decouples the frontend fully the Fastify backend stays API-only, and React handles routing (via React Router), state, and optimizations (virtual DOM for efficient updates). Benefits: Better organization, automatic re-renders, ecosystem (e.g., Redux). Deeper: React's virtual DOM diffs changes, boosting performance. We can use SSR via Next.js, but focus on client-side here.

### The Approach

We'll refactor the task manager into React, reusing the Fastify API. Components encapsulate logic/UI; state is reactive. The chat can follow, using useEffect for sockets. **Setup React**:

- Create: npx create-react-app frontend.
- Install: npm install axios react-router-dom tailwindcss.
- Configure Tailwind: Add to index.css with @tailwind base; @tailwind components; @tailwind utilities;. **React Frontend Structure**: Modular: Components in folders, App as root with routes.

text

```
frontend/
├── src/
│   ├── components/
│   │   ├── TaskManager.jsx  # Tasks logic/UI
│   │   ├── Login.jsx        # Login form
│   │   ├── Register.jsx     # Register form
│   ├── App.jsx              # Routes setup
│   ├── index.js             # Renders App
│   └── index.css            # Styles
```

**Example React Component (src/components/TaskManager.jsx)**: Uses hooks for state and effects.

```
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('/api/tasks');
        setTasks(res.data);
      } catch (err) {
        if (err.response.status === 401) window.location.href = '/login';
      }
    };
    fetchTasks();
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    if (!content) return;
    const res = await axios.post('/api/tasks', { content });
    setTasks([...tasks, res.data]);
    setContent('');
  };

  const deleteTask = async (id) => {
    await axios.delete(`/api/tasks/${id}`);
    setTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div className="container mx-auto max-w-2xl mt-10 p-8 bg-white rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Tasks</h1>
      <a href="/logout" className="text-red-500 hover:text-red-700 mb-4 inline-block">Logout</a>
      <form onSubmit={addTask} className="flex mb-6">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What needs to be done?"
        />
        <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded-r-md hover:bg-blue-600 transition duration-300">Add Task</button>
      </form>
      <ul className="space-y-3">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm">
            <span className="text-gray-700">{task.content}</span>
            <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManager;
```

This shows React's power: State changes trigger re-renders automatically. For the full app, set up routes in App.jsx for Login, Register, and TaskManager, using React Router. Run the frontend separately (e.g., npm start), proxying API calls to the Fastify backend. This completes the decoupling, making our app scalable and maintainable.