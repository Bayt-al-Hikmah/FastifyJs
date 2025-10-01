## Objectives
- Render HTML templates instead of simple strings or JSON.
- Serve static files (CSS, images) to enhance our application’s appearance.
- Use the Handlebars templating engine for dynamic content with variables, loops, and conditionals.
- Create reusable page layouts using Handlebars partials.
- Handle user input with HTML forms, both manually and with Fastify’s JSON Schema validation.
## Rendering Basic HTML Templates
In our previous session, we built APIs that returned JSON or plain text, ideal for machine-to-machine communication. Now, we’re creating web pages for users, which requires rendering HTML. Fastify supports this through templates HTML files combined with dynamic data, rendered server-side. This separation of presentation (HTML) from logic (JavaScript) keeps our code clean and maintainable, aligning with Fastify’s modular design.
### Setting Up the `views` Folder
We organize our templates in a `views` folder at the project root, keeping them separate from routes and other logic. This structure supports Fastify’s plugin-based architecture, where each component has a clear role.

**Project Structure:**

```
my_fastify_project/
├── public/          # For CSS, images, and JavaScript
├── views/           # HTML templates
│   └── index.hbs
├── plugins/         # Reusable functionality
├── routes/          # Route handlers
├── package.json
└── app.js           # Main application file
```

### Using Handlebars with Fastify

We’ll use the `@fastify/view` plugin to integrate Handlebars, a lightweight templating engine, with Fastify. This plugin allows us to render `.hbs` files as HTML responses. Let’s set it up and create a homepage.
#### What is Handlebars?
Handlebars is a popular templating engine for JavaScript.  
It lets you write HTML with embedded placeholders ({{ }}) that get replaced with real data when the page is rendered.  
For example, in a template:

```
<h1>Hello, {{name}}!</h1>
```


If you render it with ``{ name: "Alice" }``, the output will be:

```
<h1>Hello, Alice!</h1>
```


Handlebars also supports:

- Conditionals (``{{#if}} ... {{/if}}``)

- Loops (``{{#each}} ... {{/each}}``)

- Partials (reusable templates like headers/footers)

- Layout structures (shared design for multiple pages)

This makes it great for building dynamic HTML views while keeping code clean and maintainable.  

**Install Dependencies**  
We start by installing the necessary packages:

```bash
npm install fastify @fastify/view handlebars
```

**Configure Handlebars**  
We create a plugin to manage templating, keeping our main application file focused on bootstrapping.

**`plugins/templates.js`:**

```javascript
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/view'), {
    engine: { handlebars: require('handlebars') },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true
  })
})
```

This plugin configures Fastify to use Handlebars and look for templates in the `views` folder. The `includeViewExtension: true` option simplifies template references by omitting the `.hbs` extension.

**Create a Homepage Route**  
We define a route to render a simple template for the homepage.

**`routes/home.js`:**

```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/', async (request, reply) => {
    return reply.view('index')
  })
}
```

**`views/index.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Welcome</title>
</head>
<body>
    <h1>Welcome to Our Website!</h1>
    <p>This page is powered by Fastify and Handlebars.</p>
</body>
</html>
```

**Bootstrap the Application**  
We update the main application file to register the plugin and route.

**`app.js`:**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.register(require('./plugins/templates'))
fastify.register(require('./routes/home'), { prefix: '/' })

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

We run `node app.js` and visit `http://127.0.0.1:3000` in our browser. The page displays a heading and paragraph, rendered as HTML from the `index.hbs` template.

**Explanation**: By encapsulating the templating logic in a plugin, we keep `app.js` lean and focused. The `@fastify/view` plugin processes the template into HTML, delivering a clean user experience while maintaining Fastify’s modular structure.

## Working with Static Files

To enhance our web pages with styling and visuals, we need to serve static files like CSS and images. Fastify uses the `fastify-static` plugin to handle these files efficiently, ensuring fast delivery to the browser.

### Organizing Static Files

We store static files in a `public` folder, with subfolders for different asset types (e.g., `css` and `images`). This organization keeps our project clean and intuitive.

**Updated Structure:**

```
my_fastify_project/
├── public/
│   ├── css/
│   │   └── style.css
│   └── images/
│       └── logo.png
├── views/
│   └── index.hbs
├── plugins/
│   └── static.js
```

### Serving Static Files

We configure Fastify to serve static files and link them in our template.

**Step 1: Install `fastify-static`**

```bash
npm install fastify-static
```

**Step 2: Create a Static File Plugin**  
**`plugins/static.js`:**

```javascript
const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('fastify-static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/static/'
  })
})
```

This plugin serves files from the `public` folder under the `/static/` URL prefix, ensuring consistent access across deployment environments.

**Add Styling**  
**`public/css/style.css`:**

```css
body {
    font-family: sans-serif;
    background-color: #f0f2f5;
    color: #333;
    text-align: center;
    margin-top: 50px;
}

img {
    width: 150px;
    border-radius: 10px;
}
```

**Update the Template**  
We modify `index.hbs` to include the CSS and an image.

**`views/index.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Welcome</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <img src="/static/images/logo.png" alt="Our Logo">
    <h1>Welcome to Our Styled Website!</h1>
    <p>This page is styled with CSS and includes an image.</p>
</body>
</html>
```

**Register the Plugin**  
We update `app.js` to include the static plugin.

**`app.js` (updated):**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./routes/home'), { prefix: '/' })

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

We run the app and refresh `http://127.0.0.1:3000`. Assuming `logo.png` exists in `public/images/`, the page now displays styled text and an image.

**Explanation**: The `fastify-static` plugin ensures reliable file serving by using a configurable prefix.Fastify’s prefix-based approach is simpler and adapts to different deployment contexts, maintaining portability and aligning with Fastify’s focus on performance.

## Introduction to Handlebars Templating

Handlebars, integrated via `@fastify/view`, enables dynamic content in our templates. We use:

- **Expressions** (`{{variable}}`): To display variables or computed values.
- **Block Helpers** (`{{#if}}`, `{{#each}}`): For conditionals and loops.

To keep our templates clean, we handle complex logic in route handlers or service files, ensuring templates focus on presentation.

### Adding Dynamic Content

Let’s create a profile page that dynamically displays a user’s name, bio, and shopping list.

**Create a Profile Route**  
**`routes/profile.js`:**

```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/profile/:name', async (request, reply) => {
    const { name } = request.params
    const userDetails = {
      username: name,
      bio: 'Loves coding in JavaScript and exploring new technologies.',
      shoppingList: ['Apples', 'Oranges', 'Bananas']
    }
    return reply.view('profile', { user: userDetails })
  })
}
```

**Create the Profile Template**  
**`views/profile.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Profile</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <h1>Hello, {{user.username}}!</h1>
    <p><em>{{user.bio}}</em></p>

    {{#if user.shoppingList}}
        <p>You have {{user.shoppingList.length}} item(s) on your shopping list:</p>
        <ul>
            {{#each user.shoppingList}}
                <li>{{this}}</li>
            {{/each}}
        </ul>
    {{else}}
        <p>Your shopping list is empty!</p>
    {{/if}}
</body>
</html>
```

**Register the Route**  
**`app.js` (updated snippet):**

```javascript
fastify.register(require('./routes/profile'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/profile/alice`. The page shows Alice’s name, bio, and a list of shopping items, or a message if the list is empty.

**Explanation**: The route passes a user object to the template, where `{{user.username}}` displays the name, and `{{#if}}` and `{{#each}}` handle conditional logic and iteration, Handlebars relies on helpers or JavaScript properties (e.g., `length`). We keep logic in the route, ensuring the template remains simple and focused on presentation.

### Conditionals and Loops

Handlebars’ conditionals and loops allow us to display content dynamicall. Let’s build a dashboard that shows different messages based on a user’s status (e.g., admin, member, or guest).

**Create a Dashboard Route**  
**`routes/dashboard.js`:**

```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/dashboard/:status', async (request, reply) => {
    const { status } = request.params
    return reply.view('dashboard', { userStatus: status })
  })
}
```

**Create the Dashboard Template**  
**`views/dashboard.hbs`:**

```html
{{> _layout}}
<div class="welcome-message">
    {{#if (eq userStatus 'admin')}}
        <h1>Welcome, Administrator!</h1>
        <p>You have full access to the system controls.</p>
    {{else if (eq userStatus 'member')}}
        <h1>Welcome, Valued Member!</h1>
        <p>Thank you for being a part of our community.</p>
    {{else}}
        <h1>Welcome, Guest!</h1>
        <p>Please sign up or log in to access member features.</p>
    {{/if}}
</div>
```

**Add a Custom Helper**  
Handlebars requires a custom helper for equality checks.

**`plugins/templates.js` (updated):**

```javascript
const fp = require('fastify-plugin')
const path = require('path')
const handlebars = require('handlebars')

module.exports = fp(async (fastify, opts) => {
  handlebars.registerHelper('eq', (a, b) => a === b)
  fastify.register(require('@fastify/view'), {
    engine: { handlebars },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true
  })
})
```

We visit `http://127.0.0.1:3000/dashboard/admin`, `/dashboard/member`, or `/dashboard/guest`. Each URL displays a tailored message based on the status.

**Explanation**: The `eq` helper enables conditional logic. The route prepares the data, and the template handles presentation, keeping the logic minimal. Handlebars’ block helpers provide  control structures, ensuring dynamic content rendering.

## Template Partials

Most websites share common elements like headers and navigation bars. Copying these into every template is inefficient, so we use Handlebars partials to reuse HTML snippets.

### Creating Reusable Layouts

We create a base layout partial for the page structure and a navigation bar partial for consistent menus.

**Structure:**

```
views/
├── partials/
│   ├── _layout.hbs
│   ├── _navbar.hbs
├── index.hbs
├── dashboard.hbs
├── profile.hbs
```

**Define Partials**  
**`views/partials/_layout.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Awesome App</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <header>
        {{> _navbar}}
    </header>
    <main>
        {{{content}}}
    </main>
    <footer>
        <p>&copy; 2025 Our Company</p>
    </footer>
</body>
</html>
```

**`views/partials/_navbar.hbs`:**

```html
<nav>
    <a href="/">Home</a> 
    <a href="/profile/alice">Profile</a> 
    <a href="/contact">Contact</a>
</nav>
```

**Update a Template**  
We modify `index.hbs` to use the layout partial.

**`views/index.hbs`:**

```html
{{> _layout}}
<h1>Welcome to Our Website!</h1>
<p>This page uses a shared layout.</p>
```

We refresh `http://127.0.0.1:3000`. The page now includes a navigation bar and footer, consistent across all pages using the `_layout` partial.

**Explanation**: The `_layout.hbs` partial defines a reusable structure with a `{{{content}}}` placeholder. The `_navbar.hbs` partial ensures consistent navigation, reducing duplication and simplifying updates.

## Handling HTML Forms

Forms allow users to submit data, such as contact messages. Fastify supports form handling manually with `fastify-formbody` or with JSON Schema for validation. We’ll also add CSRF protection for security.

### Manual Form Handling

We create a contact form that users can submit, with a route handling both display and submission.

**Install `fastify-formbody`**

```bash
npm install fastify-formbody
```

**Create a Form Plugin**  
**`plugins/formbody.js`:**

```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('fastify-formbody'))
})
```
When an HTML form is submitted with the default encoding (application/x-www-form-urlencoded), the browser sends data like:
```
name=Alice&message=Hello
```

Without fastify-formbody, Fastify does not parse this format.  
This plugin automatically parses the URL-encoded body and makes it available as a JavaScript object on request.body.  
So after enabling it, you can safely do:
```
const { name, message } = request.body
```

and get ``{ name: 'Alice', message: 'Hello' }``.  
**Create a Contact Route**  
**`routes/contact.js`:**

```javascript
module.exports = async (fastify, opts) => {
  fastify.get('/contact', async (request, reply) => {
    return reply.view('contact')
  })

  fastify.post('/contact', async (request, reply) => {
    const { name, message } = request.body
    if (!name || !message) {
      return reply.view('contact', { error: 'Name and message are required' })
    }
    fastify.log.info(`Received message from ${name}: ${message}`)
    return reply.view('contact', { submittedName: name })
  })
}
```

**Create the Contact Template**  
**`views/contact.hbs`:**

```html
{{> _layout}}
<h1>Contact Us</h1>
<form action="/contact" method="POST">
    <label for="name">Name:</label><br>
    <input type="text" id="name" name="name" required><br><br>
    <label for="message">Message:</label><br>
    <textarea id="message" name="message" required></textarea><br><br>
    <button type="submit">Submit</button>
</form>

{{#if error}}
    <p style="color:red;">{{error}}</p>
{{/if}}
{{#if submittedName}}
    <h2>Thanks for your message, {{submittedName}}!</h2>
{{/if}}
```

**Register the Plugin and Route**  
**`app.js` (updated snippet):**

```javascript
fastify.register(require('./plugins/formbody'))
fastify.register(require('./routes/contact'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/contact`, fill out the form, and submit it. A valid submission shows a thank-you message; missing fields trigger an error message.

**Explanation**: The `GET` route renders the form, and the `POST` route processes the submission using `request.body`. The template displays feedback adapted to Fastify’s lightweight approach.

### Form Handling with Validation and CSRF

For robust form handling, we use Fastify’s JSON Schema for validation and `fastify-csrf-protection` for security, providing CSRF protection and declarative validation.

**Install Additional Plugins**

```bash
npm install @fastify/csrf-protection @fastify/cookie
```

**Create a CSRF Plugin**  
**`plugins/csrf.js`:**

```javascript
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/csrf-protection'))
})
```

**Create a Validated Contact Route**  
We define a JSON Schema to validate form inputs, ensuring fields meet specific criteria.

**`routes/contact.js` (updated):**

```javascript
module.exports = async (fastify, opts) => {
  const contactSchema = {
    body: {
      type: 'object',
      required: ['name', 'message', '_csrf'],
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 25 },
        message: { type: 'string', maxLength: 200 },
        _csrf: { type: 'string' }
      }
    }
  }

  fastify.get('/contact-wt', async (request, reply) => {
    const token = await reply.generateCsrf()
    return reply.view('contact-wt', { csrfToken: token })
  })

  fastify.post('/contact-wt', { schema: contactSchema }, async (request, reply) => {
    const { name, message } = request.body
    fastify.log.info(`Received from ${name}: ${message}`)
    const token = await reply.generateCsrf()
    return reply.view('contact-wt', { submittedName: name, csrfToken: token })
  })
}
```

**Create the Validated Contact Template**  
**`views/contact-wt.hbs`:**

```html
{{> _layout}}
<h1>Contact Us</h1>
<form method="POST" action="/contact-wt">
    <input type="hidden" name="_csrf" value="{{csrfToken}}">
    <label for="name">Name:</label><br>
    <input type="text" id="name" name="name" required><br>
    {{#each errors}}
        {{#if (eq this.param 'body.name')}}
            <span style="color:red;">{{this.message}}</span><br>
        {{/if}}
    {{/each}}
    <br>
    <label for="message">Message:</label><br>
    <textarea id="message" name="message" required></textarea><br>
    {{#each errors}}
        {{#if (eq this.param 'body.message')}}
            <span style="color:red;">{{this.message}}</span><br>
        {{/if}}
    {{/each}}
    <br>
    <button type="submit">Submit</button>
</form>

{{#if submittedName}}
    <h2>Thanks for your message, {{submittedName}}!</h2>
{{/if}}
```

**Handle Validation Errors**  
We add a global error handler to display validation errors in the template.

**`app.js` (updated snippet):**

```javascript
fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    const token = reply.generateCsrfSync()
    return reply.view('contact-wt', { errors: error.validation, csrfToken: token })
  }
  reply.send(error)
})

fastify.register(require('./plugins/csrf'))
fastify.register(require('./routes/contact'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/contact-wt` and submit the form with invalid data (e.g., a name shorter than 3 characters). Error messages appear next to the fields. A valid submission shows a thank-you message.

**Explanation**: Fastify’s JSON Schema, provide declarative validation for fields like name and message. The `fastify-csrf-protection`, ensure security. Error handling is integrated into Fastify’s ecosystem, passing errors to the template for user-friendly feedback.

## Putting It All Together

Our project now follows Fastify’s modular structure, with plugins for templating, static files, form handling, and CSRF protection, and routes organized by feature.

**Final Structure:**

```
my_fastify_project/
├── plugins/
│   ├── templates.js
│   ├── static.js
│   ├── formbody.js
│   ├── csrf.js
├── routes/
│   ├── home.js
│   ├── profile.js
│   ├── dashboard.js
│   ├── contact.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── images/
│       └── logo.png
├── views/
│   ├── partials/
│   │   ├── _layout.hbs
│   │   ├── _navbar.hbs
│   ├── index.hbs
│   ├── profile.hbs
│   ├── dashboard.hbs
│   ├── contact.hbs
│   ├── contact-wt.hbs
├── package.json
└── app.js
```

**Complete `app.js`:**

```javascript
const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    const token = reply.generateCsrfSync()
    return reply.view('contact-wt', { errors: error.validation, csrfToken: token })
  }
  reply.send(error)
})

fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/formbody'))
fastify.register(require('./plugins/csrf'))
fastify.register(require('./routes/home'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })
fastify.register(require('./routes/dashboard'), { prefix: '/' })
fastify.register(require('./routes/contact'), { prefix: '/' })

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

