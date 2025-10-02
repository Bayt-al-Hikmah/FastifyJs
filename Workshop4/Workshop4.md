## Objectives

- Implement **user authentication** with registration, login, and logout, using hashed passwords and a Fastify decorator for route protection.
- Introduce **SQLite** as a simple, file-based database for persistent data storage.
- Interact with SQLite using **raw SQL**, then encapsulate logic with a simple class, and finally leverage an **ORM (Sequelize)** for cleaner database operations.
- Structure our Fastify project to separate concerns, ensuring maintainability and scalability.

## Hashed Passwords and Authentication

Authentication is a cornerstone of multi-user applications, allowing users to register, log in, and access protected resources securely. In this section, we’ll use the argon2 library to hash passwords securely and leverage Fastify’s session management to track logged-in users. We’ll also create a clean, reusable authentication system using Fastify’s plugin system.

### Hashing Passwords

Storing passwords in plain text is a significant security risk, as unauthorized access to our database could expose them. Instead, we’ll hash passwords using a one-way function, ensuring that even we, as developers, cannot reverse them. When a user logs in, we hash their input and compare it to the stored hash. If they match, the login is successful.

We’ll use the bcrypt library, which provides:

- fastify.argon2.hash(password): Generates a secure hash for a password.
- fastify.argon2.verify(hash, password): Verifies if a provided password matches the stored hash.

**Install Dependencies** We begin by installing Fastify and the necessary plugins for session management, form handling, templating, and password hashing.

```
npm install fastify @fastify/cookie @fastify/session @fastify/flash @fastify/static @fastify/view handlebars @fastify/formbody argon2
```

**Set Up Session and Templating Plugins** We create plugins to handle sessions, flash messages, and templating with Handlebars, ensuring our application is modular and secure.

**plugins/session.js:**

```
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: 'your-super-secret-key-that-no-one-knows',
    cookie: { secure: false } // Set secure: true in production with HTTPS
  })
  fastify.register(require('@fastify/flash'))
})
```

**plugins/templates.js:**

```
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/view'), {
    engine: { handlebars: require('handlebars') },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true,
options: {
    partials: {
      _layout: 'partials/_layout.hbs'

    }
  }
  })
})
```

**plugins/static.js:**
```
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/static/'
  })
})
```

**`plugins/argon2.js:`**
```
const fp = require('fastify-plugin')
const argon2 = require('argon2')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('argon2', argon2)
})
```
**`./plugins/db-plugin.js`:**

```javascript
const fp = require('fastify-plugin');

const users={}

async function dbConnector (fastify, options) {
  fastify.decorate('users', users);
}

module.exports = fp(dbConnector, {
    name: 'data-connector' 
});
```
**`plugins/formbody.js:`**
```
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/formbody'))
})
````
**routes/auth.js:**
```

module.exports = async (fastify, opts) => {
  

  // In-memory user store (temporary)
  

  fastify.get('/register', async (request, reply) => {
    return reply.view('register', { messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (fastify.users[username]) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    const passwordHash = await fastify.argon2.hash(password) // 10 salt rounds
    fastify.users[username] = { passwordHash }
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    return reply.view('login', { messages: request.flash('danger') || request.flash('success') || request.flash('info') })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = fastify.users[username]

    if (!user || !(await fastify.argon2.verify(user.passwordHash,password))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user', username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/profile')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    request.flash('info', 'You have been logged out.')
    return reply.redirect('/login')
  })
}
```

**Create Templates** 
We create Handlebars templates for registration and login.

**views/partials/_layout.hbs:**
```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MyApp</title>
  <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/home">MyApp</a>
      <nav class="main-nav">
        {{#if session.user}}
          <span class="greet">Hello, {{session.user}}</span>
          <a href="/logout" class="nav-link">Logout</a>
        {{else}}
          <a href="/login" class="nav-link">Login</a>
          <a href="/register" class="nav-link">Register</a>
        {{/if}}
      </nav>
    </div>
  </header>

  <main class="container">
    {{#if messages}}
      <div class="flash-wrapper">
        {{#each messages}}
          <div class="flash flash-{{this.category}}">
            <span class="flash-message">{{this.message}}</span>
            <button class="flash-dismiss" onclick="this.parentElement.style.display='none'">×</button>
          </div>
        {{/each}}
      </div>
    {{/if}}

    <section class="content">
      {{> @partial-block}}
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <small>&copy; 2025 MyApp</small>
    </div>
  </footer>
</body>
</html>
```
**views/register.hbs:**
```
{{#> _layout}}
<h1 class="page-title">Create an account</h1>
<form method="POST" class="form-card">
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required>
  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Register</button>
    <a href="/login" class="btn btn-link">Already have an account?</a>
  </div>
</form>
{{/ _layout}}
```
**views/login.hbs:**
```
{{#> _layout}}
<h1 class="page-title">Log in</h1>
<form method="POST" class="form-card">
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required>
  <div class="form-actions">
    <button type="submit" class="btn btn-success">Login</button>
    <a href="/register" class="btn btn-link">Create account</a>
  </div>
</form>
{{/ _layout}}
```

**Add CSS** 
We define styles to ensure a consistent, professional look across our application.

**public/css/style.css:**
```
/* Basic reset */
* { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }

:root {
  --container-width: 900px;
  --accent: #2b7cff;
  --muted: #6b7280;
  --bg: #f7f8fb;
  --card: #ffffff;
  --danger: #ef4444;
  --success: #16a34a;
  --info: #0ea5e9;
}

/* Layout */
body {
  background: var(--bg);
  color: #111827;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  width: 92%;
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 24px 0;
}

/* Header */
.site-header {
  background: var(--card);
  box-shadow: 0 1px 2px rgba(16,24,40,0.06);
  border-bottom: 1px solid rgba(16,24,40,0.04);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.brand {
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  font-size: 1.1rem;
}

.main-nav { display: flex; gap: 12px; align-items: center; }
.nav-link { text-decoration: none; color: var(--muted); font-size: 0.95rem; padding: 6px 8px; border-radius: 6px; }
.nav-link:hover { background: rgba(43,124,255,0.06); color: var(--accent); }

.greet { color: var(--muted); font-size: 0.95rem; margin-right: 8px; }

/* Flash messages */
.flash-wrapper { margin-bottom: 18px; display: flex; flex-direction: column; gap: 10px; }
.flash {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  background: #fff;
  border: 1px solid rgba(16,24,40,0.04);
}
.flash-message { flex: 1; margin-right: 8px; font-size: 0.95rem; }
.flash-dismiss {
  background: transparent;
  border: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}

/* Flash color variants */
.flash-success { border-color: rgba(22,163,74,0.15); background: rgba(22,163,74,0.05); color: #064e2b; }
.flash-danger { border-color: rgba(239,68,68,0.15); background: rgba(239,68,68,0.05); color: #4c0505; }
.flash-info { border-color: rgba(14,165,233,0.15); background: rgba(14,165,233,0.05); color: #063045; }

/* Content */
.page-title { font-size: 1.4rem; margin-bottom: 12px; color: #111827; }
.content { margin-top: 6px; }

/* Form card */
.form-card {
  display: grid;
  gap: 10px;
  padding: 18px;
  background: var(--card);
  border-radius: 10px;
  border: 1px solid rgba(16,24,40,0.04);
  max-width: 520px;
}
.form-card label { font-size: 0.9rem; color: var(--muted); }
.form-card input[type="text"],
.form-card input[type="password"],
.form-card input[type="email"],
.form-card textarea {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(16,24,40,0.08);
  font-size: 1rem;
  width: 100%;
  background: #fff;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 9px 14px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary { background: var(--accent); color: white; border-color: rgba(43,124,255,0.1); }
.btn-success { background: var(--success); color: white; border-color: rgba(22,163,74,0.08); }
.btn-link { background: transparent; color: var(--muted); text-decoration: none; padding-left: 8px; }
.form-actions { display: flex; gap: 10px; align-items: center; margin-top: 6px; }

/* Card */
.card {
  padding: 16px;
  border-radius: 10px;
  background: var(--card);
  border: 1px solid rgba(16,24,40,0.04);
}

/* Footer */
.site-footer {
  margin-top: auto;
  padding: 18px 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.9rem;
}
```

**Bootstrap the Application** We tie everything together in app.js, registering plugins and defining a basic home route.

**app.js:**

```
const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/formbody'));
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/db-plugin'));
fastify.register(require('./plugins/argon2'));

// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })

fastify.get('/home', async (request, reply) => {
  return reply.view('home')
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

**views/home.hbs:**
```
{{#> _layout}}
<h1 class="page-title">Welcome to MyApp</h1>
<p>Create and manage your account!</p>
{{/ _layout}}
```

Run node app.js, visit http://127.0.0.1:3000/register, create a user with a username and password, log in at /login, and log out at /logout. Flash messages provide feedback, and the session persists the user’s login state.

We use argon2 to securely hash passwords, ensuring that plain text passwords are never stored. Fastify’s ``@fastify/session`` plugin manages user sessions with signed cookies, providing security against tampering. The `@fastify/flash` plugin displays temporary messages, enhancing user feedback. By organizing routes in a plugin (routes/auth.js), we leverage Fastify’s modular architecture, keeping our code clean and reusable. Handlebars templates provide a dynamic front-end, rendered efficiently by ``@fastify/view``.

### Protecting Routes with Decorators

Our authentication system works, but if we have multiple protected routes (e.g., profile, dashboard, settings), repeatedly checking request.session.get('user') in each route becomes repetitive and error-prone. This violates the DRY (Don’t Repeat Yourself) principle, making our code harder to maintain. Fastify’s plugin system and decorators offer a cleaner solution.

In Fastify, a **decorator** is a way to extend the framework’s functionality or add reusable logic. We’ll create a custom decorator to check if a user is logged in before allowing access to protected routes. If the user isn’t logged in, the decorator redirects them to the login page with a flash message.

**Create an Authentication Decorator Plugin** 
We define a loginRequired decorator in a plugin, which we can apply to any route.

**plugins/auth.js:**  
```
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('loginRequired', (handler) => {
    return async (request, reply) => {
      if (!request.session.get('user')) {
        request.flash('danger', 'You must log in to access this page.')
        return reply.redirect('/login')
      }
      return handler(request, reply)
    }
  })
})
```
In this plugin, we add a helper called loginRequired to our Fastify app. The main idea is simple: we check if a user is logged in by looking at the session. If no user is found, we do two things: show a flash message to inform them they need to log in, and redirect them to the login page.  

**Apply the Decorator to a Profile Route** 
We create a profile route and apply the loginRequired decorator to protect it.

**routes/profile.js:**
```
module.exports = async (fastify, opts) => {
  fastify.get('/profile', { preHandler: fastify.loginRequired }, async (request, reply) => {
    return reply.view('profile', { username: request.session.get('user') })
  })
}
```
In this route, we want to show the user’s profile page, but only if they are logged in. We check this by using the loginRequired plugin as a preHandler. Fastify runs this function before the route’s main logic. If the user isn’t logged in, the loginRequired function automatically redirects them to the login page with a flash message.  

**views/profile.hbs:**
```
{{#> _layout}}
<h1 class="page-title">Welcome, {{username}}</h1>
<p>This is your profile page.</p>
{{/ _layout}}
```

**Register the Auth Plugin** We update app.js to register the authentication plugin and profile route.

**app.js (updated snippet):**
```
// in Plugins seciont we add
fastify.register(require('./plugins/auth'))
// In routes section we add
fastify.register(require('./routes/profile'), { prefix: '/' })
```

 Visit /profile without logging in you’ll be redirected to /login with a flash message. After logging in, /profile displays your username. Add more protected routes (e.g., /dashboard) by applying preHandler: ``fastify.loginRequired``, and the decorator will enforce authentication consistently.

The loginRequired decorator encapsulates the authentication check, making it reusable across routes. By using Fastify’s preHandler hook, we execute the check before the route handler, keeping our route logic focused on its core purpose. This approach aligns with Fastify’s philosophy of modularity and performance, reducing code duplication and ensuring consistent access control. The plugin system allows us to encapsulate this logic, making it easy to extend or modify later.

## Working with SQLite

Our in-memory user store (users object) is convenient for prototyping but loses all data when the server restarts, as it resides in volatile RAM. For a real application, we need **persistent storage** to retain data across server restarts. This is where a **database** comes in, providing a structured way to store, manage, and retrieve data.

We’ll use **SQLite**, a lightweight, file-based database ideal for learning and small to medium-sized applications. SQLite’s advantages include:

- **Serverless**: No separate server process is required.
- **File-Based**: Data is stored in a single file (e.g., database.db).
- **Built-in**: Available in Node.js via the sqlite3 package, requiring no additional setup.

### Creating the Database

We define a schema for our SQLite database to store user information. The schema includes a user table with fields for id, username, and password_hash.

**schema.sql:**

```
DROP TABLE IF EXISTS user;

CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
```

**Initialize the Database** We run the schema to create the database file:

```
sqlite3 database.db < schema.sql
```

This creates database.db with the user table, ready for use.

### Connecting Fastify with SQLite

The sqlite3 package allows us to interact with SQLite databases in Node.js. We connect to the database, execute SQL queries using parameterized statements to prevent SQL injection, and manage connections properly to ensure reliability.

**Install SQLite3**
```
npm install sqlite3
```

**Create a Database Plugin** We create a plugin to manage SQLite connections, decorating Fastify with a db object for reusable database access.

**plugins/db.js:**

```
const fp = require('fastify-plugin')
const sqlite3 = require('sqlite3').verbose()

module.exports = fp(async (fastify, opts) => {
  const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
      fastify.log.error('Failed to connect to SQLite:', err)
      throw err
    }
    fastify.log.info('Connected to SQLite database')
  })

  fastify.decorate('db', db)

  fastify.addHook('onClose', (fastify, done) => {
    db.close((err) => {
      if (err) fastify.log.error('Failed to close SQLite:', err)
      done()
    })
  })
})
```

This plugin opens a connection to database.db and decorates Fastify with the db object. The onClose hook ensures the connection closes gracefully when the server shuts down.

**Update Authentication Routes for SQLite** We modify the auth.js routes to use SQLite instead of the in-memory users object, incorporating bcrypt for password hashing.

**routes/auth.js (updated):**

```
const bcrypt = require('bcrypt')

module.exports = async (fastify, opts) => {
  fastify.register(require('fastify-formbody'))

  fastify.get('/register', async (request, reply) => {
    return reply.view('register', { messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    // Check if username exists
    const existingUser = await new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })

    if (existingUser) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    // Hash password and insert user
    const passwordHash = await bcrypt.hash(password, 10)
    await new Promise((resolve, reject) => {
      fastify.db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], (err) => {
        if (err) reject(err)
        resolve()
      })
    })

    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    return reply.view('login', { messages: request.flash('danger') || request.flash('success') || request.flash('info') })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    const user = await new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user.id)
    request.session.set('username', user.username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/profile')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    request.flash('info', 'You have been logged out.')
    return reply.redirect('/login')
  })
}
```

**Register the Database Plugin** We update app.js to include the database plugin.

**app.js (updated snippet):**
```
fastify.register(require('./plugins/db'))
```

Run node app.js, register a user at /register, and log in at /login. The user data is now stored in database.db, persisting across server restarts. Invalid login attempts or duplicate usernames trigger flash messages.

**Explanation**: The sqlite3 package provides a straightforward way to interact with SQLite, using parameterized queries (e.g., ?) to prevent SQL injection attacks. We encapsulate the database connection in a plugin, making it accessible via fastify.db across routes. The db.run method executes INSERT queries, while db.get retrieves single rows. By promisifying these operations, we integrate seamlessly with Fastify’s async/await syntax, ensuring clean and efficient database interactions. The session now stores both user_id and username for better tracking, and bcrypt ensures secure password handling.

### Refactoring with a User Class

Our SQLite-based authentication works, but our routes contain raw SQL queries, mixing database logic with route handling. This violates the DRY principle and makes maintenance harder, as we repeat queries like SELECT * FROM user WHERE username = ? across routes. It also couples our route logic tightly with database details, reducing flexibility.

To address this, we’ll encapsulate database operations in a User class, creating a clean interface for user-related actions like creating a user or finding one by username. This approach separates concerns, making our routes focus on business logic while the User class handles data access.

**Create a User Utility Module** We define a User class in a separate file to manage user-related database operations.

**utils/user.js:**
```
const bcrypt = require('bcrypt')

class User {
  static async create(fastify, username, password) {
    const passwordHash = await bcrypt.hash(password, 10)
    return new Promise((resolve, reject) => {
      fastify.db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], function (err) {
        if (err) reject(err)
        resolve(this.lastID)
      })
    })
  }

  static async findByUsername(fastify, username) {
    return new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })
  }
}

module.exports = User
```

**Update Authentication Routes** We refactor auth.js to use the User class, simplifying route logic.

**routes/auth.js (updated):**
```
const User = require('../utils/user')

module.exports = async (fastify, opts) => {
  fastify.register(require('fastify-formbody'))

  fastify.get('/register', async (request, reply) => {
    return reply.view('register', { messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (await User.findByUsername(fastify, username)) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    await User.create(fastify, username, password)
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    return reply.view('login', { messages: request.flash('danger') || request.flash('success') || request.flash('info') })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = await User.findByUsername(fastify, username)

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user.id)
    request.session.set('username', user.username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/profile')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    request.flash('info', 'You have been logged out.')
    return reply.redirect('/login')
  })
}
```

Register and log in again. The functionality remains the same, but the routes are now cleaner, relying on the User class for database operations. Data persists in SQLite, and the code is easier to maintain.

**Explanation**: The User class encapsulates database logic, providing methods like create and findByUsername that hide SQL details. By passing the fastify instance to these methods, we access the database connection (fastify.db) without hardcoding it in the class. This separation of concerns makes our routes focus on user interaction (e.g., handling form submissions) while the User class handles data access. Promisified database operations ensure compatibility with Fastify’s async nature, and the modular structure aligns with Fastify’s plugin-based design, improving maintainability and scalability.

### Using Sequelize and Models

While the User class improved our code, we’re still writing raw SQL queries, which can become cumbersome as the application grows. If we need to switch databases (e.g., to PostgreSQL), we’d have to rewrite queries. Additionally, managing complex relationships (e.g., users to wiki pages) requires more boilerplate SQL.

This is where **Sequelize**, an Object-Relational Mapper (ORM) for Node.js, comes in. Sequelize allows us to define database tables as JavaScript classes (models) and interact with them using object-oriented methods, abstracting away raw SQL. Each table becomes a model, and each row an instance, making database operations more intuitive and portable across database engines.

**Install Sequelize** We install Sequelize and the SQLite driver.
```
npm install sequelize sqlite3
```

**Create a Sequelize Plugin** We create a plugin to initialize Sequelize and make it available across our application.

**plugins/sequelize.js:**
```
const fp = require('fastify-plugin')
const { Sequelize } = require('sequelize')

module.exports = fp(async (fastify, opts) => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.db',
    logging: false // Disable logging for cleaner output
  })

  fastify.decorate('sequelize', sequelize)

  fastify.addHook('onClose', async (fastify, done) => {
    await sequelize.close()
    done()
  })
})
```

**Define a User Model** We create a User model to represent the user table, including methods for password hashing and verification.

**models/user.js:**
```
const { Model, DataTypes } = require('sequelize')
const bcrypt = require('bcrypt')

module.exports = (sequelize) => {
  class User extends Model {
    async setPassword(password) {
      this.password_hash = await bcrypt.hash(password, 10)
    }

    async checkPassword(password) {
      return bcrypt.compare(password, this.password_hash)
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(150),
      unique: true,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(200),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    timestamps: false
  })

  return User
}
```

**Initialize Models** We create a module to initialize all models and sync the database schema.

**models/index.js:**

```
module.exports = (sequelize) => {
  const User = require('./user')(sequelize)

  // Sync models with database
  sequelize.sync({ force: true }) // Recreate tables (use cautiously in production)
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Failed to sync database:', err))

  return { User }
}
```

**Update the Sequelize Plugin** We modify the Sequelize plugin to initialize models.

**plugins/sequelize.js (updated):**
```
const fp = require('fastify-plugin')
const { Sequelize } = require('sequelize')

module.exports = fp(async (fastify, opts) => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.db',
    logging: false
  })

  const models = require('../models')(sequelize)
  fastify.decorate('sequelize', sequelize)
  fastify.decorate('models', models)

  fastify.addHook('onClose', async (fastify, done) => {
    await sequelize.close()
    done()
  })
})
```

**Update Authentication Routes with Sequelize** We refactor auth.js to use the User model, simplifying database interactions.

**routes/auth.js (updated):**
```
module.exports = async (fastify, opts) => {
  fastify.register(require('fastify-formbody'))

  fastify.get('/register', async (request, reply) => {
    return reply.view('register', { messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body
    const { User } = fastify.models

    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    const user = await User.create({ username })
    await user.setPassword(password)
    await user.save()

    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    return reply.view('login', { messages: request.flash('danger') || request.flash('success') || request.flash('info') })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const { User } = fastify.models

    const user = await User.findOne({ where: { username } })
    if (!user || !(await user.checkPassword(password))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user.id)
    request.session.set('username', user.username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/profile')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    request.flash('info', 'You have been logged out.')
    return reply.redirect('/login')
  })
}
```

**Update app.js** We register the Sequelize plugin and ensure all components are connected.

**app.js (updated):**
```
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/db'))
fastify.register(require('./plugins/auth'))
fastify.register(require('./plugins/sequelize'))
fastify.register(require('./routes/auth'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })

fastify.get('/home', async (request, reply) => {
  return reply.view('home')
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

**Try It Out**: Run node app.js. Register a user, log in, and verify that data persists in database.db. The profile page is accessible only when logged in, and invalid credentials trigger flash messages.

**Explanation**: Sequelize abstracts raw SQL into model-based interactions, allowing us to work with User objects instead of queries. The User model encapsulates fields (id, username, password_hash) and methods (setPassword, checkPassword), making routes cleaner and more maintainable. The Sequelize plugin decorates Fastify with sequelize and models, providing easy access across the application. The sync({ force: true }) call recreates the database schema for development (use force: false in production to avoid data loss). This ORM approach ensures portability across databases and simplifies complex operations, aligning with Fastify’s focus on modularity and developer productivity.

## Restructuring Our Project

Our application works, but app.js is becoming crowded with plugin registrations and route definitions. As we add features like wiki pages or file uploads, mixing routes, database logic, and helpers in one file will make it hard to maintain. A well-structured project separates concerns, ensuring each component has a clear purpose: routes handle HTTP requests, models manage data, and utilities provide reusable logic.

### A Cleaner Structure

We organize our project to keep responsibilities distinct, enhancing scalability and collaboration:

text

```
project/
├── app.js             # Main entry point, registers plugins and routes
├── plugins/          # Fastify plugins for shared functionality
│   ├── session.js
│   ├── templates.js
│   ├── static.js
│   ├── auth.js
│   ├── db.js
│   ├── sequelize.js
├── routes/           # Route definitions
│   ├── auth.js
│   ├── profile.js
├── models/           # Database models
│   ├── user.js
│   ├── index.js
├── utils/            # Helper functions and classes
│   ├── user.js
├── public/           # Static assets (CSS, JS, images)
│   ├── css/
│   │   └── style.css
├── views/            # Handlebars templates
│   ├── partials/
│   │   ├── _layout.hbs
│   ├── home.hbs
│   ├── register.hbs
│   ├── login.hbs
│   ├── profile.hbs
├── schema.sql        # Database schema
├── database.db       # SQLite database file
├── package.json
```

- **app.js**: The main entry point, responsible for initializing Fastify, registering plugins, and defining top-level routes. It remains lightweight, delegating logic to plugins and routes.
- **plugins/**: Contains reusable functionality like session management, database connections, and decorators. Each plugin encapsulates a specific concern, making it easy to reuse or modify.
- **routes/**: Defines HTTP endpoints, focusing on request handling and response rendering. Routes use models and utilities, keeping logic minimal.
- **models/**: Houses Sequelize models (User, etc.), defining database structure and behavior. The index.js file initializes all models.
- **utils/**: Stores helper classes like the raw SQL User class, used before adopting Sequelize.
- **public/**: Holds static assets like CSS, served via fastify-static.
- **views/**: Contains Handlebars templates for dynamic HTML rendering.
- **schema.sql**: Defines the initial database schema for SQLite.
- **database.db**: The SQLite database file, storing persistent data.

Organize your project as shown above, ensuring all files are in place. Run node app.js and verify that registration, login, and profile access work as expected. The structured layout makes it easier to locate and modify code, such as adding new routes or models.

**Explanation**: This structure leverages Fastify’s plugin system to encapsulate functionality, ensuring each file has a single responsibility. Plugins handle cross-cutting concerns (e.g., database connections, authentication checks), while routes focus on HTTP interactions and models manage data. This separation makes the codebase easier to navigate, test, and extend, especially as the application grows. For example, adding a new feature like wiki pages would involve creating a new route file and model, without cluttering app.js. Fastify’s lightweight and modular design shines in this setup, enabling high performance and developer productivity.
