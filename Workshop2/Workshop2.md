# Workshop 2: Server-Side Rendering and Form Handling with Fastify and Handlebars

## Objectives

In this workshop, we will learn how to build server-rendered web pages using Fastify and Handlebars.

We will learn how to:

- Understand the difference between API responses and server-rendered HTML.
- Render HTML templates using Handlebars.
- Serve static files such as CSS, images, and JavaScript.
- Display dynamic content using variables, conditionals, and loops.
- Organize templates using reusable layouts and partials.
- Understand HTML escaping and prevent Cross-Site Scripting (XSS).
- Handle HTML form submissions using Fastify.
- Validate user input manually and using JSON Schema.
- Understand Cross-Site Request Forgery (CSRF) and implement token-based protection.
- Handle validation errors and improve form submission using the Post/Redirect/Get pattern.

## Introduction to Server-Side Rendering

In our previous workshop, we learned how to build REST-style APIs using Node.js, Fastify, and TypeScript. We created endpoints that received HTTP requests, processed information, and returned structured JSON responses.

This approach works particularly well when our backend communicates with other applications, such as React front-ends or mobile applications. However, not every application needs a separate front-end. Sometimes we want the server itself to generate complete HTML pages that users can access through their browsers.

This is where **Server-Side Rendering (SSR)** becomes useful.

Server-Side Rendering is an approach in which the server generates HTML before sending it to the browser. Instead of returning JSON and requiring the client to construct the page, the backend prepares the HTML and sends it directly as an HTTP response.

For example, imagine we are building a blog application. When someone visits a particular article, the server retrieves its information, inserts the title and content into an HTML template, and returns the generated page to the browser.

The browser then receives HTML that is already populated with the article's information and displays it to the user.

The process can be represented as follows:

```text
            CLIENT
           (Browser)
               |
               | HTTP Request
               |
               v
            FASTIFY
          (Web Server)
               |
               v
        Route Handler
               |
               v
        Retrieve Data
               |
               v
       HTML Template
        (Handlebars)
               |
               v
       Render HTML Page
               |
               v
        HTTP Response
               |
               v
            CLIENT
```

Notice that the server is responsible for preparing the HTML response. This differs from an API-driven application, where the server typically returns JSON and leaves the front-end responsible for constructing the interface.

Both approaches are useful, and Fastify supports both. We can build APIs for separate clients or render complete HTML pages using a templating engine.

In this workshop, we will explore the second approach using **Handlebars**, integrated into Fastify through the `@fastify/view` plugin.

## Rendering Basic HTML Templates

Our first step is to make Fastify return an HTML page instead of a simple string or JSON object.

We could write an entire HTML document directly inside a route handler, but this would quickly become difficult to maintain. HTML structure and application logic would be mixed together, making it harder to modify the interface as our application grows.

A better approach is to place our HTML in separate files called **templates**. The backend can then render these templates and return the resulting HTML to the client.

### Setting Up the Project Structure

We will continue using the project created in the previous workshop. Therefore, we keep our existing TypeScript configuration, module system, and application structure.

Our project will now contain additional directories for templates and static files:

```text
my_fastify_project/
│
├── src/
│   ├── plugins/
│   ├── routes/
│   ├── app.ts
│   └── server.ts
│
├── views/                 # HTML templates
│   └── index.hbs
│
├── public/                # Static files
│   ├── css/
│   └── images/
│
├── dist/                  # Compiled JavaScript
│
├── node_modules/
│
├── package.json
├── package-lock.json
└── tsconfig.json
```

The `views` directory contains the templates used to generate HTML pages, while the `public` directory contains resources such as stylesheets, images, and client-side JavaScript.

We keep these directories at the project root rather than inside `src` because TypeScript compiles our `.ts` files but does not automatically copy HTML templates or static assets into the `dist` directory.

This means that our templates and public files remain available independently of the compilation process.

### Installing Handlebars and Fastify View

Fastify does not include a template engine by default. Instead, we integrate one using a plugin.

We will use `@fastify/view`, which provides an interface for rendering templates through Fastify's route handlers.

Install the required packages:

```bash
npm install @fastify/view handlebars
```

We will also use `fastify-plugin` to create reusable plugins that expose shared functionality across our application:

```bash
npm install fastify-plugin
```

The `@fastify/view` plugin supports several templating engines, including Handlebars, EJS, Nunjucks, and Pug.

We choose Handlebars because it provides a simple syntax for inserting dynamic values and rendering collections of data without requiring us to write complex logic inside HTML templates.

### Understanding Handlebars

Handlebars is a JavaScript templating engine that allows us to generate HTML dynamically using predefined expressions.

A template is essentially an HTML document containing placeholders that will be replaced with actual data when the server renders it.

For example, consider the following template:

```handlebars
<h1>Hello, {{name}}!</h1>
```

The expression `{{name}}` represents a dynamic value.

When the server renders the template using:

```typescript
{
    name: 'Alice'
}
```

Handlebars replaces the placeholder with the corresponding value, generating:

```html
<h1>Hello, Alice!</h1>
```

This allows us to maintain the HTML structure separately while the backend provides the information that should appear inside it.

Handlebars also supports features such as conditional rendering, loops, and reusable partials. We will explore these features gradually as our pages become more dynamic.

### Configuring the Templates Plugin

Instead of configuring the templating engine directly inside `app.ts`, we will create a separate plugin responsible for managing our views.

Create a file named `views.ts` inside `src/plugins`:

```bash
touch src/plugins/views.ts
```

**`src/plugins/views.ts`:**

```typescript
import fp from 'fastify-plugin'
import view from '@fastify/view'
import handlebars from 'handlebars'
import { resolve } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'

const viewsPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.register(view, {
        engine: {
            handlebars
        },

        root: resolve(process.cwd(), 'views'),

        includeViewExtension: true
    })

}

export default fp(viewsPlugin)
```

Let's understand what happens here.

We first import `@fastify/view` and Handlebars. The view plugin connects Fastify to the templating engine and provides methods for rendering templates inside our route handlers.

We then configure the engine:

```typescript
engine: {
    handlebars
}
```

This tells `@fastify/view` that we want to use Handlebars to process our templates.

Next, we define the location of our templates:

```typescript
root: resolve(process.cwd(), 'views')
```

The `root` option specifies the directory from which template files will be loaded.

We use `process.cwd()` to obtain the project's working directory and then resolve the path to the `views` folder. This keeps the location independent of whether our TypeScript files are executing through `tsx` or compiled JavaScript inside `dist`.

We also enable:

```typescript
includeViewExtension: true
```

This allows us to reference templates without manually specifying their `.hbs` extension.

For example, we can render `index` instead of writing `index.hbs`.

Finally, we wrap the plugin using `fastify-plugin`.

This is important because `@fastify/view` adds rendering functionality to Fastify's reply object. By using `fastify-plugin`, we expose the registered functionality to the appropriate parent application scope so that our route plugins can use it.

### Creating Our First HTML Template

Now that our templating engine is configured, let's create our first page.

Create a file named `index.hbs` inside the `views` directory:

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

This is a normal HTML document. The only difference is its file extension, which identifies it as a Handlebars template.

At this stage, the page does not contain dynamic content, but we can already render it through Fastify.

### Creating the Homepage Route

We need a route that responds to requests for the homepage and renders our template.

Create a file named `home.ts` inside `src/routes`:

```bash
touch src/routes/home.ts
```

Inside this file:

**`src/routes/home.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const homeRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get('/', async (request, reply) => {

        return reply.viewAsync('index')

    })

}

export default homeRoutes
```

Here, we define a route plugin containing our homepage endpoint.

Instead of returning a string or JSON object, we use:

```typescript
reply.viewAsync('index')
```

The `viewAsync()` method tells Fastify to render the specified template using the configured templating engine.

It returns a promise containing the rendering result, allowing rendering errors to propagate through Fastify's normal asynchronous error-handling process.

This is preferable to `reply.view()` inside asynchronous route handlers.

### Registering the Plugins

Now we need to register our templates plugin and homepage routes inside the main application.

Update `app.ts`:

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

import viewsPlugin from './plugins/views.js'
import homeRoutes from './routes/home.js'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Configure the templating engine
    fastify.register(viewsPlugin)

    // Register homepage routes
    fastify.register(homeRoutes)

    return fastify
}
```

Notice that we continue using the `buildApp()` function introduced in the previous workshop.

The application is responsible for creating the Fastify instance and registering its plugins, while `server.ts` remains responsible for starting the HTTP server.

We don't need to modify `server.ts` because the server startup process remains the same.

Run the application:

```bash
npm run dev
```

Now visit:

```text
http://127.0.0.1:3000
```

The browser should display our homepage.

Behind the scenes, Fastify receives the request, executes the homepage route, renders `index.hbs` using Handlebars, and sends the generated HTML to the browser.

We have successfully moved from returning simple strings or JSON objects to rendering complete HTML pages.

## Serving Static Files

Our current homepage is functional, but it contains no styling or visual resources.

To make a web application more presentable, we usually need external files such as CSS stylesheets, images, fonts, and client-side JavaScript.

These resources are known as **static files** because the server delivers them directly without dynamically generating their contents for every request.

Fastify provides the `@fastify/static` plugin to handle this functionality.

### Organizing Static Files

We will store static assets inside our existing `public` directory.

Create the following structure:

```text
public/
│
├── css/
│   └── style.css
│
└── images/
    └── logo.png
```

The `css` directory contains our stylesheets, while `images` contains the images used by our pages.

### Installing and Configuring the Static Plugin

Install the required package:

```bash
npm install @fastify/static
```

Now create a file named `static.ts` inside `src/plugins`:

```bash
touch src/plugins/static.ts
```

**`src/plugins/static.ts`:**

```typescript
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'

import { resolve } from 'node:path'
import type { FastifyPluginAsync } from 'fastify'

const staticPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.register(fastifyStatic, {
        root: resolve(process.cwd(), 'public'),
        prefix: '/static/'
    })

}

export default fp(staticPlugin)
```

The `@fastify/static` plugin provides functionality for serving files from a directory.

We configure two important options.

The `root` option specifies the directory containing our static resources:

```typescript
root: resolve(process.cwd(), 'public')
```

The `prefix` option defines the URL prefix through which these files will be accessible:

```typescript
prefix: '/static/'
```

This means that files inside the `public` directory can be requested through URLs beginning with `/static/`.

For example, the filesystem path:

```text
public/css/style.css
```

becomes accessible through:

```text
/static/css/style.css
```

Similarly:

```text
public/images/logo.png
```

becomes:

```text
/static/images/logo.png
```

The distinction between these two paths is important. The filesystem path identifies where a file is stored on the server, while the URL identifies how clients access it.

### Creating a Stylesheet

Before connecting our stylesheet to the homepage, let's add some basic styles.

**`public/css/style.css`:**

```css
body {
    font-family: Arial, sans-serif;
    background-color: #f0f2f5;
    color: #333;
    text-align: center;
    margin: 0;
    padding: 50px 20px;
}

h1 {
    color: #2563eb;
}

img {
    width: 150px;
    border-radius: 10px;
}
```

This stylesheet modifies the appearance of our page by defining its typography, background, text color, and image dimensions.

### Connecting Static Files to Our Template

Now update `index.hbs` to include our stylesheet and display an image.

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

Notice the paths used in the stylesheet and image references.

They point to the URLs exposed by `@fastify/static`, not directly to the filesystem locations.

### Registering the Static Plugin

Finally, update `app.ts`:

```typescript
import Fastify from 'fastify'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'

import homeRoutes from './routes/home.js'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Configure the templating engine
    fastify.register(viewsPlugin)

    // Serve static files
    fastify.register(staticPlugin)

    // Register homepage routes
    fastify.register(homeRoutes)

    return fastify
}
```

Restart the application if necessary and refresh:

```text
http://127.0.0.1:3000
```

The browser should now display the styled homepage, assuming `logo.png` exists in the expected directory.

The important idea is that Fastify handles two different responsibilities here: `@fastify/view` generates our HTML pages, while `@fastify/static` delivers the external resources referenced by those pages.

Both work together to create a complete web interface.

## Introduction to Dynamic Templates

So far, our templates contain static HTML. Every visitor receives essentially the same content because we have not provided any information that changes between requests.

Real applications, however, often need to display information retrieved from databases, user input, or other application components.

For example, a profile page should display the information belonging to a particular user, while a dashboard might display different content depending on the user's account.

Handlebars allows us to achieve this by passing data from our route handlers to our templates.

### Rendering Dynamic Values

Let's create a profile page that displays a user's username and biography.

First, create a route file:

```bash
touch src/routes/profile.ts
```

**`src/routes/profile.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const profileRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{ Params: { name: string } }>(
        '/profile/:name',
        async (request, reply) => {

            const { name } = request.params

            const user = {
                username: name,
                bio: 'Loves coding and exploring new technologies.'
            }

            return reply.viewAsync('profile', {
                title: 'User Profile',
                user
            })

        }
    )

}

export default profileRoutes
```

Here, we use a dynamic route parameter to determine which username should appear on the page.

We retrieve the value through:

```typescript
const { name } = request.params
```

We then construct a user object and pass it to the template using:

```typescript
return reply.viewAsync('profile', {
    title: 'User Profile',
    user
})
```

The second argument is the data object that Handlebars will use when rendering the template.

Create the corresponding template:

**`views/profile.hbs`:**

```html
<section class="profile">

    <h1>Hello, {{user.username}}!</h1>

    <p>{{user.bio}}</p>

</section>
```

Notice how we use:

```handlebars
{{user.username}}
```

This is called a **path expression**. It allows us to access properties inside nested objects.

Since we passed a `user` object to the template, we can access its properties through `user.username` and `user.bio`.

Register the plugin in `app.ts`:

```typescript
import profileRoutes from './routes/profile.js'

// Inside buildApp()

fastify.register(profileRoutes)
```

Now visit:

```text
http://127.0.0.1:3000/profile/Alice
```

The browser displays:

```text
Hello, Alice!

Loves coding and exploring new technologies.
```

Changing the username in the URL changes the information rendered by the template.

This demonstrates an important relationship between Fastify and Handlebars: the route handler prepares the data, while the template determines how that data appears in the HTML page.

We should keep this separation because presentation code should not become responsible for complex application logic.

### Conditional Rendering

Sometimes we don't want to display every part of a page unconditionally. The content might depend on whether a user is authenticated, whether a collection contains items, or whether a particular feature is available.

Handlebars provides block helpers such as `{{#if}}` and `{{else}}` to control which sections of a template should be rendered.

Let's create a simple dashboard that displays different messages depending on the user's role.

First, create:

```bash
touch src/routes/dashboard.ts
```

**`src/routes/dashboard.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get('/dashboard', async (request, reply) => {

        const user = {
            username: 'Alice',
            role: 'member'
        }

        return reply.viewAsync('dashboard', {
            title: 'Dashboard',
            user,
            isAdmin: user.role === 'admin',
            isMember: user.role === 'member'
        })

    })

}

export default dashboardRoutes
```

Here, the route provides information about a sample user.

Notice that we calculate the boolean values in the route handler:

```typescript
isAdmin: user.role === 'admin',
isMember: user.role === 'member'
```

This keeps comparisons in JavaScript and allows the template to focus on displaying the correct content.

Now create the template:

**`views/dashboard.hbs`:**

```html
<section class="dashboard">

    <h1>Welcome, {{user.username}}!</h1>

    {{#if isAdmin}}

        <h2>Administrator Dashboard</h2>
        <p>You have access to administrative features.</p>

    {{else if isMember}}

        <h2>Member Dashboard</h2>
        <p>Welcome back to your account.</p>

    {{else}}

        <h2>Guest Dashboard</h2>
        <p>Please log in to access member features.</p>

    {{/if}}

</section>
```

The `{{#if}}` helper checks whether a value is truthy. If `isAdmin` is true, Handlebars renders the administrator section.

Otherwise, it evaluates the `else if` condition. If neither condition is satisfied, it renders the final `else` block.

We could also use:

```handlebars
{{#if isAdmin}}
    <p>Administrator access</p>
{{/if}}
```

when we only need a conditional section without an alternative.

This is useful for controlling visibility without adding conditional statements directly to our HTML generation logic.

An important security distinction is worth mentioning here: the role used in this example is sample application data. In a real application, roles and permissions must come from trusted authentication and authorization logic. We must never allow a client to become an administrator simply by changing a URL parameter or submitting a different role value.

### Iterating Over Data with Loops

Another common requirement is displaying collections of information.

Imagine we are building a task management application. Instead of displaying one task, we need to display all tasks belonging to a user.

We could manually write an HTML element for every task, but this becomes impractical when the number of items changes.

Handlebars solves this problem through the `{{#each}}` block helper, which allows us to iterate over arrays.

Let's build a simple task list.

Create:

```bash
touch src/routes/tasks.ts
```

**`src/routes/tasks.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

const tasksRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get('/tasks', async (request, reply) => {

        const tasks = [
            { name: 'Finish project proposal', priority: 'High' },
            { name: 'Buy groceries', priority: 'Medium' },
            { name: 'Read a chapter', priority: 'Low' }
        ]

        return reply.viewAsync('tasks', {
            title: 'My Tasks',
            tasks
        })

    })

}

export default tasksRoutes
```

Here, we create an array containing several task objects and pass it to our template.

Now create:

**`views/tasks.hbs`:**

```html
<section class="tasks">

    <h1>Today's Tasks</h1>

    <ul class="task-list">

        {{#each tasks}}

            <li class="task-priority-{{priority}}">
                <strong>{{name}}</strong>
                <span>Priority: {{priority}}</span>
            </li>

        {{else}}

            <li>No tasks available. Enjoy your day!</li>

        {{/each}}

    </ul>

</section>
```

The `{{#each tasks}}` expression tells Handlebars to iterate over the `tasks` array.

During each iteration, Handlebars changes the current context to the current task object. This means that we can access its properties directly through `{{name}}` and `{{priority}}`.

We can also access the current item's position using `{{@index}}`:

```handlebars
{{#each tasks}}

    <p>{{@index}} - {{name}}</p>

{{/each}}
```

The `@index` variable starts at zero and increases with each iteration.

Another useful feature is the `{{else}}` block inside `each`. It is rendered when the collection is empty or otherwise has no items to iterate over.

For example, we can temporarily change our route:

```typescript
const tasks: { name: string; priority: string }[] = []
```

Now the template displays:

```text
No tasks available. Enjoy your day!
```

This allows us to handle empty collections naturally without adding extra rendering logic to our routes.

These features are particularly useful when building dashboards, product listings, task managers, and other pages that display information from databases.

## Reusable Layouts and Partials

As our application grows, we will notice that different pages share many HTML elements.

For example, most pages have the same navigation bar, header, footer, and stylesheet references.

Copying these elements into every template would create unnecessary duplication. Any design change would require us to modify multiple files.

Handlebars provides **partials**, which allow us to reuse template fragments across different pages. We can also use a layout to define the common structure surrounding page-specific content.

### Understanding Partials and Layouts

A partial is a reusable piece of a template. It might represent a navigation bar, footer, sidebar, or any other section that appears in multiple pages.

A layout, on the other hand, defines the overall structure of a page and provides a location where the page-specific content should appear.

We will use both concepts to create a shared layout for our application.

### Organizing the Templates

Let's update our `views` directory:

```text
views/
│
├── layouts/
│   └── main.hbs
│
├── partials/
│   ├── navbar.hbs
│   └── footer.hbs
│
├── index.hbs
├── profile.hbs
├── dashboard.hbs
└── tasks.hbs
```

We place the reusable layout inside `layouts` and the smaller reusable components inside `partials`.

### Creating the Navigation Bar

First, create the navigation bar partial.

**`views/partials/navbar.hbs`:**

```html
<header class="site-header">

    <nav class="navbar">

        <a href="/">Home</a>

        <a href="/profile/Alice">Profile</a>

        <a href="/dashboard">Dashboard</a>

        <a href="/tasks">Tasks</a>

        <a href="/contact">Contact</a>

    </nav>

</header>
```

This file contains only the navigation section.

Instead of repeating these links in every page, we can include the partial wherever we need it.

### Creating the Footer

Create another partial:

**`views/partials/footer.hbs`:**

```html
<footer class="site-footer">

    <p>
        Created by Bayt Al Hikmah &copy; 2026
    </p>

</footer>
```

We now have two reusable components that can be included in our page layout.

### Creating the Main Layout

Next, create:

**`views/layouts/main.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>{{title}}</title>

    <link rel="stylesheet" href="/static/css/style.css">

</head>

<body>

    {{> navbar}}

    <main class="container">

        {{{body}}}

    </main>

    {{> footer}}

</body>

</html>
```

Notice that we use:

```handlebars
{{> navbar}}
```

and:

```handlebars
{{> footer}}
```

These expressions insert the corresponding partials into the layout.

We also introduce:

```handlebars
{{{body}}}
```

This is a special variable used by `@fastify/view` when applying a layout. It contains the HTML generated by rendering the individual page template.

We use triple braces because this content is already-rendered HTML and must not be escaped as ordinary text.

This is different from inserting user-generated values, which should normally use double braces to preserve HTML escaping. We will examine this security distinction later.

### Registering Partials and the Layout

Now that we have created the layout and partials, we need to configure Handlebars to use them.

Update `src/plugins/views.ts`:

**`src/plugins/views.ts`:**

```typescript
import fp from 'fastify-plugin'
import view from '@fastify/view'
import handlebars from 'handlebars'

import { resolve } from 'node:path'
import type { FastifyPluginAsync } from 'fastify'

const viewsPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.register(view, {

        engine: {
            handlebars
        },

        root: resolve(process.cwd(), 'views'),

        includeViewExtension: true,

        layout: 'layouts/main.hbs',

        options: {
            partials: {
                navbar: 'partials/navbar.hbs',
                footer: 'partials/footer.hbs'
            }
        }

    })

}

export default fp(viewsPlugin)
```

The `root` option tells Fastify where to find the templates, while the `layout` option specifies the common layout applied when rendering pages.

Inside `options.partials`, we register the names and file paths of our reusable Handlebars partials.

For example:

```typescript
navbar: 'partials/navbar.hbs'
```

allows us to include the navigation bar using:

```handlebars
{{> navbar}}
```

Similarly, the footer becomes available through `{{> footer}}`.

`@fastify/view` supports both Handlebars partial registration and layouts through its engine configuration. ([Documentation](https://github.com/fastify/point-of-view))

### Updating Individual Page Templates

Because the layout now generates the main HTML structure, our individual page templates no longer need to contain complete HTML documents.

For example, we can simplify `index.hbs` to:

**`views/index.hbs`:**

```html
<section class="hero">

    <h1>Welcome to Our Website!</h1>

    <p>
        This application is powered by
        Fastify and Handlebars.
    </p>

</section>
```

Similarly, `profile.hbs` only needs to contain the profile section:

```html
<section class="profile">

    <h1>Hello, {{user.username}}!</h1>

    <p>{{user.bio}}</p>

</section>
```

When a route renders either template, `@fastify/view` combines its generated HTML with the configured layout.

The resulting page contains the navigation bar, main content, and footer without requiring us to repeat their HTML.

This approach makes the application considerably easier to maintain. If we want to change the navigation links, we only need to modify `navbar.hbs`, and the change automatically applies to every page using the shared layout.

## HTML Escaping and Cross-Site Scripting (XSS)

Now that we can display dynamic information, we need to consider an important security issue.

Some of the data displayed by our templates may come directly from users. For example, a user might submit a username, biography, comment, or quote that will later appear on a page.

If we insert untrusted information into HTML without proper handling, an attacker might be able to inject executable JavaScript into our application.

This type of vulnerability is called **Cross-Site Scripting (XSS)**.

Consider a user submitting the following value as their name:

```html
<script>alert('XSS')</script>
```

If the browser interprets this value as HTML rather than ordinary text, the JavaScript inside the script element can execute in the context of our website.

Handlebars helps prevent this through automatic HTML escaping.

### Understanding HTML Escaping

When we use a normal expression:

```handlebars
<h1>{{username}}</h1>
```

Handlebars escapes special HTML characters in the value before inserting it into the page.

For example, the submitted value:

```html
<script>alert('XSS')</script>
```

is rendered as text instead of an executable script element.

The browser therefore displays the content rather than executing it.

This behavior is provided automatically by Handlebars for normal expressions. ([Handlebars Documentation](https://handlebarsjs.com/guide/expressions.html))

However, Handlebars also provides a way to insert unescaped HTML using triple braces:

```handlebars
{{{username}}}
```

This tells Handlebars to output the value without normal HTML escaping.

For example, if `username` contains HTML, the browser may interpret that HTML directly.

Using triple braces with untrusted user input can therefore introduce XSS vulnerabilities.

The distinction is important:

```handlebars
{{username}}
```

Escapes the value.

```handlebars
{{{username}}}
```

Outputs the value without escaping.

For ordinary user-generated content, we should use double braces.

There are specific situations where raw HTML output is appropriate, such as the `{{{body}}}` variable used by our layout to insert the HTML generated by another trusted template. However, we should never assume that arbitrary data supplied by users is safe to render without escaping.

Also, HTML escaping does not validate every possible context. For example, URLs placed inside `href` attributes must still be checked to prevent dangerous schemes such as `javascript:`.

Understanding this behavior is important because our application will soon accept user input and display it through Handlebars templates.

## Handling HTML Forms

Until now, our application has mainly displayed information prepared by the server. However, real applications also need to receive information from users.

For example, a contact page might allow visitors to submit messages, while a registration page collects usernames and passwords.

HTML forms provide a standard way for browsers to send this information to a server.

Fastify can receive form submissions and expose their values through the `request.body` object. However, before accessing the submitted data, we need to understand how HTML forms encode their information.

### Understanding HTML Form Submission

Consider a simple HTML form:

```html
<form action="/contact" method="POST">

    <input type="text" name="name">

    <textarea name="message"></textarea>

    <button type="submit">Submit</button>

</form>
```

The `action` attribute specifies the URL where the browser sends the form data.

The `method` attribute determines the HTTP method used for submission. Here, we use POST because the client is submitting information that the server is expected to process.

Notice that each input has a `name` attribute.

These names identify the submitted fields and become the property names available in the request body.

When the user enters:

```text
name: Alice
message: Hello
```

the browser sends data similar to:

```text
name=Alice&message=Hello
```

By default, an HTML form without a different `enctype` uses the content type:

```text
application/x-www-form-urlencoded
```

Fastify's default body parser handles JSON requests, but it does not automatically parse URL-encoded form submissions. We need an additional plugin for that.

### Installing the Form Body Plugin

Fastify provides `@fastify/formbody` to parse URL-encoded form data.

Install it:

```bash
npm install @fastify/formbody
```

Then import it inside `app.ts`:

```typescript
import formbody from '@fastify/formbody'
```

Register it when creating the application:

```typescript
export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    // Parse URL-encoded form submissions
    fastify.register(formbody)

    // Register route plugins ...

    return fastify
}
```

The plugin registers a content-type parser for `application/x-www-form-urlencoded`.

When a browser submits an HTML form using this encoding, Fastify parses the submitted fields and makes them available as a JavaScript object through `request.body`.

For example, the submitted data:

```text
name=Alice&message=Hello
```

becomes:

```typescript
{
    name: 'Alice',
    message: 'Hello'
}
```

This allows us to work with form submissions in the same way we access other request information. ([Documentation](https://github.com/fastify/fastify-formbody))

### Creating a Contact Form

Let's build a simple contact page.

Create:

```bash
touch src/routes/contact.ts
```

**`src/routes/contact.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

type ContactBody = {
    name?: string
    message?: string
}

const contactRoutes: FastifyPluginAsync = async (fastify) => {

    // Display the contact form
    fastify.get('/contact', async (request, reply) => {

        return reply.viewAsync('contact', {
            title: 'Contact Us',
            values: {
                name: '',
                message: ''
            }
        })

    })

    // Process the submitted form
    fastify.post<{ Body: ContactBody }>(
        '/contact',
        async (request, reply) => {

            const name =
                typeof request.body.name === 'string'
                    ? request.body.name.trim()
                    : ''

            const message =
                typeof request.body.message === 'string'
                    ? request.body.message.trim()
                    : ''

            const errors: {
                name?: string
                message?: string
            } = {}

            if (name.length < 3 || name.length > 25) {
                errors.name = 'Name must contain 3 to 25 characters.'
            }

            if (message.length === 0 || message.length > 200) {
                errors.message = 'Message must contain 1 to 200 characters.'
            }

            // Redisplay the form if validation fails
            if (Object.keys(errors).length > 0) {

                return reply.code(400).viewAsync('contact', {
                    title: 'Contact Us',
                    errors,
                    values: {
                        name,
                        message
                    }
                })

            }

            fastify.log.info(
                { name },
                'Contact form submitted'
            )

            return reply.redirect('/contact?submitted=1', 303)

        }
    )

}

export default contactRoutes
```

Let's understand the implementation.

We first define a TypeScript type describing the expected form fields:

```typescript
type ContactBody = {
    name?: string
    message?: string
}
```

We use this type to describe the request body available inside our route handler.

However, remember that TypeScript types provide compile-time information. They do not validate the actual information received from the browser. That is why we explicitly check the values before processing them.

We retrieve the submitted fields using:

```typescript
request.body.name
request.body.message
```

We also use `trim()` to remove unnecessary whitespace from the beginning and end of each value.

This is important because a field containing only spaces should not be considered valid input.

After extracting the values, we create an `errors` object.

If the name or message does not satisfy our requirements, we add an appropriate error message.

We then check whether any validation errors exist:

```typescript
if (Object.keys(errors).length > 0)
```

If the object contains errors, we render the contact page again and pass both the errors and previously submitted values to the template.

This allows us to display feedback without forcing users to enter their information again.

If the input is valid, we process the submission. For this introductory example, we log a confirmation event rather than storing the message in a database.

Finally, we redirect the browser:

```typescript
return reply.redirect('/contact?submitted=1', 303)
```

The `303 See Other` status tells the browser to follow the redirect using a GET request.

This introduces an important web development pattern called **Post/Redirect/Get**, which we will examine after understanding the validation process.

### Creating the Contact Template

Now create the corresponding template.

**`views/contact.hbs`:**

```html
<section class="contact">

    <h1>Contact Us</h1>

    {{#if submitted}}

        <p class="success">
            Your message has been submitted successfully.
        </p>

    {{/if}}

    {{#if errors}}

        <div class="error">

            {{#if errors.name}}
                <p>{{errors.name}}</p>
            {{/if}}

            {{#if errors.message}}
                <p>{{errors.message}}</p>
            {{/if}}

        </div>

    {{/if}}

    <form action="/contact" method="POST">

        <label for="name">Name:</label>

        <input
            type="text"
            id="name"
            name="name"
            value="{{values.name}}"
            required
        >

        <label for="message">Message:</label>

        <textarea
            id="message"
            name="message"
            required
        >{{values.message}}</textarea>

        <button type="submit">Submit</button>

    </form>

</section>
```

We use Handlebars expressions to display validation errors and preserve the values previously entered by the user.

For example:

```handlebars
{{#if errors.name}}
    <p>{{errors.name}}</p>
{{/if}}
```

This section only appears when the route provides a name-related error.

We also use:

```handlebars
value="{{values.name}}"
```

to restore the submitted name when rendering the form again.

Notice that we use normal Handlebars expressions rather than triple braces. This ensures that submitted values are HTML-escaped before being inserted into the page.

### Registering the Contact Routes

Update `app.ts`:

```typescript
import contactRoutes from './routes/contact.js'

// Inside buildApp()

fastify.register(contactRoutes)
```

Now run the application and visit:

```text
http://127.0.0.1:3000/contact
```

Enter a name and a message, then submit the form.

The server receives the POST request, parses the form data, validates the values, and redirects to the contact page after a successful submission.

Try submitting an invalid name or an empty message to see how the validation errors are displayed.

### Understanding the Post/Redirect/Get Pattern

Notice that after a successful submission, we redirect the browser instead of directly rendering the contact page from the POST handler.

This follows a common web development pattern called **Post/Redirect/Get (PRG)**.

Without this pattern, refreshing the browser after a successful POST might cause the browser to ask the user whether they want to submit the form again.

This could result in duplicate operations, such as submitting the same contact message multiple times.

PRG solves this by separating the form submission from the subsequent page request.

The process is:

```text
          GET /contact
                |
                v
          Display Form
                |
                v
         POST /contact
                |
                v
       Validate and Process
                |
                v
         HTTP 303 Redirect
                |
                v
       GET /contact?submitted=1
                |
                v
        Display Confirmation
```

The POST request performs the operation, while the redirected GET request displays the resulting page.

In our example, the confirmation state is carried through a query parameter to keep the implementation simple. Production applications commonly use session-based flash messages when they need to preserve temporary feedback more reliably.

## Validating Forms with JSON Schema

Our manual validation works, but as applications grow, checking every field individually becomes repetitive.

Imagine a registration form containing a username, email, password, and phone number. We would need to write several validation conditions and maintain them as the application changes.

Fastify provides a better approach through **JSON Schema**.

As we learned in the previous workshop, JSON Schema allows us to describe the expected structure and constraints of incoming data.

Fastify can then validate requests automatically before executing the route handler.

### Understanding the Difference Between Manual and Schema Validation

In our previous implementation, we wrote conditions such as:

```typescript
if (name.length < 3 || name.length > 25) {
    errors.name = 'Invalid name'
}
```

This requires us to implement each validation rule manually.

With JSON Schema, we describe these requirements declaratively:

```typescript
name: {
    type: 'string',
    minLength: 3,
    maxLength: 25
}
```

Instead of writing the validation logic ourselves, we define the expected structure and let Fastify perform the checks.

This makes validation easier to organize and reuse, especially when an application contains many endpoints.

### Defining a Form Schema

Let's upgrade our contact form to use JSON Schema.

Our requirements remain the same: the name must contain between 3 and 25 characters, while the message must contain between 1 and 200 characters.

We can define the following schema:

```typescript
const contactBodySchema = {
    type: 'object',

    required: ['name', 'message'],

    properties: {

        name: {
            type: 'string',
            minLength: 3,
            maxLength: 25,
            pattern: '\\S'
        },

        message: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            pattern: '\\S'
        }

    },

    additionalProperties: false
}
```

Let's understand the important properties.

The `type` property specifies that the request body must be an object.

The `required` array defines which fields must be provided.

Inside `properties`, we describe the expected type and constraints of each field.

For example:

```typescript
minLength: 3,
maxLength: 25
```

restricts the name to between 3 and 25 characters.

We also use:

```typescript
pattern: '\\S'
```

This requires the value to contain at least one non-whitespace character.

The `additionalProperties` option prevents clients from submitting fields that are not defined in our schema.

Because we trim the submitted strings before validation, the length constraints are applied to the normalized values rather than strings padded with unnecessary whitespace.

### An Important Detail About Form Content Types

There is something important we need to understand before applying this schema.

In the previous workshop, we mainly used JSON request bodies. Fastify validates JSON bodies using the route's `body` schema by default.

However, HTML forms normally submit data using:

```text
application/x-www-form-urlencoded
```

This is a different content type.

Fastify supports validation for different content types through the `content` property inside a body schema.

This means that we need to specify which schema should be applied to each accepted request content type.

For our contact form, we can configure:

```typescript
schema: {
    body: {
        content: {
            'application/x-www-form-urlencoded': {
                schema: contactBodySchema
            }
        }
    }
}
```

We can also provide the same schema for `application/json` if we intend to accept JSON submissions through the same endpoint.

This distinction is important because registering a parser for a content type does not automatically mean that a normal body schema will validate every parsed request. Fastify selects the schema according to the request's content type when we use content-specific validation. ([Fastify Validation Documentation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/))

For our example, we will support both URL-encoded forms and JSON requests using the same validation rules.

## Protecting HTML Forms Against CSRF

Now that our application can receive and validate form submissions, we need to consider another security concern.

A valid request is not necessarily an authorized request.

For example, imagine a user is logged into an application that allows them to modify their account information.

An attacker could create a malicious website containing a form that submits a request to that application.

If the user visits the malicious website while still authenticated, their browser might automatically include the application's authentication cookies when sending the request.

The application may then process the request because it appears to come from an authenticated user, even though the user did not intentionally perform that operation.

This attack is called **Cross-Site Request Forgery (CSRF)**.

### Understanding CSRF Attacks

Consider the following scenario.

A user logs into an online banking application. The browser stores an authentication cookie that identifies the user's session.

Later, the user visits a malicious website containing a form designed to submit a money transfer request to the banking application.

The browser may automatically attach the banking application's cookies to the forged request.

If the server relies only on the presence of that cookie, it might mistake the request for a legitimate action initiated by the user.

The attacker is exploiting the browser's automatic handling of authentication credentials.

This is why browser-based applications that rely on automatically transmitted credentials need protection against CSRF attacks.

### Understanding CSRF Tokens

One common defense is to use **CSRF tokens**.

A CSRF token is an unpredictable value generated by the server and associated with a client's context, such as a session or a stored secret.

The server includes the token in a legitimate form. When the user submits that form, the token is sent back to the server.

The server verifies that the submitted token is valid before processing the operation.

An attacker who creates a malicious form on another website should not be able to obtain the valid token associated with the user's application context.

The process can be represented as follows:

```text
          CLIENT
             |
             | GET /contact
             |
             v
           SERVER
             |
             v
      Generate CSRF Token
             |
             v
      Render HTML Form
             |
             v
    Send Form + CSRF Token
             |
             v
          CLIENT
             |
             v
       Submit Form
       + CSRF Token
             |
             v
           SERVER
             |
             v
       Verify CSRF Token
             |
       ┌─────┴─────┐
       |           |
       v           v
     VALID       INVALID
       |           |
       v           v
   Process      Reject
   Request      Request
```

CSRF tokens are particularly useful for traditional server-rendered applications that use browser cookies for authentication.

However, token validation should be part of a broader security strategy. HTTPS, appropriate cookie settings, and origin verification can provide additional protection. `SameSite` cookie attributes are useful defense-in-depth measures, but they do not replace a proper CSRF strategy in every application. ([OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html))

### Installing CSRF Protection

Fastify provides the `@fastify/csrf-protection` plugin to help implement token-based CSRF protection.

We will use it together with `@fastify/cookie`, which provides cookie support.

Install the packages:

```bash
npm install @fastify/cookie @fastify/csrf-protection
```

Create a new plugin:

```bash
touch src/plugins/security.ts
```

**`src/plugins/security.ts`:**

```typescript
import fp from 'fastify-plugin'

import cookie from '@fastify/cookie'
import csrfProtection from '@fastify/csrf-protection'

import type { FastifyPluginAsync } from 'fastify'

const securityPlugin: FastifyPluginAsync = async (fastify) => {

    // Register cookie support first
    fastify.register(cookie)

    // Register CSRF protection
    fastify.register(csrfProtection)

}

export default fp(securityPlugin)
```

The cookie plugin must be registered before any functionality that depends on its request-cookie parsing.

The CSRF plugin uses cookie storage by default when integrated with `@fastify/cookie`. It stores the CSRF secret in a cookie, while the token itself can be included in the HTML form.

Wrapping this plugin with `fastify-plugin` makes its functionality available to our application and its route plugins.

The `@fastify/csrf-protection` plugin provides two important methods:

```typescript
reply.generateCsrf()
```

Generates or retrieves the CSRF token associated with the current context.

```typescript
fastify.csrfProtection
```

Provides the hook used to verify the token submitted by the client.

An important detail is that `reply.generateCsrf()` returns a promise, so we should use `await` when retrieving its value.

The token is associated with a stored secret. Calling `generateCsrf()` again does not necessarily create an entirely new secret every time; the plugin can reuse the existing one.

### Generating a CSRF Token

Before displaying a protected form, we need to generate a token and pass it to the template.

For example:

```typescript
fastify.get('/contact', async (request, reply) => {

    const csrfToken = await reply.generateCsrf()

    return reply.viewAsync('contact', {
        title: 'Contact Us',
        csrfToken
    })

})
```

We retrieve the token using `reply.generateCsrf()` and pass it to the template as part of the rendering data.

The template can then include the token inside a hidden form field.

### Adding the CSRF Token to the Form

Update the contact template:

**`views/contact.hbs`:**

```handlebars
<form action="/contact" method="POST">

    <input
        type="hidden"
        name="_csrf"
        value="{{csrfToken}}"
    >

    <label for="name">Name:</label>

    <input
        type="text"
        id="name"
        name="name"
        required
    >

    <label for="message">Message:</label>

    <textarea
        id="message"
        name="message"
        required
    ></textarea>

    <button type="submit">Submit</button>

</form>
```

The important addition is:

```html
<input
    type="hidden"
    name="_csrf"
    value="{{csrfToken}}"
>
```

The token is placed inside a hidden input, meaning that users do not need to interact with it directly.

When the form is submitted, the browser includes `_csrf` alongside the other form fields.

Because we use normal Handlebars interpolation, the token is also HTML-escaped when inserted into the page.

### Protecting the POST Route

Now we need to verify the submitted token before processing the form.

Update the POST route:

```typescript
fastify.post(
    '/contact',
    {
        preHandler: fastify.csrfProtection
    },
    async (request, reply) => {

        // Process the validated form ...

    }
)
```

We use:

```typescript
preHandler: fastify.csrfProtection
```

The `preHandler` hook runs after request parsing and validation but before the route handler.

This is important because our CSRF token is submitted inside the request body. Fastify must parse the form before the CSRF protection hook can inspect the token.

The plugin verifies the submitted token against the stored secret. If the token is missing or invalid, the request is rejected instead of reaching our application logic.

If verification succeeds, the route handler continues normally.

The plugin also supports using `preValidation` or `preHandler` when the token is supplied through the request body. ([CSRF Protection Documentation](https://github.com/fastify/csrf-protection))

## Combining JSON Schema and CSRF Protection

We now have two important mechanisms:

JSON Schema validates the structure and constraints of incoming data, while CSRF protection verifies that a browser form submission contains the expected security token.

These mechanisms solve different problems and should be used together when appropriate.

Let's combine them in our contact form.

### Updating the Contact Route

First, import and register the security plugin in `app.ts`:

```typescript
import securityPlugin from './plugins/security.js'
```

Inside `buildApp()`:

```typescript
fastify.register(viewsPlugin)
fastify.register(staticPlugin)
fastify.register(formbody)

// Register security functionality
fastify.register(securityPlugin)
```

Make sure these plugins are registered before the contact routes that depend on them.

Now update `contact.ts`.

**`src/routes/contact.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

type ContactBody = {
    name: string
    message: string
    _csrf: string
}

const contactBodySchema = {
    type: 'object',

    required: ['name', 'message', '_csrf'],

    properties: {

        name: {
            type: 'string',
            minLength: 3,
            maxLength: 25,
            pattern: '\\S'
        },

        message: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            pattern: '\\S'
        },

        _csrf: {
            type: 'string',
            minLength: 1
        }

    },

    additionalProperties: false
}

const contactRoutes: FastifyPluginAsync = async (fastify) => {

    // Display the contact form
    fastify.get<{ Querystring: { submitted?: string } }>(
        '/contact',
        async (request, reply) => {

            const csrfToken = await reply.generateCsrf()

            return reply.viewAsync('contact', {
                title: 'Contact Us',
                csrfToken,
                submitted: request.query.submitted === '1',
                values: {
                    name: '',
                    message: ''
                }
            })

        }
    )

    // Process and validate the contact form
    fastify.post<{ Body: ContactBody }>(
        '/contact',
        {
            schema: {
                body: {
                    content: {

                        'application/x-www-form-urlencoded': {
                            schema: contactBodySchema
                        },

                        'application/json': {
                            schema: contactBodySchema
                        }

                    }
                }
            },

            // Keep validation errors available to the route handler
            attachValidation: true,

            // Normalize text before schema validation
            preValidation: async (request) => {

                const body = request.body as Record<string, unknown>

                if (typeof body.name === 'string') {
                    body.name = body.name.trim()
                }

                if (typeof body.message === 'string') {
                    body.message = body.message.trim()
                }

            },

            // Verify the CSRF token before processing the form
            preHandler: fastify.csrfProtection
        },

        async (request, reply) => {

            // Display validation errors
            if (request.validationError) {

                const csrfToken = await reply.generateCsrf()

                const body = request.body

                return reply.code(400).viewAsync('contact', {

                    title: 'Contact Us',

                    csrfToken,

                    error: 'Please check your name and message.',

                    values: {
                        name: body.name ?? '',
                        message: body.message ?? ''
                    }

                })

            }

            const { name, message } = request.body

            // Process the valid submission
            fastify.log.info(
                { name },
                'Contact form submitted'
            )

            // Redirect after successful submission
            return reply.redirect('/contact?submitted=1', 303)

        }
    )

}

export default contactRoutes
```

Let's examine the important changes.

First, we define the TypeScript structure of the submitted data:

```typescript
type ContactBody = {
    name: string
    message: string
    _csrf: string
}
```

This describes the expected request body from TypeScript's perspective.

We then define the JSON Schema containing the same fields and their validation rules.

Notice that we include `_csrf` in the schema because the token is part of the submitted form data.

We also define separate content-type entries:

```typescript
content: {
    'application/x-www-form-urlencoded': {
        schema: contactBodySchema
    },
    'application/json': {
        schema: contactBodySchema
    }
}
```

This ensures that the schema is applied whether the client submits the normal HTML form encoding or a JSON request.

Next, we use:

```typescript
preValidation
```

to trim the submitted name and message before Fastify performs schema validation.

As a result, values consisting only of whitespace are rejected, and length constraints apply to the normalized text.

We then enable:

```typescript
attachValidation: true
```

Normally, Fastify automatically returns a `400 Bad Request` response when a request fails schema validation.

However, sometimes we need more control over how validation errors are displayed.

With `attachValidation: true`, Fastify attaches the validation error to `request.validationError` and allows the route handler to execute instead of immediately sending the standard validation response.

This gives us the opportunity to render the original HTML form with an appropriate error message.

Finally, we register:

```typescript
preHandler: fastify.csrfProtection
```

This verifies the CSRF token before our route processes the submitted information.

The request passes through parsing, normalization, schema validation, and CSRF verification before reaching the main route handler.

This order is important because each operation has a specific responsibility.

### Understanding Validation Errors

When schema validation fails, the route checks:

```typescript
if (request.validationError)
```

If this property exists, the submitted information does not satisfy the schema.

Instead of returning a JSON error response, we render the contact page again:

```typescript
return reply.code(400).viewAsync('contact', {
    error: 'Please check your name and message.',
    values: {
        name: body.name ?? '',
        message: body.message ?? ''
    }
})
```

This approach is particularly useful for server-rendered applications because we want users to receive feedback through the same interface they used to submit the information.

We also generate a CSRF token again before rendering the form. The plugin can reuse the existing secret associated with the browser's cookie.

Notice that we handle these validation errors inside the contact route rather than creating a global error handler that renders the contact page for every validation failure in the application.

This keeps error handling specific to the route responsible for the form.

Invalid CSRF tokens are different from invalid form fields. The CSRF hook rejects those requests before the main route handler executes, protecting the application from requests that do not contain a valid token.

### Updating the Contact Template

Our template needs to display the validation feedback and preserve previously submitted values.

**`views/contact.hbs`:**

```handlebars
<section class="contact">

    <h1>Contact Us</h1>

    {{#if submitted}}

        <p class="success">
            Your message has been submitted successfully.
        </p>

    {{/if}}

    {{#if error}}

        <p class="error">
            {{error}}
        </p>

    {{/if}}

    <form action="/contact" method="POST">

        <input
            type="hidden"
            name="_csrf"
            value="{{csrfToken}}"
        >

        <label for="name">Name:</label>

        <input
            type="text"
            id="name"
            name="name"
            value="{{values.name}}"
            required
        >

        <label for="message">Message:</label>

        <textarea
            id="message"
            name="message"
            required
        >{{values.message}}</textarea>

        <button type="submit">Submit</button>

    </form>

</section>
```

The form includes the CSRF token as a hidden field and displays the validation message when the route provides one.

We also preserve the submitted values so users can correct invalid fields without re-entering everything.

### Testing the Form

Run the application:

```bash
npm run dev
```

Visit:

```text
http://127.0.0.1:3000/contact
```

The server generates a CSRF token and includes it in the rendered form.

Now submit the form with valid information.

The browser sends the form fields and token to the server. Fastify parses the request, validates the data, verifies the CSRF token, and processes the submission.

After successful processing, the browser receives a redirect and displays the confirmation message.

Now try submitting invalid information, such as:

```text
Name: Al
Message:
```

Fastify rejects the form data through JSON Schema validation, and our route renders the form again with an error message.

Finally, you can inspect the browser's network requests to see the form submission, response status codes, and redirect.

This demonstrates how server-rendered applications can combine dynamic templates, request parsing, validation, and security mechanisms within the same Fastify architecture.

## Building the Complete Application

We have now explored how to render HTML, serve static files, display dynamic content, organize layouts, and handle secure form submissions.

Although these features are useful individually, they become more meaningful when combined into an actual application.

In the final task, we will build a small Quote Sharing application that uses everything introduced throughout this workshop.

## Task: Quote Sharing Web Application

In this project, you will build a **Quote Sharing Web Application** using Fastify, TypeScript, and Handlebars.

The application will allow visitors to submit quotes without creating accounts, browse existing quotes, and search for quotes by their original authors.

Each submission will contain the original author's name and the quote text. The person submitting the quote does not need to create an account.

To keep the project focused on the concepts introduced in this workshop, we will initially store quotes in an in-memory array rather than connecting to a database.

This means that submitted quotes will remain available while the server is running but will disappear when the application restarts.

### Project Structure

Organize the application using the structure introduced throughout the workshop:

```text
my_fastify_project/
│
├── src/
│   ├── plugins/
│   │   ├── views.ts
│   │   ├── static.ts
│   │   └── security.ts
│   │
│   ├── routes/
│   │   ├── home.ts
│   │   ├── quotes.ts
│   │   ├── search.ts
│   │   └── dashboard.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── views/
│   ├── layouts/
│   │   └── main.hbs
│   │
│   ├── partials/
│   │   ├── navbar.hbs
│   │   └── footer.hbs
│   │
│   ├── index.hbs
│   ├── share.hbs
│   ├── search.hbs
│   └── dashboard.hbs
│
├── public/
│   ├── css/
│   │   └── style.css
│   │
│   └── images/
│       └── logo.png
│
├── dist/
├── package.json
└── tsconfig.json
```

### Functional Requirements

#### 1. Homepage (`/`)

The homepage should introduce the application and display the most recently submitted quotes.

Each quote should include its original author's name and the quote text.

Use Handlebars' `{{#each}}` helper to render the collection dynamically.

If there are no quotes, display an appropriate message instead of an empty list.

The application should display the newest quotes first.

Each quote should contain a creation timestamp so that the application can determine its submission order.

#### 2. Quote Submission (`/share`)

Create a page containing an HTML form that allows visitors to submit quotes.

The form should contain two fields:

- Author name: A text input containing the original author's name.
- Quote text: A textarea containing the quote.

When the form is submitted, the backend should validate the information before adding it to the in-memory collection.

The author name must contain between 3 and 50 characters, while the quote must contain between 1 and 300 characters.

Whitespace-only submissions should be rejected.

The application should use JSON Schema for server-side validation and include CSRF protection in the form.

When a submission is successful, redirect the user using the Post/Redirect/Get pattern and display a confirmation message.

Invalid submissions should display appropriate error feedback while preserving the previously entered values.

#### 3. Search Quotes (`/search`)

Create a search page containing a form that accepts an author's name.

When the user submits the search, the application should display all quotes belonging to that author.

Searches should be case-insensitive and use exact author-name matching.

If matching quotes exist, display them using a Handlebars loop.

If no quotes are found, display:

```text
No quotes found for author.
```

#### 4. Dashboard (`/dashboard`)

Create a simple dashboard displaying application statistics.

It should include:

- Total number of submitted quotes.
- Number of distinct quote authors.
- Number of quotes submitted during the current server run.

You can use the same in-memory collection to calculate these values.

The dashboard is informational and does not require authentication.

#### 5. Reusable Layouts and Partials

Create a shared layout:

```text
views/layouts/main.hbs
```

It should contain the main HTML structure, including the page title, stylesheet reference, navigation bar, and footer.

Create a navigation partial:

```text
views/partials/navbar.hbs
```

The navigation bar should contain links to:

```text
Home
Share Quote
Search
Dashboard
```

Create another partial:

```text
views/partials/footer.hbs
```

All pages should use the shared layout rather than repeating their HTML structure.

#### 6. Static Assets

Create a stylesheet:

```text
public/css/style.css
```

Use it to provide consistent styling across the application.

Also include a logo:

```text
public/images/logo.png
```

Display the logo in the application's header.

All static resources must be served through Fastify's static file plugin.

#### 7. Security and Validation

The application must validate submitted quote information on the server using JSON Schema.

The quote submission form must include a CSRF token, and the corresponding POST route must verify it before processing the submission.

Use normal Handlebars expressions when displaying author names and quote text so that submitted content is HTML-escaped.

Never render untrusted quote content using triple-brace expressions.

### Additional Requirements

The application should maintain a clear separation between route logic and presentation.

Route handlers should prepare the data and determine which template to render, while Handlebars should focus on displaying that information.

Organize each major feature into its own route plugin, and keep shared functionality inside the appropriate plugins.

The objective is to combine the concepts introduced throughout this workshop into a small, functional server-rendered application.

We will later extend this project by introducing persistent database storage, allowing submitted quotes to remain available after the server restarts.

## Conclusion

In this workshop, we extended our understanding of backend development by learning how Fastify can generate complete HTML pages instead of responding only with plain text or JSON.

We started by integrating Handlebars through `@fastify/view` and configuring Fastify to render HTML templates. We then introduced static file serving, allowing our pages to use external stylesheets and images.

As the application developed, we explored dynamic template rendering, conditional expressions, loops, and reusable layouts. We also examined HTML escaping and why user-generated content must be handled carefully to prevent XSS vulnerabilities.

Finally, we moved from displaying information to receiving it. We learned how HTML forms submit data, how Fastify parses URL-encoded requests, and how to validate submissions manually and through JSON Schema. We also introduced CSRF protection to help secure browser-based form submissions.

The result is a foundation for building server-rendered web applications with Fastify.

In the next stage of our backend development journey, we will introduce persistent database storage and CRUD operations. This will allow us to replace our temporary in-memory collections with actual database records and build applications that retain their information across server restarts.

## References

- [Node.js Documentation](https://nodejs.org/docs/latest/api/)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Fastify Plugin Architecture](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [Fastify Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify TypeScript Reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [@fastify/view Documentation](https://github.com/fastify/point-of-view)
- [@fastify/static Documentation](https://github.com/fastify/fastify-static)
- [@fastify/formbody Documentation](https://github.com/fastify/fastify-formbody)
- [@fastify/cookie Documentation](https://github.com/fastify/fastify-cookie)
- [@fastify/csrf-protection Documentation](https://github.com/fastify/csrf-protection)
- [Handlebars Documentation](https://handlebarsjs.com/guide/)
- [Handlebars Expressions and HTML Escaping](https://handlebarsjs.com/guide/expressions.html)
- [MDN: HTML Forms](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms)
- [MDN: HTTP Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
- [OWASP: Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP: Cross-Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)