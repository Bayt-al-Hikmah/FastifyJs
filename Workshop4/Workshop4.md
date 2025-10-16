## Objectives

- Implement **user authentication** with registration, login, and logout, using hashed passwords and a Fastify decorator for route protection.
- Introduce **SQLite** as a simple, file-based database for persistent data storage.
- Interact with SQLite using **raw SQL**, then encapsulate logic with a simple class, and finally leverage an **ORM (Sequelize)** for cleaner database operations.
- Structure our Fastify project to separate concerns, ensuring maintainability and scalability.

## Hashed Passwords and Authentication

Authentication is a cornerstone of multi-user applications, allowing users to register, log in, and access protected resources securely. In this section, we’ll use the argon2 library to hash passwords securely and leverage Fastify’s session management to track logged-in users. We’ll also create a clean, reusable authentication system using Fastify’s plugin system.

### Hashing Passwords

Storing passwords in plain text is a significant security risk, as unauthorized access to our database could expose them. Instead, we’ll hash passwords using a one-way function, ensuring that even we, as developers, cannot reverse them. When a user logs in, we hash their input and compare it to the stored hash. If they match, the login is successful.

We’ll use the argon2 library, which provides:

- argon2.hash(password): Generates a secure hash for a password.
- argon2.verify(hash, password): Verifies if a provided password matches the stored hash.

### Install Dependencies  
We begin by installing Fastify and the necessary plugins for session management, form handling, templating, and password hashing.

```
npm install fastify @fastify/cookie @fastify/session @fastify/flash @fastify/static @fastify/view handlebars @fastify/formbody argon2
```

### Set Up Session and Templating Plugins 
We create plugins to handle sessions, flash messages, and templating with Handlebars, ensuring our application is modular and secure.

**plugins/session.js:**

```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: 'your-super-secret-key-that-no-one-knows', // change in production
    cookie: {
      secure: false,       // true in production with HTTPS
      httpOnly: true,      // prevents access via client-side JS
      sameSite: 'lax',     // helps prevent CSRF
      maxAge: 15 * 60 * 1000 // 15 minutes in milliseconds
    },
    saveUninitialized: false
  })
  fastify.register(require('@fastify/flash'))
})
```
For more security, we updated the previous session plugin to fix issues with storing sensitive data. Instead of relying on localStorage for JWTs which OWASP and Auth0 strongly advise against due to XSS risks we now store session tokens in HttpOnly cookies with a short expiry of 15 minutes. In the code, ``fastify.register(require('@fastify/session'), {...})`` sets up the session with a secret key for signing, and the cookie options enforce secure handling: ``httpOnly: true`` prevents access from client-side scripts, ``sameSite: 'lax'`` mitigates CSRF risks, and ``maxAge: 15 * 60 * 1000`` ensures the session expires after 15 minutes. The saveUninitialized: false option avoids creating empty sessions, keeping session storage efficient while maintaining secure server-side session management.  

**plugins/templates.js:**   
We set the templates plugin

```javascript
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
We set the static plugin so we can serve static files
```javascript
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/static/'
  })
})
```
**`./plugins/db-plugin.js`:**   
We create a database plugin to work as our In-memory database
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
We set the form parser plugin
```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/formbody'))
})
```
**`plugins/404.js`**  
We add the non found page plugin  
```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
    await fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).view('404', {
            title: 'Page Not Found',
            url: request.raw.url
        })
    })
})
```
Now we create the ``util.js`` File and we save inside it the `collectMessages` function that we used in last lecture.   
**`utils.js`:**
```javascript
function collectMessages(reply) {
    const categories = ['danger', 'success', 'info']
    const messages = []

    for (const category of categories) {
      const msgs = reply.flash(category) || []
      for (const msg of msgs) {
        messages.push({ category, message: msg })
      }
    }

    return messages
}

module.exports = collectMessages
```
### Creating the Routes
After we finish setting our plugins we move to create the routes.  
**``routes/auth.js:``**
```javascript
const argon2 = require('argon2')
const collectMessages = require('../utils')
module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (fastify.users[username]) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    const passwordHash = await argon2.hash(password) 
    fastify.users[username] = { passwordHash }
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = fastify.users[username]

    if (!user || !(await argon2.verify(user.passwordHash,password))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user', username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}
```
**GET /register**

When the user visits `/register`:

- The server uses the `collectMessages()` utility to gather any flash messages (temporary notifications).
    
- It renders the `register` view (a Handlebars or EJS template) and displays messages such as “Username already exists” or “Registration successful”.
    

**POST /register**

When the registration form is submitted:

1. The server extracts `username` and `password` from the request body.
    
2. It checks if the username already exists in memory (`fastify.users`).
    
    - If yes: shows a danger message (“Username already exists!”) and redirects back to `/register`.
3. If it’s a new username:
    - The password is **hashed using Argon2** with`const passwordHash = await argon2.hash(password)`, This ensures passwords are stored securely.

    - The new user is added to memory: `fastify.users[username] = { passwordHash }`
        
    - A success message is shown, and the user is redirected to `/login`.
        

**GET /login**

When the user visits `/login`:

- Flash messages (like “You have been logged out” or “Invalid credentials”) are collected.
- The `login` view is rendered with these messages.

**POST /login**

When the login form is submitted:

1. The server retrieves the user record by `username`.
    
2. If no such user exists or the password doesn’t match, it shows an error, `argon2.verify()` compares the stored hash and the entered password.
        
3. If valid, the user’s session is created: `request.session.set('user', username)`, and a success message is shown before redirecting to `/profile`.
    

**GET /logout**

When visiting `/logout`:

- The current session is **destroyed**, logging the user out.
    
- A message “You have been logged out.” is displayed.
    
- The user is redirected back to `/login`.  


### Creating Templates 
We create Handlebars templates for registration and login.

**``views/partials/_layout.hbs``:**
```HTML
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
      <a class="brand" href="/">MyApp</a>
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

**``views/home.hbs``:**
```HTML
{{#> _layout}}
<h1 class="page-title">Welcome to MyApp</h1>
<p>Create and manage your account!</p>
{{/ _layout}}
```
**``views/register.hbs``:**
```HTML
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
```HTML
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
**views/404.hbs:**
```HTML
{{#> _layout}}
  <div class="card" style="text-align: center; padding: 40px;">
    <h1 class="page-title" style="font-size: 2rem; margin-bottom: 10px;">404 - Page Not Found</h1>
    <p class="text-muted" style="margin-bottom: 20px;">
      Oops! The page you are looking for doesn’t exist or has been moved.
    </p>
    <a href="/" class="btn btn-primary">Go Back Home</a>
  </div>
{{/_layout}}

```


### Adding CSS  
Create a ``css`` folder inside the public ``folder`` and place your ``style.css`` file inside it. For this lecture, we will use the styles from the ``material`` folder.

### Bootstrap the Application 
We tie everything together in app.js, registering plugins and defining a basic home route.

**``app.js``:**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/formbody'));
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/db-plugin'));
fastify.register(require('./plugins/404'))

// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })

fastify.get('/', async (request, reply) => {
  return reply.view('home',{session:request.session})
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

Run node app.js, visit http://127.0.0.1:3000/register, create a user with a username and password, log in at /login, and log out at /logout. Flash messages provide feedback, and the session persists the user’s login state.

We use argon2 to securely hash passwords, ensuring that plain text passwords are never stored. Fastify’s ``@fastify/session`` plugin manages user sessions with signed cookies, providing security against tampering. The `@fastify/flash` plugin displays temporary messages, enhancing user feedback. By organizing routes in a plugin (routes/auth.js), we leverage Fastify’s modular architecture, keeping our code clean and reusable. Handlebars templates provide a dynamic front-end, rendered efficiently by ``@fastify/view``.

## Protecting Routes with Decorators

Our authentication system works, but if we have multiple protected routes (e.g., profile, dashboard, settings), repeatedly checking request.session.get('user') in each route becomes repetitive and error-prone. This violates the DRY (Don’t Repeat Yourself) principle, making our code harder to maintain. Fastify’s plugin system and decorators offer a cleaner solution.

In Fastify, a **decorator** is a way to extend the framework’s functionality or add reusable logic. We’ll create a custom decorator to check if a user is logged in before allowing access to protected routes. If the user isn’t logged in, the decorator redirects them to the login page with a flash message.

### Creating Authentication Decorator Plugin   
We define a loginRequired decorator in a plugin, which we can apply to any route.

**``plugins/auth.js``:**  
```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('loginRequired', async (handler) => {
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

### Editing The Profile Route**   
We create a profile route and apply the loginRequired decorator to protect it.

**``routes/profile.js``:**  
```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/profile', await fastify.loginRequired(async (request, reply) => {
  const user = request.session.get('user')
  return reply.view('profile', { username:user })
}))
}
```
In this route, we want to display the user’s profile page, but only if they are logged in.  
We achieve this by using the **`loginRequired`** decorator we created earlier.

When a request is made to `/profile`, Fastify first runs the `loginRequired` function before executing the route’s main logic.

- If the user **is not logged in**, `loginRequired` automatically redirects them to the login page and shows a flash message saying they must log in.
    
- If the user **is logged in**, the route handler runs normally and renders the `profile` view, passing the logged-in username to the template.

### Creating Profile Template
**``views/profile.hbs``:**
```html
{{#> _layout}}
<h1 class="page-title">Welcome, {{username}}</h1>
<p>This is your profile page.</p>
{{/ _layout}}
```
### Configure The app.js 
We update app.js to register the authentication plugin and profile route.

**app.js (updated snippet):**
```javascript
// in Plugins seciont we add
fastify.register(require('./plugins/auth'))
// In routes section we add
fastify.register(require('./routes/profile'), { prefix: '/' })
```
### Using hooks
Another way to implemet the loginReguired is using hooks, hooks allow us to plugins tap into the request-response lifecycle, allowing us to add custom logic like logging or authentication checks.   
Fastify provide us the following hooks
#### **`onRequest`**  
Runs **as soon as a request arrives** before anything else, Used for:    
- Logging requests
- Basic request filtering
- Adding headers or tracking info
#### **`preParsing`**  
 Runs **before Fastify parses the incoming body**,Used for:    
- Modifying or validating raw request data     
- Handling custom content types
#### **`preValidation`**  
Runs **after the request is parsed**, but **before validation**, Used for:
- Checking authentication or tokens     
- Preparing data for validation

#### **`preHandler`**  
 Runs **right before the route handler**, Used for: 
- Authorization checks
- Attaching data to the request    
- Final setup before main logic        

#### **`Handler`**  
 The main route function that processes the request and returns a response.
#### **`onSend`**  
 Runs **after the response is generated**, but **before it’s sent to the client**, Used for:    
- Modifying the response     
- Adding headers
- Logging response data        

#### `onResponse`  
Runs **after the response is fully sent** to the client, Used for:    
- Cleanup tasks    
- Logging or metrics collection

### Editing our code  
**`plugins/auth.js`:**  
We’ve updated the ``loginRequired`` function so that it now checks whether the user is logged in.  
If the user is not logged in, it redirects them to the login page with a flash message.  
If the user is logged in, the function allows the request to continue and complete the normal Fastify lifecycle  
```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('loginRequired',  async (request, reply) => {
      if (!request.session.get('user')) {
        request.flash('danger', 'You must log in to access this page.')
        return reply.redirect('/login')
      }
    })
  })

```
**``routes/profile.js``**    
Now we add fastify.loginRequired to our route by passing an object that specifies which hooks should run before the route handler.
In this case, we want to run the preHandler hook, so we include it like this:`{ preHandler: fastify.loginRequired }`, This ensures that the authentication check runs before the main function that handles the route’s request.
```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/profile', {preHandler:fastify.loginRequired},async (request, reply) => {
  const user = request.session.get('user')
  return reply.view('profile', { username:user })
})
}
```

Visit /profile without logging in you’ll be redirected to /login with a flash message. After logging in, /profile displays your username. Add more protected routes (e.g., /dashboard) by applying preHandler: ``fastify.loginRequired``, and the decorator will enforce authentication consistently.

The loginRequired decorator encapsulates the authentication check, making it reusable across routes. By using Fastify’s preHandler hook, we execute the check before the route handler, keeping our route logic focused on its core purpose. This approach aligns with Fastify’s philosophy of modularity and performance, reducing code duplication and ensuring consistent access control. The plugin system allows us to encapsulate this logic, making it easy to extend or modify later.

## Working with SQLite  

Storing users in memory (just in the server’s RAM) is convenient for quick prototyping, but it has a major limitation: all data is lost whenever the server restarts because RAM is volatile. For any real-world application, we need persistent storage a way to save data that survives server restarts. This is where a database comes in. A database provides a structured and reliable way to store, manage, and retrieve data, ensuring that users’ information is safe and always accessible.

We’ll use **SQLite**, a lightweight, file-based database ideal for learning and small to medium-sized applications. SQLite’s advantages include:

- **Serverless**: No separate server process is required.
- **File-Based**: Data is stored in a single file (e.g., database.db).
- **Built-in**: Available in Node.js via the sqlite3 package, requiring no additional setup.

### Creating the Database

We define a schema for our SQLite database to store user information. The schema includes a user table with fields for id, username, and password_hash.

**``schema.sql``:**

```SQL
DROP TABLE IF EXISTS user;

CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
```

### Initialize the Database 
We run the schema to create the database file:  

First we connect and create the database file
```BASH
sqlite3 database.db 
```
Now we will be inside the `sqlite` terminal , we run the following command to create our table
```BASH
.read schema.sql
```
Then we quit the sqlite terminal using
```
.quit
```
This creates database.db with the user table, ready for use.

### Connecting Fastify with SQLite

The sqlite3 package allows us to interact with SQLite databases in Node.js. We connect to the database, execute SQL queries using parameterized statements to prevent SQL injection, and manage connections properly to ensure reliability.

**Install SQLite3**
```BASH
npm install sqlite3
```

### Create a Database Plugin  
We create a plugin to manage SQLite connections, decorating Fastify with a db object for reusable database access.

**``plugins/db.js:``**

```javascript
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

### Update Authentication Routes for SQLite  
We modify the auth.js routes to use SQLite instead of the in-memory users object, incorporating argon2 for password hashing.

**``routes/auth.js`` (updated):**

```javascript
const argon2 = require('argon2')
const collectMessages = require('../utils')

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

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
    const passwordHash = await argon2.hash(password)
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
    const messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    const user = await new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })

    if (!user || !(await argon2.verify(user.password_hash, password) )) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user["id"])
    request.session.set('user', user["username"])
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}
```

By using the ``fastify.db`` plugin that we created, we can run commands on our database in a structured and secure way. To insert data, we use:
```javascript
fastify.db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], callback)
```
To get data, we use:
```javascript
fastify.db.get('SELECT * FROM user WHERE username = ?', [username], callback)
```

Notice that we use placeholders `?` instead of directly concatenating strings. This ensures user input is safely escaped, preventing SQL injection.

We wrap these database calls in Promises because the database plugin uses a callback-based API. Promises allow us to await these operations, making the code cleaner, easier to read, and compatible with async/await syntax. This way, we can handle asynchronous database operations reliably while keeping our code simple and maintainable   

### Register the Database Plugin
We update app.js to include the database plugin.

**``app.js`` (updated snippet):**
```javascript
fastify.register(require('./plugins/db'))
```

Run node app.js, register a user at /register, and log in at /login. The user data is now stored in database.db, persisting across server restarts. Invalid login attempts or duplicate usernames trigger flash messages.

The sqlite3 package provides a straightforward way to interact with SQLite, using parameterized queries (e.g., ?) to prevent SQL injection attacks. We encapsulate the database connection in a plugin, making it accessible via fastify.db across routes. The db.run method executes INSERT queries, while db.get retrieves single rows. By promisifying these operations, we integrate seamlessly with Fastify’s async/await syntax, ensuring clean and efficient database interactions. The session now stores both user_id and username for better tracking, and argon2 ensures secure password handling.

## Refactoring with a User Class

Our SQLite-based authentication works, but our routes contain raw SQL queries, mixing database logic with route handling. This violates the DRY principle and makes maintenance harder, as we repeat queries like `SELECT * FROM user WHERE username = ?` across routes. It also couples our route logic tightly with database details, reducing flexibility.

To address this, we’ll encapsulate database operations in a User class, creating a clean interface for user-related actions like creating a user or finding one by username. This approach separates concerns, making our routes focus on business logic while the User class handles data access.

### Create a User Utility Module 
We define a User class in a separate file to manage user-related database operations.

**``utils/user.js``:**
```javascript
const argon2 = require('argon2')
class User {
  static async create(db, username, password) {
    const passwordHash = await argon2.hash(password)
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], function (err) {
        if (err) reject(err)
        resolve(this.lastID)
      })
    })
  }

  static async findByUsername(db, username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })
  }
}

module.exports = User
```
We create a **`User` class** as a **model** to represent users in our application. Using this model, we can **create a new user** or **search for an existing user** with dedicated methods:

- `User.create(db, username, password)` hashes the password and inserts the new user into the database, returning the newly created user’s ID.
    
- `User.findByUsername(db, username)` searches the database for a user with the given username and returns the record if found.
    

Both methods use **Promises** to wrap the database operations, allowing us to `await` them for clean asynchronous handling.

By organizing database operations in a **model**, we **separate data access from application logic**, making the code more maintainable, reusable, and easier to read.

### Update Authentication Routes  
We refactor auth.js to use the User class, simplifying route logic.

**routes/auth.js (updated):**
```javascript
const argon2 = require('argon2')
const User = require('../utils/user')
const collectMessages = require('../utils')

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (await User.findByUsername(fastify.db, username)) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    // Hash password and insert user
   
    await User.create(fastify.db, username, password)

    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    const user =  await User.findByUsername(fastify.db, username)

    if (!user || !(await argon2.verify(user.password_hash, password) )) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user["id"])
    request.session.set('user', user["username"])
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}
```

Register and log in again. The functionality remains the same, but the routes are now cleaner, relying on the User class for database operations. Data persists in SQLite, and the code is easier to maintain.

The User class encapsulates database logic, providing methods like create and findByUsername that hide SQL details. By passing the fastify instance to these methods, we access the database connection (fastify.db) without hardcoding it in the class. This separation of concerns makes our routes focus on user interaction (e.g., handling form submissions) while the User class handles data access. Promisified database operations ensure compatibility with Fastify’s async nature, and the modular structure aligns with Fastify’s plugin-based design, improving maintainability and scalability.

## Using Sequelize and Models

While the User class improved our code, we’re still writing raw SQL queries, which can become cumbersome as the application grows. If we need to switch databases (e.g., to PostgreSQL), we’d have to rewrite queries. Additionally, managing complex relationships (e.g., users to wiki pages) requires more boilerplate SQL.

This is where **Sequelize**, an Object-Relational Mapper (ORM) for Node.js, comes in. Sequelize allows us to define database tables as JavaScript classes (models) and interact with them using object-oriented methods, abstracting away raw SQL. Each table becomes a model, and each row an instance, making database operations more intuitive and portable across database engines.

### Updating Our Project  
We’ll start by removing ``utils/user`` and ``plugins/db.js`` since we don’t need them anymore.  
### Install Sequelize 
We install Sequelize and the SQLite driver.
```Bash
npm install sequelize sqlite3
```
### Define a User Model  
We create a User model to represent the user table, including methods for password hashing and verification, this Model extand from sequelize

**``models/user.js``:**
```javascript
const argon2 = require('argon2')
const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class User extends Model {
    async setPassword(password) {
      this.password_hash = await argon2.hash(password)
    }

    async checkPassword(password) {
      return argon2.verify(this.password_hash, password)
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
We define a User model using Sequelize, which represents the users table in our database. The model extends Model and includes two custom methods: setPassword to hash and store a password securely, and checkPassword to verify a password against the stored hash. The User.init method defines the table structure with fields for id, username, and password_hash, along with constraints such as unique usernames and non-nullable fields. We link the model to the Sequelize instance passed as sequelize, specify the table name, and disable timestamps.  


### Initialize Models  
We create a module to initialize all models and sync the database schema.

**``models/index.js``:**

```javascript
module.exports = (sequelize) => {
  const User = require('./user')(sequelize)

  // Sync models with database
  sequelize.sync({ force: true }) // Recreate tables (use cautiously in production)
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Failed to sync database:', err))

  return { User }
}
``` 
We create a module to initialize all Sequelize models and synchronize the database schema.  
This file acts as the **central hub** for all model definitions — instead of initializing each model separately in different parts of the code, we do it once here. This design keeps the project organized and makes it easy to manage model relationships (like associations) later on.

When the function is called with a Sequelize instance, it:

1. Imports the `User` model and initializes it using the provided Sequelize instance.
    
2. Calls `sequelize.sync({ force: true })` to synchronize the database schema with the model definitions. The `{ force: true }` option recreates the tables each time the app runs (useful for development, but should be avoided in production to prevent data loss).
    
3. Returns an object containing all initialized models (currently just `User`), so other parts of the app can easily import and use them.  
### Create a Sequelize Plugin

**``plugins/sequelize.js``:**
```javascript
const fp = require('fastify-plugin')
const { Sequelize } = require('sequelize')
const models = require('../models')(sequelize)

module.exports = fp(async (fastify, opts) => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.db',
    logging: false
  })

  
  fastify.decorate('sequelize', sequelize)
  fastify.decorate('models', models)

  fastify.addHook('onClose', async (fastify, done) => {
    await sequelize.close()
    done()
  })
})
```
We created a Fastify plugin to set up our database connection and load all models using Sequelize, an ORM for Node.js. Inside the plugin, we initialize a Sequelize instance configured to use SQLite (database.db) as storage and disable logging for cleaner output. We then import all models by passing the Sequelize instance (require('../models')(sequelize)) and attach both the Sequelize instance and the models to Fastify using fastify.decorate('sequelize', sequelize) and fastify.decorate('models', models). This makes the database and models easily accessible throughout the application via fastify.sequelize and fastify.models. Finally, we add an onClose hook to gracefully close the database connection when the server shuts down.

### Update Authentication Routes with Sequelize 
We refactor auth.js to use the User model, simplifying database interactions.

**``routes/auth.js`` (updated):**
```javascript
const argon2 = require('argon2')
const collectMessages = require('../utils')

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body
    const { User } = fastify.models
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    const password_hash = await argon2.hash(password)
    const user = await User.create({ username,password_hash })
    await user.save()

    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const { User } = fastify.models
    const user = await User.findOne({ where: { username } })

    if (!user || !(await user.checkPassword(password))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user["id"])
    request.session.set('user', user["username"])
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}
```

### Update app.js
We register the Sequelize plugin and ensure all components are connected.

**``app.js`` (updated):**
```javascript
const fastify = require('fastify')({ logger: false})
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/formbody'));
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/sequelize'))
fastify.register(require('./plugins/auth'))
fastify.register(require('./plugins/404'))

// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })
fastify.get('/', async (request, reply) => {
  return reply.view('home',{session:request.session})
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

Run node app.js. Register a user, log in, and verify that data persists in database.db. The profile page is accessible only when logged in, and invalid credentials trigger flash messages.

Sequelize abstracts raw SQL into model-based interactions, allowing us to work with User objects instead of queries. The User model encapsulates fields (id, username, password_hash) and methods (setPassword, checkPassword), making routes cleaner and more maintainable. The Sequelize plugin decorates Fastify with sequelize and models, providing easy access across the application. The sync({ force: true }) call recreates the database schema for development (use force: false in production to avoid data loss). This ORM approach ensures portability across databases and simplifies complex operations, aligning with Fastify’s focus on modularity and developer productivity.
## Autoload Plugins and Routes
As our application grows, we start adding more and more plugins and routes. This can quickly become messy and error-prone.  
Two major problems often appear:

1. **Too many manual registrations:** We end up with dozens of `fastify.register()` lines cluttering our `app.js` file.
    
2. **Forgotten imports:** When new plugins or routes are created, we might forget to register them, causing missing functionality or unexpected errors.
    

To solve these issues, we can use the **`@fastify/autoload`** plugin, which automatically loads and registers all plugins and routes from given directories.

 **Install the plugin**

In our project directory, we install the autoload plugin:  

`npm install @fastify/autoload`   

### Use autoload

We can now replace the long list of manual registrations with a few clean autoload calls.
```javascript
const AutoLoad = require('@fastify/autoload')
fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'plugins')
})

// Automatically load all routes from the routes folder
fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'routes')
})
```
 
**`app.js`**
```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')
const AutoLoad = require('@fastify/autoload')

// Automatically load all plugins from the plugins folder
fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'plugins')
})

fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'routes')
})
fastify.get('/', async (request, reply) => {
  return reply.view('home',{session:request.session})
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
### Using Controllers
As our Fastify.js app grows, we can notice that the **route files become cluttered** with many endpoints and all their logic written directly inside the same file. This makes it harder to debug, update, or extend functionality, especially when multiple routes share similar operations. To solve this, we introduce a controllers folder. Each controller file groups functions that handle specific endpoints for a given resource (e.g., users, wikis, or profiles). For example, `Profile.js` can contain `getProfile`and `updateProfile` functions, each responsible for one endpoint’s logic. Then, the route file simply maps HTTP requests to these controller functions. This separation of concerns keeps the project clean, modular, and easier to maintain when an issue arises, we wifll immediately know where to look: in the controller that handles that specific route.
