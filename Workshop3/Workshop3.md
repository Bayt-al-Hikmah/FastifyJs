## Objectives

- Implement user **registration, login, and logout** functionality using Fastify’s session management.
- Build a simple wiki app where users can create and view pages.
- Handle **rich text** input safely using Markdown, processed server-side.
- Allow users to **upload files** (like avatars) and manage them securely.
- Explore the evolution of CSS styling, from component classes to **utility-first frameworks** like Tailwind CSS.

## User Authentication

Authentication is the cornerstone of any multi-user application, enabling users to register, log in, and log out securely. In this workshop, we’ll simulate a user database with a JavaScript object and use Fastify’s session management to track logged-in users`.

### Simulating Our Database

For simplicity, we'll start by simulating a database using an in-memory JavaScript object to hold user and page data. (In a production application, this would be replaced by a robust solution like MongoDB or PostgreSQL.) We'll initialize this object within a Fastify plugin and make it accessible across all routes and plugins by decorating the Fastify instance with fastify.decorate().

**`./plugins/db-plugin.js`:**

```javascript
const fp = require('fastify-plugin');

const inMemoryDatabase = {
  users: {},
  pages: {}
};

async function dbConnector (fastify, options) {
  fastify.decorate('dataStore', inMemoryDatabase);
}

module.exports = fp(dbConnector, {
    name: 'data-connector' 
});
```
After creating the plugin, we need to register it inside app.js by adding: 
```
fastify.register(require('./plugins/db-plugin')); 
```
Once registered, we can access the in-memory database object anywhere in our application through fastify.dataStore. This allows us to read from and modify the data just like we would with a real database
### Fastify Session Management
A session is a way to store information about a user across multiple requests. Since HTTP is a stateless protocol (it doesn’t remember anything between requests), sessions allow us to persist data like login status, user preferences, or temporary messages while the user navigates through the app.  

To track user sessions, we’ll use the `@fastify/cookie` and `@fastify/session` plugins, which provide secure session handling . Fastify signs session cookies with a secret key to prevent tampering, ensuring security.

We’ll also use `@fastify/flash` to display temporary messages (e.g., “Login successful!”).

### Setting Up Authentication

Let’s set up the environment, configure session management, and create routes for registration, login, and logout. We’ll organize our code using Fastify’s plugin system for modularity.

**Install Dependencies**  
We install Fastify and the necessary plugins:

```bash
npm install fastify @fastify/cookie @fastify/session @fastify/flash @fastify/static @fastify/view handlebars @fastify/formbody argon2
```

**Configure Session and Flash Plugins**  
We create a plugin to manage sessions and flash messages, ensuring secure cookie handling.

**`plugins/session.js`:**

```javascript
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
**Configure Argon2 Plugin**  
Saving passwords in plain text is not safe, if the database is ever leaked, all user passwords would be immediately exposed.  
To fix this, we use Argon2 to hash the passwords and store them in a much safer format.  
We apply this by creating a plugin for Argon2, wrapping it as a decorator with fastify.decorate(), and then registering the plugin inside app.js.

**`plugins/argon2.js:`**
```
const fp = require('fastify-plugin')
const argon2 = require('argon2')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('argon2', argon2)
})
```
**Handle Form Data**  
We use @fastify/formbody to parse URL-encoded form submissions, such as login and registration forms.

**`plugins/formbody.js:`**
```
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/formbody'))
})
````

This ensures that data submitted via HTML forms (e.g., username and password) is automatically parsed and made available in request.body.   

**Configure Templating**  
We use `@fastify/view` with Handlebars to render HTML templates.  

**`plugins/templates.js`:**

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
 
**Serve Static Files**  
We serve CSS and avatar images using `@fastify/static`.

**`plugins/static.js`:**

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

**Create Authentication Routes**  
We define routes for registration, login, and logout in a plugin, using Handlebars templates for the front-end.

**`routes/auth.js`:**

```javascript

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    return reply.view('register', { messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (fastify.dataStore.users[username]) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }
    const hashedPassword = await fastify.argon2.hash(password)
    fastify.dataStore.users[username] = { password: hashedPassword, avatar: null }
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    return reply.view('login', { messages: request.flash('danger') || request.flash('success') || request.flash('info') })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = fastify.dataStore.users[username]

    if (user && await fastify.argon2.verify(user.password, password)) {
      request.session.set('username', username)
      request.flash('success', 'Login successful!')
      return reply.redirect('/home')
    } else {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    request.flash('info', 'You have been logged out.')
    return reply.redirect('/login')
  })
}
```
**GET /register**

When a user visits /register, the server renders the registration page using a Handlebars template.
It also passes any flash messages (e.g., error or success notifications) to the template so the user can see feedback (like "Username already exists" or "Registration successful"). 

**POST /register**

When the form is submitted, the server receives the username and password.  

- It first checks if the username already exists in the in-memory dataStore. If it does, a danger flash message is set and the user is redirected back to the registration page.

- If the username is new, the password is securely hashed using Argon2 before storing it. This ensures we never save plain-text passwords, making the system safer if data leaks.

- The new user is saved into fastify.dataStore.users, with their hashed password and a placeholder for their avatar.

- A success flash message is shown, and the user is redirected to the login page to log in with their new credentials.  

**GET /login**

When a user visits /login, the server renders the login page template.  
Like in registration, flash messages are passed along these could include info like "You’ve been logged out" or errors from failed login attempts.  

**POST /login**

When the login form is submitted:  
- The server looks up the user in dataStore by the provided username.

- If the user exists, the submitted password is verified against the hashed password stored in the database using Argon2’s verify function.

- If verification succeeds, the username is stored in the session, and a success message is displayed before redirecting the user to /home.

- If verification fails, a danger message is displayed, and the user is redirected back to the login page.

**GET /logout**  
When the user visits /logout:

- The current session is destroyed, removing the user’s login state.

- A flash message notifies them that they have been logged out.

- The user is redirected to the /login page.
**Create Templates**  
We create Handlebars templates for registration and login.

**`views/partials/_layout.hbs`:**

```html
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
        {{#if session.username}}
          <span class="greet">Hello, {{session.username}}</span>
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

**`views/register.hbs`:**

```html
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

**`views/login.hbs`:**

```html
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
We reuse the provided CSS, ensuring a consistent look.

**`public/css/style.css`:**

```css
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

**Bootstrap the Application**  
We tie everything together in `app.js`.

**`app.js`:**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/argon2'))
fastify.register(require('./plugins/db-plugin')); 
fastify.register(require('./plugins/formbody'))

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

**`views/home.hbs`:**

```html
{{#> _layout}}
<h1 class="page-title">Welcome to MyApp</h1>
<p>Create and view wiki pages!</p>
{{/ _layout}}
```

We run `node app.js`, visit `http://127.0.0.1:3000/register`, create a user, log in at `/login`, and log out at `/logout`. Flash messages provide feedback, and the session persists the username across requests.


## Rich Text and Pages

Our wiki application needs to support rich text for formatted content, such as headings, bold text, and lists. To handle this securely, we’ll use Markdown, processed server-side into HTML.

### Using Markdown

We use the `markdown-it` library to convert Markdown to HTML, ensuring safe rendering without allowing raw HTML input, which could introduce security risks like XSS (cross-site scripting).

**Install `markdown-it`**

```bash
npm install markdown-it
```

**Create Wiki Routes**  
We create a plugin for wiki page routes, handling page viewing and creation.  
**Markdown Plugin**  
We use markdown-it as a plugin to render Markdown content into HTML inside our Fastify app. This plugin decorates Fastify with a reusable fastify.markdown  
**``plugins/markdown-highlight.js``**
```
const fp = require('fastify-plugin')
const MarkdownIt = require('markdown-it')

module.exports = fp(async (fastify, opts) => {
  const md = new MarkdownIt({
    html: false,
    breaks: true
  })

  // Expose markdown-it instance on fastify
  fastify.decorate('markdown', md)
})

```
**Wiki route**  
Now we defines the routes for viewing and creating wiki pages.  
**`routes/wiki.js`:**

```javascript

module.exports = async (fastify, opts) => {
  fastify.get('/wiki/:page_name', async (request, reply) => {
    const { page_name } = request.params
    const page = fastify.dataStore.pages[page_name]
    if (!page) {
      return reply.view('404', { messages: request.flash('danger') })
    }
    page.html_content = fastify.markdown.render(page.content)
    return reply.view('wiki_page', { page, page_name })
  })

  fastify.get('/create', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    return reply.view('create_page', { messages: request.flash('danger') })
  })

  fastify.post('/create', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    const { title, content } = request.body
    fastify.dataStore.pages[title] = { content, author: request.session.get('username') }
    return reply.redirect(`/wiki/${title}`)
  })
}
```
**GET /wiki/:page_name**

When a user visits /wiki/:page_name, the server looks up the requested page name in `fastify.dataStore.pages`.

- If the page exists, its Markdown content is rendered into HTML using fastify.markdown.render().

- The rendered content is then passed to the wiki_page view template, along with the page name.

- If the page does not exist, the server returns a 404 template with any danger flash messages.

**GET /create**

When a user visits `/create`, the server checks if the user is logged in by verifying if their username exists in the session.

- If the user is not logged in, a danger flash message is set ("You must be logged in to create a page.") and the user is redirected to the login page.

- If the user is logged in, the server renders the create_page template, including any flash messages to display feedback.

**POST /create**

When the form on the create page is submitted, the server handles creating a new wiki entry.

- First, it checks if the user is logged in. If not, a danger message is set and the user is redirected to ``/login``.

- If the user is logged in, the submitted title and content are extracted from the request body.

- A new page is saved in fastify.dataStore.pages under the given title, with the page’s content and the current user’s username as the author.

- Finally, the user is redirected to the new wiki page they just created at ``/wiki/:title``.
**Create Wiki Templates**  
We create templates for viewing and creating wiki pages.
Template for the page that displays a wiki page. 

**`views/wiki_page.hbs`:**

```html
{{#> _layout}}
<h1>{{page_name}}</h1>
<p><em>By: {{page.author}}</em></p>
<hr>
<div>
  {{{page.html_content}}}
</div>
{{/ _layout}}
```
Template with a form to create and add a new wiki page.  
**`views/create_page.hbs`:**

```html
{{#> _layout}}
<h1 class="page-title">Create a Wiki Page</h1>
<form method="POST" class="form-card">
  <label for="title">Page Title</label>
  <input id="title" name="title" type="text" required>
  <label for="content">Content (Markdown supported)</label>
  <textarea id="content" name="content" rows="12" placeholder="# Heading
Write your text here...
- bullet list
**bold text**
*italic text*"></textarea>
  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Create Page</button>
  </div>
</form>
<div class="card" style="margin-top:16px;">
  <h3>Markdown Quick Reference</h3>
  <ul>
    <li><code># Heading</code> → Heading</li>
    <li><code>**bold**</code> → <strong>bold</strong></li>
    <li><code>*italic*</code> → <em>italic</em></li>
    <li><code>- Item</code> → bullet list</li>
    <li><code>[Link](https://example.com)</code> → link</li>
  </ul>
</div>
{{/ _layout}}
```

**Create 404 Template**  
Template for the page that is displayed when a user searches for a non-existing wiki page.  
**`views/404.hbs`:**  
```html
{{#> _layout}}
<h1 class="page-title">Page Not Found</h1>
<p>The requested page does not exist.</p>
{{/ _layout}}
```

**Register the Wiki Plugin**  
We update `app.js` to include the wiki routes.

**`app.js` (updated snippet):**

```javascript
// in plugin sections
fastify.register(require('./plugins/markdown')) 
// in routes section
fastify.register(require('./routes/wiki'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/create` (after logging in), create a page with Markdown content, and view it at `/wiki/PageName`. If the page doesn’t exist, we see a 404 page.

### Using Quill.js with Fastify

To provide an intuitive way for users to create rich text content for our wiki pages, we’ll integrate Quill.js, a lightweight and customizable WYSIWYG editor. Quill.js allows users to format text with headings, bold, italic, lists, and more directly in the browser, offering a modern and user-friendly editing experience. We’ll implement Quill.js as a Fastify plugin, encapsulating its configuration and assets for modularity and seamless integration with our application. The editor will generate HTML content, which we’ll store and render securely, ensuring a smooth experience for users without requiring them to learn any syntax.

**Install Quill.js**  

```bash
npm install quill
```

**Create a Quill.js Plugin**  
We create a Fastify plugin to serve Quill.js’s static assets (CSS and JavaScript) and provide a reusable configuration for the editor’s toolbar and features.  

**`plugins/quill.js`:**

```javascript
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  // Serve Quill.js static assets
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../../node_modules/quill/dist'),
    prefix: '/quill/',
    decorateReply: false // Avoid conflicts with other static routes
  })

  // Decorate Fastify with Quill configuration
  fastify.decorate('quillConfig', {
    modules: {
      toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        ['link', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['clean']
      ]
    },
    theme: 'snow'
  })
})
```

This plugin serves Quill.js’s assets (e.g., `quill.snow.css` and `quill.js`) under the `/quill/` prefix and decorates Fastify with a `quillConfig` object. The configuration defines a toolbar with essential formatting options like headings, bold, italic, links, lists, and indent controls, using the ‘snow’ theme for a clean, modern look.

**Update Wiki Routes with Validation**  
We update our wiki routes to include JSON Schema validation for the page creation form, ensuring that the title and content meet our requirements. The `create` route passes the Quill.js configuration to the template for editor initialization.

**`routes/wiki.js` (updated):**

```javascript
module.exports = async (fastify, opts) => {

  const createSchema = {
    body: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 50 },
        content: { type: 'string', minLength: 1 }
      }
    }
  }

  fastify.get('/wiki/:page_name', async (request, reply) => {
    const { page_name } = request.params
    const page = fastify.dataStore.pages[page_name]
    if (!page) {
      return reply.view('404', { messages: request.flash('danger') })
    }
    return reply.view('wiki_page', { page, page_name })
  })

  fastify.get('/create', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    return reply.view('create_page', { 
      messages: request.flash('danger'), 
      quillConfig: fastify.quillConfig 
    })
  })

  fastify.post('/create', { schema: createSchema }, async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    const { title, content } = request.body
    fastify.dataStore.pages[title] = { content, author: request.session.get('username') }
    return reply.redirect(`/wiki/${title}`)
  })
}
```

The `create` route checks for a logged-in user and passes the `quillConfig` to the template, while the JSON Schema ensures valid form submissions.

**Update Create Page Template with Quill.js**  
We modify the `create_page.hbs` template to load Quill.js from our plugin’s static route and initialize it with the provided configuration. We also add a hidden input to capture the editor’s HTML content, as Quill.js stores content in a div, not a textarea.

**`views/create_page.hbs` (updated):**

```html
{{#> _layout}}
<h1 class="page-title">Create a Wiki Page</h1>
<form method="POST" class="form-card" id="create-page-form">
  <label for="title">Page Title</label>
  <input id="title" name="title" type="text" required>
  <label for="content">Content</label>
  <div id="editor" style="min-height: 200px;"></div>
  <input type="hidden" name="content" id="content">
  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Create Page</button>
  </div>
</form>

<!-- Load Quill.js styles and script -->
<link href="/quill/quill.snow.css" rel="stylesheet">
<script src="/quill/quill.js"></script>
<script>
  const quill = new Quill('#editor', {{json quillConfig}});
  const form = document.querySelector('#create-page-form');
  form.onsubmit = function() {
    const content = document.querySelector('#content');
    content.value = quill.root.innerHTML; // Capture editor content
  };
</script>
{/ _layout}}
```

The template includes Quill.js’s CSS and JavaScript from the `/quill/` prefix. We initialize Quill on a `<div id="editor">` and use JavaScript to copy the editor’s HTML content to a hidden input (`#content`) on form submission, ensuring the content is sent to the server. The `{{json quillConfig}}` helper serializes the configuration to JSON for initialization.

**Update CSS for Quill.js Editor**  
We add minimal CSS to ensure the Quill editor integrates smoothly with our app’s styling.

**`public/css/style.css` (updated snippet):**

```css
#editor {
  background: #fff;
  border: 1px solid rgba(16,24,40,0.08);
  border-radius: 8px;
  font-size: 1rem;
}
#editor .ql-container {
  min-height: 200px;
}
```

This ensures the editor matches our app’s aesthetic, with a consistent border and font size.

**Register the Quill.js Plugin**  
We ensure the Quill.js plugin is registered in our main application file to make its assets and configuration available.

**`app.js` (updated snippet):**

```javascript
fastify.register(require('./plugins/quill'))
```

We visit `/create` after logging in, and Quill.js appears as a rich text editor in the form. We format content with headings, bold text, lists, or links, then submit the form. The generated HTML is stored in our in-memory database and displayed at `/wiki/PageName`. If we submit an invalid form (e.g., empty title), a flash message appears, and we’re redirected back to the form.


Quill.js, served through our Fastify plugin, provides a lightweight and customizable WYSIWYG editor that generates HTML content directly, making it intuitive for users to create formatted wiki pages. The plugin encapsulates Quill’s assets and configuration, ensuring modularity and reusability across routes. JSON Schema validation on the server side ensures that submitted content meets our requirements, while the error handler provides clear feedback via flash messages. The hidden input captures the editor’s HTML, seamlessly integrating with our form submission process. This setup leverages Fastify’s plugin system for a clean, scalable integration of the rich text editor, optimized for performance and ease of use.
## File Uploads

Allowing users to upload avatars enhances personalization but requires secure handling. We’ll configure Fastify to accept image uploads, validate file types, and store them safely.

### Setting Up File Uploads

We configure a directory for avatars and define allowed file extensions.

**Install `@aegisx/fastify-multipart`**

```bash
npm install @aegisx/fastify-multipart
```

**Create File Upload Plugin**  
We create a plugin to handle file uploads.

**`plugins/multipart.js`:**

```javascript
const fp = require('fastify-plugin')
const path = require('path')

// Use @aegisx/fastify-multipart instead of @fastify/multipart
module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@aegisx/fastify-multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    attachFieldsToBody: true // optional: auto attach text fields/files to request.body
  })
})
```

**Configure Upload Settings**  
We define constants in app.js and ensure the public/avatars directory exists. We then create a set of allowed file extensions `ALLOWED_EXTENSIONS` and a helper function to check whether a file is allowed. Finally, we add this function as a decorator so it can be accessed in other routes  (`fastify.allowedFile`).  
**`app.js` (updated snippet):**

```javascript
const UPLOAD_FOLDER = path.join(__dirname, 'public/avatars')
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif'])

if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true })
}

fastify.decorate('UPLOAD_FOLDER', UPLOAD_FOLDER)
fastify.decorate('allowedFile', filename => {
  if (!filename.includes('.')) return false
  const ext = filename.split('.').pop().toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
})
```

**Create Profile Route**  
We add a profile route to handle avatar uploads.

**`routes/profile.js`:**

```javascript
const path = require('path')

module.exports = async (fastify, opts) => {
  fastify.get('/profile', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to view your profile.')
      return reply.redirect('/login')
    }
    const user = fastify.dataStore.users[request.session.get('username')]
    return reply.view('profile', { user, messages: request.flash('danger') || request.flash('success') })
  })

  fastify.post('/profile', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to upload an avatar.')
      return reply.redirect('/login')
    }

    const file = request.body.avatar
    if (!file) {
      request.flash('danger', 'No file selected.')
      return reply.redirect('/profile')
    }

    if (!fastify.allowedFile(file.filename)) {
      request.flash('danger', 'Invalid file type. Allowed: png, jpg, jpeg, gif.')
      return reply.redirect('/profile')
    }

    const filename = `${Date.now()}_${file.filename}`
    const filepath = path.join(fastify.UPLOAD_FOLDER, filename)
    await fs.promises.rename(file.filepath, filepath)
    fastify.dataStore.users[request.session.get('username')].avatar = filename
    request.flash('success', 'Avatar updated!')
    return reply.redirect('/profile')
  })
}
```
**GET /profile**  
When a user visits /profile, the server checks if they are logged in by verifying the username in the session.  

- If the user is not logged in, a danger flash message is set ("You must be logged in to view your profile.") and the user is redirected to the login page.

- If the user is logged in, their profile data is loaded from fastify.dataStore.users and rendered with the profile template, including any flash messages.

**POST /profile**
When the user submits the avatar upload form, the server processes the uploaded file.

- First, it checks if the user is logged in. If not, a danger flash message is set and the user is redirected to ``/login``.

- If a file was not provided, a danger message is set and the user is redirected back to ``/profile``.

- If a file was provided but its extension is not allowed, a danger message is set and the user is redirected back to ``/profile``.

- If the file is valid, a new filename is generated with a timestamp prefix, and the file is moved from its temporary path to ``fastify.UPLOAD_FOLDER``.

- The user’s avatar in ``fastify.dataStore.users`` is updated with the new filename, and a success flash message is set.

- Finally, the user is redirected back to ``/profile``.


**Create Profile Template**  
We create a template to display the user profile and add a form that allows updating the profile avatar.  
**`views/profile.hbs`:**

```html
{{#> _layout}}
<div class="container">
  <h1 class="page-title">Welcome, {{user.username}}</h1>
  <div class="avatar-section">
    {{#if user.avatar}}
      <img src="/static/avatars/{{user.avatar}}" alt="User Avatar" class="avatar">
    {{else}}
      <p>No avatar uploaded yet.</p>
    {{/if}}
  </div>
  <form action="/profile" method="POST" enctype="multipart/form-data" class="form-card">
    <label for="avatar">Upload new avatar:</label>
    <input type="file" id="avatar" name="avatar" accept="image/*" required>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Upload</button>
    </div>
  </form>
</div>
{{/ _layout}}
```

**Update CSS for Avatars**  
**`public/css/style.css` (updated snippet):**

```css
.avatar-section { margin: 20px 0; }
.avatar { max-width: 150px; border-radius: 10px; }
```

**Register Profile Plugin and Ensure Directory**  
We update `app.js` and create the `public/avatars` directory.

**`app.js` (updated):**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')
const fs = require('fs')

const UPLOAD_FOLDER = path.join(__dirname, 'public/avatars')
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif'])

if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true })
}

fastify.decorate('UPLOAD_FOLDER', UPLOAD_FOLDER)
fastify.decorate('allowedFile', filename => {
  if (!filename.includes('.')) return false
  const ext = filename.split('.').pop().toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
})

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    request.flash('danger', error.validation.map(e => e.message).join(', '))
    return reply.redirect('/create')
  }
  reply.send(error)
})
// Plugin
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/multipart'))
fastify.register(require('./plugins/argon2'))
fastify.register(require('./plugins/db-plugin')); 
fastify.register(require('./plugins/formbody'))
fastify.register(require('./plugins/quill'))
// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })
fastify.register(require('./routes/wiki'), { prefix: '/' })
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

We visit `/profile`, upload an image (e.g., `.png`), and see it displayed. Invalid files trigger flash messages.

Fastify’s `@aegisx/fastify-multipart` provide robust file handling. We validate file extensions and use unique filenames to prevent conflicts. The plugin-based approach keeps file upload logic modular, aligning with Fastify’s architecture.

## A Journey Through CSS Styling

### Act I: The Specific Approach (Class-per-Element)

When we first begin styling our web pages, the natural instinct is to give each element its own class and style it directly. For example:

**Example CSS (not used in our app):**

```css
.login-page-button {
  background-color: blue;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
}
```

**HTML:**

```html
<button class="login-page-button">Login</button>
```
At first, this feels simple and organized every element gets its own “label,” and we know exactly where its style lives.

But very quickly, a problem appears:

- The Register button will need almost the same styles as the Login button.

- Input fields across different pages also share similar styling.

- Suddenly, we’re copying and pasting the same rules over and over.

This creates duplication and makes our CSS harder to maintain. Imagine having 5 different button classes scattered around your project if you want to change the padding, you’d need to edit all of them.

To fix this, we need to step back and notice patterns. Many elements aren’t unique snowflakes they belong to the same component family. Buttons share common traits, inputs share common traits. Instead of treating them as separate cases, we can extract those shared features and place them into special reusable classes.

This shift in thinking is what leads us toward the reusable component approach in Act II.  


### Act II: The Reusable Component (Shared Classes)

To fix the duplication problem from Act I, we need to change how we see our elements. Instead of thinking about each button or input as a one-off element, we treat them as components.  
A component is simply a reusable piece of UI like a button, an input box, or a card. Each component has a base style that defines its common features. For example, all buttons might share padding, border-radius, and font weight.  
On top of that, we can add variations (or modifiers) that adjust the base style like giving one button a blue background (.btn-primary) and another a gray background (.btn-secondary).  
This way, our CSS is not about styling individual elements, but about describing what type of component the element is. When we create new elements in our HTML, we don’t invent a new class each time we simply apply the right combination of existing component classes.  
Here’s what that looks like in practice:  

**Our `style.css` (already implemented):**

```css
.btn {
  padding: 9px 14px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--accent);
  color: white;
  border-color: rgba(43,124,255,0.1);
}
```

**HTML in Templates:**

```html
<button class="btn btn-primary">Register</button>
```
This is exactly the approach that **Bootstrap** and other frameworks popularized. They provide base classes (`.btn`, `.form-control`, `.card`) and variations (`.btn-primary`, `.btn-danger`, `.btn-outline`), letting developers build entire UIs just by combining classes.

### Act III: The Utility-First Revolution

The component approach from Act II is a big improvement over one-class-per-element, but it isn’t perfect. Components come with predefined styles for things like padding, margin, and borders.  
But what if you need a button with slightly less padding? Or an input field with a custom margin? Suddenly, we’re stuck. we either:

- Override the existing class (which feels messy), or

- Create a brand-new variation (like .btn-small or .btn-wide) amnd before long, we’re back to the duplication problem from Act I.

To solve this, a new idea emerged: instead of making classes for components, why not make classes for single styling functions?

For example:

- p-4 → padding

- m-10 → margin

- text-lg → font size

- bg-blue-500 → background color

With this approach, we’re not writing CSS to describe components—we’re building components directly in the HTML by stacking utility classes together.

This is the philosophy behind utility-first frameworks like Tailwind CSS.

**Example with Tailwind (hypothetical):**

```html
<button class="bg-blue-500 text-white p-4 rounded-md">Register</button>
```
Here, every class is doing one small job: background, text color, padding, border radius. Together, they form a complete button. It’s like snapping LEGO bricks together each brick is tiny and simple, but combined, they make something powerful.  

This approach has huge benefits:

- No need for CSS overrides we control spacing, sizing, and colors directly in the markup.
- Less CSS file bloat → most styles come from the framework.

- Faster prototyping we can build and tweak designs instantly without creating new CSS classes.

However, it does come with one small drawback: your HTML can look crowded with classes. A single element may end up with 6–10 classes, which feels like “class spam.” Some developers love this tradeoff, others find it messy.



