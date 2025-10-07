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

By encapsulating the templating logic in a plugin, we keep `app.js` lean and focused. The `@fastify/view` plugin processes the template into HTML, delivering a clean user experience while maintaining Fastify’s modular structure.

## Working with Static Files

To enhance our web pages with styling and visuals, we need to serve static files like CSS and images. Fastify uses the `@fastify/static` plugin to handle these files efficiently, ensuring fast delivery to the browser.

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

**Step 1: Install `@fastify/static`**

```bash
npm install @fastify/static
```

**Step 2: Create a Static File Plugin**  
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

The `@fastify/static` plugin ensures reliable file serving by using a configurable prefix.Fastify’s prefix-based approach is simpler and adapts to different deployment contexts, maintaining portability and aligning with Fastify’s focus on performance.

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

The route passes a user object to the template, where `{{user.username}}` displays the name, and `{{#if}}` and `{{#each}}` handle conditional logic and iteration, Handlebars relies on helpers or JavaScript properties (e.g., `length`). We keep logic in the route, ensuring the template remains simple and focused on presentation.

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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Profile</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
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
</body>
</html>
```

**Add a Custom Helper**  
We can create custom helpers in Handlebars to extend template functionality. For example, we can create a helper to check equality between two values. 
First, we include Handlebars in our project by requiring it, then we register the helper using handlebars.registerHelper(name, function). 
Inside the helper function, we can define the logic, such as comparing two values and returning different blocks for true or false. Once registered, this helper can be used in any template by referencing its name, allowing us to simplify templates and reduce duplication. 
For instance, an ifEqual helper can check if two values are equal and render different content depending on the result, keeping templates cleaner and more maintainable.

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
**Register the Route**  
**`app.js` (updated snippet):**

```javascript
fastify.register(require('./routes/dashboard'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/dashboard/admin`, `/dashboard/member`, or `/dashboard/guest`. Each URL displays a tailored message based on the status.

The `eq` helper enables conditional logic. The route prepares the data, and the template handles presentation, keeping the logic minimal. Handlebars’ block helpers provide  control structures, ensuring dynamic content rendering.

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
|   ├── _footer.hbs
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
        {{> @partial-block}}
    </main>
    {{> _footer}}
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
**`views/partials/_footer.hbs`:**

```html
<footer>
    Created by Bayt Al Hikmah &copy; 2025
</footer>
```

To make Handlebars partials work in a Fastify application, you need to properly configure ``templates.js``. This is done by passing an options object when setting up the view engine, including a partials property that defines the name of each partial and its path.

**``plugins/templates.js:``**
```
const fp = require('fastify-plugin')
const path = require('path')
const handlebars = require('handlebars')

module.exports = fp(async (fastify, opts) => {
  handlebars.registerHelper('eq', (a, b) => a === b),
  fastify.register(require('@fastify/view'), {
    
    engine: { handlebars: require('handlebars') },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true,
     options: {
    partials: {
      _layout: 'partials/_layout.hbs',
      _navbar: 'partials/_navbar.hbs',
      _footer: 'partials/_footer.hbs',
    }
  }
  })
})
```
**Update a Template**  
We modify `index.hbs` to use the layout partial.

**`views/index.hbs`:**

```html
{{#> _layout}}
<h1>Welcome to Our Website!</h1>
<p>This page uses a shared layout.</p>
{{/ _layout}}
```

We refresh `http://127.0.0.1:3000`. The page now includes a navigation bar and footer, consistent across all pages using the `_layout` partial.

The ``{{#> _layout}}...{{/ _layout}}`` syntax defines a block of content to be inserted into the layout’s ``{{> @partial-block}}`` placeholder.
## Handling HTML Forms

Forms allow users to submit data, such as contact messages. Fastify supports form handling manually with `@fastify/formbody` or with JSON Schema for validation. We’ll also add CSRF protection for security.

### Manual Form Handling

We create a contact form that users can submit, with a route handling both display and submission.

**Install `@fastify/formbody`**

```bash
npm install @fastify/formbody
```

**Create a Form Plugin**  
We add the following line to our `app.js` to use the form body plugin
```javascript
  fastify.register(require('@fastify/formbody'))
})
```
When an HTML form is submitted with the default encoding (application/x-www-form-urlencoded), the browser sends data like:
```
name=Alice&message=Hello
```

Without @fastify/formbody, Fastify does not parse this format.  
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
{{#> _layout}}
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
{{/ _layout}}
```

**Register the Plugin and Route**  
**`app.js` (updated snippet):**

```javascript
fastify.register(require('@fastify/formbody'))
fastify.register(require('./routes/contact'), { prefix: '/' })
```

We visit `http://127.0.0.1:3000/contact`, fill out the form, and submit it. A valid submission shows a thank-you message; missing fields trigger an error message.

The `GET` route renders the form, and the `POST` route processes the submission using `request.body`. The template displays feedback adapted to Fastify’s lightweight approach.

### Form Handling with Validation and CSRF

For robust form handling, we use Fastify’s JSON Schema for validation and `fastify-csrf-protection` for security, providing CSRF protection and declarative validation.
####  CSRF protection
CSRF (Cross-Site Request Forgery) is a type of web attack where a malicious site tricks a user’s browser into performing unwanted actions on another site where the user is authenticated.

For example, if a user is logged into a banking site, a CSRF attack could make their browser unknowingly submit a request to transfer money without their consent. The attacker exploits the trust the site has in the user’s browser session.

To defend against CSRF attacks, we use the ``@fastify/csrf-protection`` plugin. It generates a unique CSRF token for each session or form request. This token must be included in all POST, PUT, or DELETE requests. The server checks the token and rejects any request without a valid one, preventing malicious cross-site submissions.
#### JSON Schema

JSON Schema is a powerful standard for defining the structure and data types of JSON data. In the context of Fastify, it is used to validate incoming request data, such as form submissions, ensuring that the data meets specific criteria before processing. This declarative approach allows developers to define rules for data validation in a structured format, making it easier to enforce constraints and handle errors systematically.

#### How JSON Schema Works

- **Schema Definition**: A JSON Schema is a JSON object that specifies the expected structure, types, and constraints of the data. For example, it can define required fields, data types (e.g., string, number), and constraints like minimum or maximum length.
- **Validation Process**: When a request is made, Fastify validates the incoming data (e.g., `request.body`) against the defined schema. If the data conforms, the request proceeds; otherwise, a validation error is thrown.
- **Error Handling**: Validation errors are captured and can be passed to the client, allowing for user-friendly feedback, such as displaying error messages next to form fields.
- **Benefits**: JSON Schema ensures data integrity, reduces manual validation code, and integrates seamlessly with Fastify’s ecosystem, enabling reusable and maintainable validation logic.

In this example, the `contactSchema` defines rules for the `name`, `message`, and `_csrf` fields, ensuring they meet specific criteria (e.g., `name` must be a string between 3 and 25 characters).

**Install Additional Plugins**

```bash
npm install @fastify/csrf-protection @fastify/cookie
```

 **Create a CSRF Plugin**

`plugins/csrf.js`:

```javascript
const fp = require('fastify-plugin')
module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/csrf-protection'))
})
```

**Create a Validated Contact Route**

We define a JSON Schema to validate form inputs, ensuring fields meet specific criteria.

`routes/contact_csrf.js` (updated):

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

  fastify.get('/contact_csrf', async (request, reply) => {
    const token = await reply.generateCsrf()
    return reply.view('contact_csrf', { csrfToken: token })
  })

  fastify.post('/contact_csrf', { schema: contactSchema }, async (request, reply) => {
    const { name, message } = request.body
    fastify.log.info(`Received from ${name}: ${message}`)
    const token = await reply.generateCsrf()
    return reply.view('contact_csrf', { submittedName: name, csrfToken: token })
  })
}
```
**GET /contact_csrf**

When a user visits `/contact_csrf`, the server:

- **Generates a CSRF token** using `reply.generateCsrf()`.
    
- **Renders** the `contact_csrf` view (a template page) and **injects the CSRF token** into it.
    

This token is embedded in the contact form to protect against **Cross-Site Request Forgery (CSRF)** attacks.  
Each time the page is loaded, a **new CSRF token** is created and sent to the client.

This ensures that any future form submission will only be accepted if it includes the correct token issued by the server.


**POST /contact_csrf**

When the contact form is submitted, the server:

- Receives the form data from the request body: `name`, `message`, and `_csrf`.
    
- The request is **validated** against the `contactSchema`:
    
    - `name` must be a string (3–25 characters).
        
    - `message` must be a string (up to 200 characters).
        
    - `_csrf` must be present and valid.
        

If validation passes and the CSRF token is valid:

- The server **logs the submitted message** (e.g., `Received from Alice: Hello there!`) using `fastify.log.info()`.
    
- It then **generates a new CSRF token** for the next form submission.
    
- Finally, it **renders the same contact page again**, showing the submitted name and the new CSRF token in the view.
    

If validation or CSRF verification fails, Fastify automatically **rejects the request** with an error response.


The contactSchema ensures that any incoming request body follows a specific structure before it’s processed by the server.

- The body must be an object.

- It must include name, message, and _csrf fields.

- name: string, 3–25 characters long.

- message: string, maximum 200 characters.

- _csrf: string, used for security (CSRF protection).

If any field is missing or invalid, the request will be rejected automatically by the validator.  

**Create the Validated Contact Template**  
In this templates we add hidden input to store the csrf token `<input type="hidden" name="_csrf" value="{{csrfToken}}">`
`views/contact_csrf.hbs`:

```html
{{#> _layout}}
<h1>Contact Us</h1>
<form method="POST" action="/contact_csrf">
    <input type="hidden" name="_csrf" value="{{csrfToken}}">
    <label for="name">Name:</label><br>
    <input type="text" id="name" name="name" required><br>
    {{#each errors}}
        {{#if (eq this.instancePath '/name')}}
            <span style="color:red;">{{this.message}}</span><br>
        {{/if}}
    {{/each}}
    <br>
    <label for="message">Message:</label><br>
    <textarea id="message" name="message" required></textarea><br>
    {{#each errors}}
        {{#if (eq this.instancePath '/message')}}
            <span style="color:red;">{{this.message}}</span><br>
        {{/if}}
    {{/each}}
    <br>
    <button type="submit">Submit</button>
</form>

{{#if submittedName}}
    <h2>Thanks for your message, {{submittedName}}!</h2>
{{/if}}
{{/ _layout}}
```

**Handle Validation Errors**

We add a global error handler to display validation errors in the template.

`app.js` (updated snippet):

```javascript
fastify.setErrorHandler(async (error, request, reply) => {
  if (error.validation) {
    const token = await reply.generateCsrf();
    return reply.view('contact_csrf', { errors: error.validation, csrfToken: token })
  }
  reply.send(error)
})
fastify.register(require('./plugins/csrf'))
fastify.register(require('./routes/contact_csrf'), { prefix: '/' })
```


Visit `http://127.0.0.1:3000/contact_csrf` and submit the form with invalid data (e.g., a name shorter than 3 characters). Error messages will appear next to the respective fields. A valid submission will display a thank-you message.

Fastify’s JSON Schema provides declarative validation for fields like `name` and `message`, ensuring data integrity before processing. The `fastify-csrf-protection` plugin enhances security by generating and validating CSRF tokens to prevent cross-site request forgery attacks. Error handling is integrated into Fastify’s ecosystem, passing validation errors to the template for user-friendly feedback.

## Task
In this project, you will build a Quote Sharing Web Application using Fastify and Handlebars.  
The application will allow users to:
- Submit quotes anonymously by providing the author’s name and the quote text.
- Browse all submitted quotes in a styled interface.
- Search for quotes by a specific author.
- Use reusable layouts, partials, and static assets for a consistent design.
### Functional Requirements

#### Homepage (`/`)
- Displays a welcome message.
- Shows a list of recent quotes dynamically from the server.
- Uses a Handlebars loop (`{{#each}}`) to render multiple quotes.
####  Quote Submission (`/share`)
- Provides a form with two fields:
    - Author name (text input).
    - Quote text (textarea).
- Validates input:
    - Author name must be at least 3 characters.
    - Quote must not exceed 300 characters.
- Displays error messages for invalid input.
- On valid submission, the quote is stored and a confirmation message is shown.    
- Includes CSRF protection.

####  Search Quotes (`/search`)
- Provides a form to enter an author’s name.
- Displays all quotes from that author if found.
- If no quotes are found, shows a message: “No quotes found for author.”
####  Partials and Layouts
- Create `_layout.hbs` for consistent page structure (header, navigation bar, footer).
- Create `_navbar.hbs` with links to Home, Share, Search, and Dashboard.
- Ensure all pages extend the base layout.
####  Static Assets
- Create `style.css` for consistent styling across all pages.
- Add an image (e.g., `logo.png`) in the header.
- Serve CSS and image files through Fastify’s static file plugin.

