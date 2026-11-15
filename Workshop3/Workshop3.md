# Workshop 3: Persistent Data Storage with PostgreSQL and Prisma

## Objectives

In this workshop, we will learn how to connect our Fastify application to a PostgreSQL database and manage persistent data using Prisma ORM.

We will learn how to:

- Understand persistent data storage and why applications need databases.
- Understand relational databases and the fundamental concepts of PostgreSQL.
- Understand Object-Relational Mapping (ORM) and the role of Prisma.
- Configure PostgreSQL and connect it to our Node.js application.
- Define database models using the Prisma Schema Language.
- Understand database migrations and schema management.
- Configure Prisma Client with Fastify using a reusable plugin.
- Perform Create, Read, Update, and Delete (CRUD) operations.
- Query, filter, sort, and count database records.
- Replace temporary in-memory storage with persistent database storage.
- Integrate PostgreSQL and Prisma into our Quote Sharing application.

## Introduction to Persistent Data Storage

In our previous workshop, we built a Quote Sharing application that allowed visitors to submit quotes, browse existing ones, and search for quotes by their original authors.

However, we used an in-memory array to store the submitted information.

For example:

```typescript
const quotes = [
    {
        id: 1,
        author: 'Albert Einstein',
        text: 'Imagination is more important than knowledge.'
    },
    {
        id: 2,
        author: 'Marcus Aurelius',
        text: 'The happiness of your life depends upon the quality of your thoughts.'
    }
]
```

This approach is perfectly acceptable for demonstrating how routes, forms, and templates work together. However, it has an important limitation: **the information exists only while the application is running.**

Every time we restart our server, the array is recreated, and all previously submitted quotes are lost.

This is not suitable for real applications. Imagine building an online store where every product, customer, and order disappears whenever the server restarts.

To solve this problem, applications use persistent storage.

**Persistent data storage** is the process of saving information in a storage system that retains it beyond the lifetime of the application.

Instead of keeping information only in the application's memory, we store it in a database. The backend can then retrieve, insert, update, and delete records whenever necessary.

The communication can be represented as follows:

```text
             CLIENT
                |
                | HTTP Request
                |
                v
             FASTIFY
           (Backend App)
                |
                v
           Route Handler
                |
                v
            PRISMA ORM
                |
                v
           PostgreSQL
            DATABASE
                |
                v
          Query Results
                |
                v
             PRISMA
                |
                v
           Route Handler
                |
                v
         HTML / JSON Response
                |
                v
             CLIENT
```

Notice that our application no longer needs to maintain its own collection of records in memory. Instead, it communicates with the database whenever it needs to access or modify information.

This is the foundation of persistent backend applications.

## Understanding Databases and PostgreSQL

Before connecting our application to a database, we need to understand what a database is and how it organizes information.

A **database** is an organized collection of data that can be stored, retrieved, and modified efficiently.

Applications use databases because they need a reliable way to manage information that must remain available across different requests and application restarts.

There are different types of databases, but one of the most widely used categories is relational databases.

### Relational Databases

A relational database organizes information into tables, where each table represents a particular type of entity.

For example, an online store might have separate tables for users, products, and orders.

Each table contains columns that describe the properties of the information and rows that represent individual records.

Consider a table containing information about quotes:

| id | author | text |
|---|---|---|
| 1 | Albert Einstein | Imagination is more important than knowledge. |
| 2 | Marcus Aurelius | The happiness of your life depends upon the quality of your thoughts. |
| 3 | Seneca | Difficulties strengthen the mind. |

Here, the table is called `Quote`, and each row represents an individual quote.

The columns describe the information stored in each record:

- `id`: Identifies the quote.
- `author`: Stores the original author's name.
- `text`: Stores the quote itself.

Unlike an in-memory array, the records in a database are stored persistently and remain available after the application stops.

### Primary Keys

When a table contains many records, we need a reliable way to identify each one.

A **primary key** is a column, or combination of columns, that uniquely identifies a record within a table.

For example, our quotes table uses the `id` column:

| id | author | text |
|---|---|---|
| 1 | Albert Einstein | Imagination is more important than knowledge. |
| 2 | Marcus Aurelius | The happiness of your life depends upon the quality of your thoughts. |
| 3 | Seneca | Difficulties strengthen the mind. |

Each record has a unique identifier, allowing us to retrieve or modify a specific quote without relying on its text or author.

Primary keys are important because multiple records can contain identical information.

For example, two different quotes might have the same author, but they must still be distinguishable.

### Constraints and Data Integrity

Databases also provide mechanisms for enforcing rules about the information they store.

These rules are called **constraints**.

For example, we might want to ensure that:

- Every quote has an identifier.
- The author field cannot be empty.
- The quote text cannot be missing.
- An email address is unique within a users table.

These rules help protect the integrity of our data.

Although we can validate information inside our backend application, database constraints provide another layer of protection. They ensure that invalid records cannot be inserted into the database even when information comes from different parts of the system.

### PostgreSQL

For this workshop, we will use **PostgreSQL**, an open-source relational database management system.

PostgreSQL stores information in tables and provides a powerful system for managing structured data.

It supports SQL (Structured Query Language), which allows us to create tables, retrieve records, insert information, update existing data, and perform many other database operations.

For example, the following SQL statement retrieves all quotes:

```sql
SELECT * FROM "Quote";
```

To insert a new record:

```sql
INSERT INTO "Quote" (author, text)
VALUES (
    'Albert Einstein',
    'Imagination is more important than knowledge.'
);
```

And to retrieve a specific quote:

```sql
SELECT *
FROM "Quote"
WHERE id = 1;
```

SQL is the language used to communicate with relational databases.

However, writing SQL statements manually throughout a large application can become repetitive and difficult to maintain.

This is where database abstraction tools become useful.

## Introduction to ORM and Prisma

When building a backend application, we frequently need to translate information between two different representations.

In our TypeScript application, we work with objects and properties:

```typescript
const quote = {
    author: 'Albert Einstein',
    text: 'Imagination is more important than knowledge.'
}
```

In PostgreSQL, the same information is represented as a row inside a table.

The application needs a way to translate between these representations and execute the corresponding database operations.

One approach is to write SQL queries manually. Another approach is to use an **Object-Relational Mapping (ORM)** tool.

### What is an ORM?

An Object-Relational Mapper is a tool that allows developers to interact with a relational database through programming language objects and methods rather than writing SQL statements for every operation.

For example, instead of manually writing:

```sql
SELECT * FROM "Quote";
```

we can use a TypeScript method:

```typescript
const quotes = await prisma.quote.findMany()
```

The ORM translates the operation into the appropriate database query and returns the results as JavaScript objects.

This allows us to work with database records using familiar programming language structures.

However, an ORM does not eliminate SQL or replace the database. PostgreSQL still performs the actual database operations. The ORM simply provides an abstraction that makes database interactions easier to express and maintain.

### Prisma ORM

**Prisma** is a modern ORM designed for TypeScript and Node.js applications.

It provides tools for defining database models, generating type-safe database queries, managing schema changes, and inspecting stored information.

Prisma consists of three important components:

**1. Prisma Schema**

The Prisma Schema is where we describe the structure of our database.

We define models and their properties, specify data types, and establish relationships between different models.

Prisma uses this information to understand how our application data should be structured.

**2. Prisma Client**

Prisma Client is an automatically generated, type-safe database client based on our schema.

It provides methods for creating, retrieving, updating, and deleting database records.

For example:

```typescript
const quotes = await prisma.quote.findMany()
```

The available methods and their accepted properties are generated from our database models.

This provides autocomplete and compile-time type checking when interacting with database records.

**3. Prisma Migrate**

Prisma Migrate manages changes to the database structure.

As our application develops, we might need to add new tables, introduce columns, or modify existing models.

Instead of manually changing the database every time, Prisma Migrate generates migration files that describe these changes and applies them to PostgreSQL.

This allows us to keep our database structure synchronized with the application's data models.

Prisma also provides **Prisma Studio**, a graphical interface that allows us to inspect and manage database records.

These components work together to provide a complete workflow for managing application data.

### Understanding the Relationship Between Fastify, Prisma, and PostgreSQL

Now that we understand the responsibilities of each technology, let's connect them.

Fastify handles incoming HTTP requests and executes our application logic. When a route needs information from the database, it uses Prisma Client to perform the required operation.

Prisma translates that operation into database queries and communicates with PostgreSQL through its database driver.

PostgreSQL executes the query and returns the result, which Prisma converts into a JavaScript object that our application can use.

The relationship can be represented as follows:

```text
           CLIENT
              |
              v
           FASTIFY
        (Web Framework)
              |
              v
         ROUTE HANDLER
              |
              v
          PRISMA ORM
         (Prisma Client)
              |
              v
      POSTGRESQL DRIVER
              |
              v
          POSTGRESQL
           DATABASE
```

Our application does not need to construct SQL statements manually for every operation. Instead, we use Prisma Client to interact with the database through a type-safe interface.

In this workshop, we will use this architecture to replace the in-memory storage of our Quote Sharing application with a PostgreSQL database.

## Setting Up PostgreSQL

Before connecting Prisma to our application, we need a PostgreSQL database.

Make sure PostgreSQL is installed and running on your system.

You can verify the installation using:

```bash
psql --version
```

If PostgreSQL is already installed, we can create a dedicated database for our project.

### Creating the Database and User

Open your terminal and connect to PostgreSQL using the administrative account.

On Ubuntu, you can use:

```bash
sudo -u postgres psql
```

This opens the PostgreSQL interactive terminal.

Create a dedicated database user:

```sql
CREATE ROLE quote_app_user
WITH LOGIN PASSWORD 'replace_with_a_strong_password';
```

Next, create a database and assign ownership to this user:

```sql
CREATE DATABASE quote_sharing
OWNER quote_app_user;
```

We now have a database named `quote_sharing` and a user named `quote_app_user`.

To leave the PostgreSQL terminal, execute:

```sql
\q
```

The important idea is that our application should connect using its own database account rather than relying on the PostgreSQL administrative account.

This gives the application a separate identity and allows us to control its database permissions.

For this introductory setup, the database user owns the project database. In production environments, database permissions should follow the principle of least privilege.

### Understanding the Database Connection String

To communicate with PostgreSQL, our application needs connection information.

This information is commonly provided through a **database connection string**.

A PostgreSQL connection string follows this structure:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

Let's understand its components:

- `USER`: The PostgreSQL username.
- `PASSWORD`: The password associated with that user.
- `HOST`: The address of the PostgreSQL server.
- `PORT`: The port on which PostgreSQL listens, usually `5432`.
- `DATABASE`: The name of the database we want to access.
- `SCHEMA`: The PostgreSQL schema containing our tables, usually `public`.

For our project, the connection string will look similar to:

```text
postgresql://quote_app_user:replace_with_a_strong_password@localhost:5432/quote_sharing?schema=public
```

We will store this information in an environment variable rather than writing database credentials directly inside our application code.

### Configuring Environment Variables

Create a `.env` file in the project's root directory:

**`.env`:**

```env
DATABASE_URL="postgresql://quote_app_user:replace_with_a_strong_password@localhost:5432/quote_sharing?schema=public"
```

Replace the credentials with the actual values created for your PostgreSQL database.

It is important to remember that the connection string contains sensitive information. We should never commit real database credentials to a public Git repository.

Make sure the root `.gitignore` includes:

```gitignore
.env
```

We can also create a `.env.example` file containing a placeholder connection string so that other developers understand which environment variables are required.

One detail worth remembering is that special characters in database passwords must be URL-encoded when included in a connection string.

With PostgreSQL configured, we can now integrate Prisma into our existing Fastify project.

## Setting Up Prisma

We will continue using the project created in our previous workshops.

Therefore, we will keep our existing TypeScript configuration, ECMAScript Modules, and application structure.

For this workshop, we will use Prisma ORM 7 with the PostgreSQL driver adapter. The examples follow the Prisma 7 stable API and its ESM-first generated client.

### Installing Prisma Dependencies

Navigate to your project directory and install the required packages.

First, install Prisma CLI and the PostgreSQL type definitions as development dependencies:

```bash
npm install -D prisma@7 @types/pg
```

Next, install the packages required by our application:

```bash
npm install @prisma/client@7 @prisma/adapter-pg@7 pg dotenv
```

Let's understand their responsibilities.

**`prisma`** provides the command-line interface used to initialize Prisma, generate migrations, and manage the database schema.

**`@prisma/client`** provides the Prisma Client runtime package used by our application.

**`@prisma/adapter-pg`** provides the driver adapter that connects Prisma Client to PostgreSQL through the `pg` driver.

**`pg`** is the Node.js PostgreSQL driver, also known as `node-postgres`.

**`@types/pg`** provides TypeScript definitions for the PostgreSQL driver.

Finally, **`dotenv`** allows our Node.js application and Prisma configuration to load environment variables from the `.env` file.

Prisma 7 uses driver adapters for database connections. This means we explicitly configure the PostgreSQL adapter when creating the Prisma Client instance.

### Initializing Prisma

After installing the dependencies, initialize Prisma using:

```bash
npx prisma init --datasource-provider postgresql --output ../src/generated/prisma
```

This command initializes the Prisma environment inside our project.

It creates a `prisma` directory containing the Prisma schema, generates a configuration file, and prepares the environment variables file.

We specify:

```text
--datasource-provider postgresql
```

to indicate that PostgreSQL is our database provider.

We also specify:

```text
--output ../src/generated/prisma
```

to tell Prisma where to generate our client.

We place the generated client inside `src` because our previous TypeScript configuration uses `src` as its root directory. This keeps the generated files within the existing TypeScript project structure.

After initialization, our project will look similar to:

```text
my_fastify_project/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── generated/
│   │   └── prisma/
│   │
│   ├── plugins/
│   ├── routes/
│   ├── app.ts
│   └── server.ts
│
├── prisma7.config.ts
├── .env
├── package.json
└── tsconfig.json
```

Depending on the Prisma 7 CLI version, the configuration file may be named `prisma7.config.ts` or `prisma.config.ts`. Prisma 7.10 and later use the `prisma7.config.ts` name to distinguish it from the Prisma 8 configuration. Use the configuration file generated by your installed CLI rather than creating both.

### Configuring Prisma

Open the generated configuration file.

**`prisma7.config.ts`:**

```typescript
import 'dotenv/config'

import { defineConfig, env } from 'prisma/config'

export default defineConfig({

    schema: 'prisma/schema.prisma',

    migrations: {
        path: 'prisma/migrations'
    },

    datasource: {
        url: env('DATABASE_URL')
    }

})
```

This file tells Prisma where to find our schema, where to store migration files, and how to connect to the database when executing database-management commands.

The `dotenv/config` import loads the environment variables from `.env`.

We use:

```typescript
env('DATABASE_URL')
```

to retrieve the database connection string.

This keeps the connection credentials outside the Prisma schema and allows us to use different connection strings in development and production.

### Understanding the Prisma Schema

Now open:

```text
prisma/schema.prisma
```

This file is where we define the structure of our database.

The initialization command creates the basic configuration, but we need to adapt it to our project.

Replace its contents with:

**`prisma/schema.prisma`:**

```prisma
generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
}

datasource db {
    provider = "postgresql"
}
```

Let's understand the configuration.

The `generator` block defines how Prisma generates the client.

We use:

```prisma
provider = "prisma-client"
```

to select the ESM-first Prisma Client generator.

The `output` property specifies where the generated client should be placed.

The `datasource` block describes the database provider.

Here, we specify PostgreSQL:

```prisma
provider = "postgresql"
```

Notice that we do not define the connection URL inside this block. In Prisma 7, the connection URL used by the CLI is configured in the separate Prisma configuration file.

This separates database connection configuration from the data model itself.

## Defining Database Models

Now that Prisma is configured, we can define the structure of our application data.

In Prisma, we describe database entities using **models**.

A model represents a database table, while its properties represent the columns of that table.

For example, our Quote Sharing application needs to store the original author's name and the quote text.

We will also need an identifier and timestamps to keep track of when records were created and modified.

### Creating the Quote Model

Add the following model to `schema.prisma`:

```prisma
model Quote {

    id        Int      @id @default(autoincrement())

    author    String   @db.VarChar(50)

    text      String   @db.VarChar(300)

    createdAt DateTime @default(now())

    updatedAt DateTime @updatedAt

    @@index([author])
    @@index([createdAt])

}
```

Let's understand how this model is defined.

**The ID field**

```prisma
id Int @id @default(autoincrement())
```

The `id` property represents the primary key of our table.

We use the `Int` type because the identifier will be an integer.

The `@id` attribute tells Prisma that this field is the primary key, while `@default(autoincrement())` instructs PostgreSQL to generate an incrementing identifier whenever a new quote is inserted.

This means that we don't need to generate IDs manually inside our application.

**The Author field**

```prisma
author String @db.VarChar(50)
```

This field stores the original author's name.

The `String` type represents textual information, while `@db.VarChar(50)` specifies that PostgreSQL should use a variable-length character column with a maximum length of 50 characters.

**The Text field**

```prisma
text String @db.VarChar(300)
```

This field contains the quote itself.

We use `VarChar(300)` to limit the maximum length of the stored text to 300 characters.

**The Created At field**

```prisma
createdAt DateTime @default(now())
```

This field stores when the quote was created.

The `@default(now())` attribute automatically assigns the current timestamp when a new record is inserted.

**The Updated At field**

```prisma
updatedAt DateTime @updatedAt
```

This field tracks when the record was last modified.

Prisma automatically updates this value whenever the record is changed through Prisma Client.

Finally, we define two indexes:

```prisma
@@index([author])
@@index([createdAt])
```

An index is a database structure that helps PostgreSQL locate records more efficiently when performing certain queries.

Since our application frequently searches for quotes by author and orders them by creation date, these indexes are useful for those access patterns.

Indexes also introduce some storage and write overhead, so we should create them based on actual query requirements rather than indexing every column.

### Understanding Prisma Attributes

You might have noticed that we used expressions such as:

```prisma
@id
@default()
@updatedAt
@db.VarChar(50)
```

These are called Prisma attributes.

They allow us to describe additional behavior and constraints associated with models and their fields.

Some attributes apply directly to fields, while others apply to entire models.

For example:

- `@id` defines a primary key.
- `@unique` enforces uniqueness.
- `@default()` defines a default value.
- `@updatedAt` automatically updates a timestamp through Prisma Client.
- `@db.VarChar(50)` maps a field to a specific PostgreSQL column type.
- `@@index()` defines a database index.
- `@@map()` allows us to map a Prisma model to a differently named database table.

These attributes make it possible to describe important database behavior directly inside our schema.

### Understanding the Generated Database Structure

Our Prisma model is not the database table itself.

It is a description of the table that Prisma will use to generate the corresponding database structure.

For example, our Quote model describes a table similar to:

```sql
CREATE TABLE "Quote" (
    id SERIAL PRIMARY KEY,
    author VARCHAR(50) NOT NULL,
    text VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

Prisma generates the appropriate SQL when we create a migration.

This is an important distinction:

**The Prisma schema describes the intended database structure, while PostgreSQL stores the actual data.**

We will now use Prisma Migrate to create the corresponding table.

## Understanding Database Migrations

As our application develops, its data requirements will change.

For example, we might initially store only the author's name and quote text. Later, we may want to add categories, approval status, or additional information.

Whenever the database structure changes, we need a controlled way to apply those changes.

This is where **database migrations** become useful.

A migration is a versioned set of database changes that describes how the database structure should evolve.

Instead of manually creating or modifying tables, we describe the desired structure through our Prisma schema and let Prisma Migrate generate the necessary SQL changes.

This provides a history of database modifications that can be tracked using Git.

### Creating Our First Migration

After defining the Quote model, make sure your PostgreSQL database exists and your `.env` file contains the correct connection string.

Now run:

```bash
npx prisma migrate dev --name init
```

The `migrate dev` command compares our Prisma schema with the current migration history and database state.

It then generates a migration containing the SQL required to create the Quote table and applies that migration to our development database.

The `--name init` argument gives the migration a descriptive name.

After execution, our project should contain:

```text
prisma/
│
├── migrations/
│   ├── 20261115000000_init/
│   │   └── migration.sql
│   │
│   └── migration_lock.toml
│
└── schema.prisma
```

The timestamp in the directory name is generated by Prisma.

The `migration.sql` file contains the SQL statements used to modify the database.

We should commit migration files to Git because they represent the history of database structure changes.

### Generating Prisma Client

After creating the migration, we need to generate Prisma Client.

Run:

```bash
npx prisma generate
```

This command reads our Prisma schema and generates a TypeScript client based on the models we defined.

The generated client provides methods for querying our database and types that describe the available models and operations.

It will be placed inside:

```text
src/generated/prisma/
```

An important detail in Prisma 7 is that we should run `prisma generate` explicitly after changing the schema. The migration command should not be relied upon to generate the client automatically.

### Understanding the Migration Workflow

We now have two important commands:

```bash
npx prisma migrate dev --name init
```

Creates and applies a migration based on changes to our Prisma schema.

```bash
npx prisma generate
```

Generates the Prisma Client from the current schema.

Whenever we modify the database models, we repeat this workflow.

For example, suppose we decide to add a category to our quotes:

```prisma
category String?
```

We update the model, then run:

```bash
npx prisma migrate dev --name add_quote_category
npx prisma generate
```

Prisma creates another migration that modifies the existing table without requiring us to recreate the entire database.

This is important because real applications evolve over time, and we need a reliable way to manage database structure changes without losing existing information.

### Development vs Production Migrations

There is an important distinction between development and production environments.

During development, we use:

```bash
npx prisma migrate dev
```

This command is designed for developing and testing schema changes.

In production, we use:

```bash
npx prisma migrate deploy
```

This command applies pending migrations that have already been created and committed to the project.

We should never use `migrate dev` as the production migration command. Production environments should apply the reviewed migration history rather than generate new migrations automatically.

## Connecting Prisma to Fastify

We have now configured PostgreSQL, defined our Quote model, and created the corresponding database table.

The next step is to make Prisma available inside our Fastify application.

We could create a new Prisma Client instance in every route, but that would be a poor design.

Instead, we should create a single shared instance and expose it through a Fastify plugin.

This follows the same architectural approach we used in the previous workshops for templates, static files, and security functionality.

### Creating the Prisma Plugin

First, create a new file:

```bash
touch src/plugins/prisma.ts
```

Inside this file:

**`src/plugins/prisma.ts`:**

```typescript
import 'dotenv/config'

import fp from 'fastify-plugin'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'

import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = async (fastify) => {

    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        throw new Error('DATABASE_URL is not configured')
    }

    // Create the PostgreSQL driver adapter
    const adapter = new PrismaPg({
        connectionString
    })

    // Create a single Prisma Client instance
    const prisma = new PrismaClient({
        adapter
    })

    // Establish the database connection
    await prisma.$connect()

    // Make Prisma available throughout the application
    fastify.decorate('prisma', prisma)

    // Close the database connection when Fastify shuts down
    fastify.addHook('onClose', async () => {
        await prisma.$disconnect()
    })

}

export default fp(prismaPlugin)
```

Let's understand how this plugin works.

First, we import `dotenv/config` to load the environment variables from our `.env` file.

Next, we create a PostgreSQL adapter:

```typescript
const adapter = new PrismaPg({
    connectionString
})
```

The adapter connects Prisma Client to PostgreSQL using the `pg` driver.

We then create a Prisma Client instance:

```typescript
const prisma = new PrismaClient({
    adapter
})
```

This client provides the methods we will use throughout the application to access and modify database records.

We establish the connection using:

```typescript
await prisma.$connect()
```

This ensures that the database connection is initialized when the plugin is loaded.

We then use:

```typescript
fastify.decorate('prisma', prisma)
```

to attach the Prisma instance to the Fastify application.

This makes it possible to access Prisma from our routes through:

```typescript
fastify.prisma
```

Finally, we register an `onClose` hook that disconnects Prisma when the Fastify application shuts down.

This is important because database connections consume resources. We should release them when the application is no longer running.

Using a single shared client also avoids unnecessarily creating multiple database connection pools.

### Extending Fastify's Type Definitions

There is one TypeScript detail we need to handle.

Fastify does not automatically know that we added a property called `prisma` to its instance.

Although:

```typescript
fastify.decorate('prisma', prisma)
```

adds the property at runtime, TypeScript also needs to understand that this property exists.

We can achieve this through **module augmentation**.

Create a directory named `types` inside `src`, then create:

```bash
mkdir -p src/types
touch src/types/fastify.d.ts
```

**`src/types/fastify.d.ts`:**

```typescript
import type { PrismaClient } from '../generated/prisma/client.js'

declare module 'fastify' {

    interface FastifyInstance {
        prisma: PrismaClient
    }

}
```

Here, we extend Fastify's existing `FastifyInstance` interface by adding the `prisma` property.

We use `PrismaClient` as its type, allowing TypeScript to understand the available database methods.

Now, when we access:

```typescript
fastify.prisma
```

TypeScript recognizes the property and provides autocomplete for our database operations.

This is useful because we preserve type safety even when extending Fastify with our own application functionality.

### Registering the Prisma Plugin

Now we update `app.ts`.

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'
import formbody from '@fastify/formbody'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'
import securityPlugin from './plugins/security.js'
import prismaPlugin from './plugins/prisma.js'

import homeRoutes from './routes/home.js'
import quoteRoutes from './routes/quotes.js'

export function buildApp() {

    const fastify = Fastify({
        logger: true
    })

    // Configure views
    fastify.register(viewsPlugin)

    // Serve static files
    fastify.register(staticPlugin)

    // Parse HTML form submissions
    fastify.register(formbody)

    // Configure CSRF protection
    fastify.register(securityPlugin)

    // Connect to PostgreSQL
    fastify.register(prismaPlugin)

    // Register application routes
    fastify.register(homeRoutes)
    fastify.register(quoteRoutes)

    return fastify
}
```

Notice that the Prisma plugin is registered before the route plugins that depend on it.

This ensures that the database functionality is available when those routes are initialized.

We have now integrated PostgreSQL into our existing Fastify architecture without placing database configuration directly inside our route handlers.

## Working with Prisma Client

Now that Prisma is available through Fastify, we can start performing database operations.

Prisma Client provides a collection of methods that correspond to the common operations performed on database records.

These operations are commonly grouped under the term **CRUD**:

- Create: Insert new records.
- Read: Retrieve existing records.
- Update: Modify existing records.
- Delete: Remove records.

Let's understand each operation using our Quote model.

### Creating Records

The first operation is creating a new record in the database.

Prisma provides the `create()` method for this purpose.

For example:

```typescript
const quote = await fastify.prisma.quote.create({

    data: {
        author: 'Albert Einstein',
        text: 'Imagination is more important than knowledge.'
    }

})
```

Here, we use:

```typescript
fastify.prisma.quote.create()
```

The `quote` property represents our Quote model, while `create()` inserts a new record.

Inside `data`, we provide the values that should be stored.

Notice that we do not provide an ID or creation timestamp.

PostgreSQL generates the ID automatically, while the `createdAt` field receives its default value from the database.

The `updatedAt` field is also managed automatically by Prisma.

The method returns the newly created record as a JavaScript object.

We can use this returned object to display confirmation information or perform additional application logic.

### Reading Records

After storing information, we need to retrieve it.

Prisma provides several methods for querying records.

**Retrieving all records**

We can use `findMany()` to retrieve multiple records:

```typescript
const quotes = await fastify.prisma.quote.findMany()
```

This returns an array containing all quotes.

If there are no records, the result is an empty array.

**Retrieving a specific record**

If we already know the ID of a quote, we can use `findUnique()`:

```typescript
const quote = await fastify.prisma.quote.findUnique({

    where: {
        id: 1
    }

})
```

The `where` option specifies the condition used to identify the record.

Because `id` is the primary key, Prisma can use it to retrieve a unique quote.

If the record exists, Prisma returns the corresponding object. Otherwise, it returns `null`.

This is useful when building pages that display or modify a specific record.

### Updating Records

Sometimes we need to modify information that is already stored.

For example, a user might want to correct the text of a quote or change its original author name.

Prisma provides the `update()` method:

```typescript
const updatedQuote = await fastify.prisma.quote.update({

    where: {
        id: 1
    },

    data: {
        text: 'A new version of the quote.'
    }

})
```

The `where` property identifies the record we want to update.

The `data` property contains the fields that should be modified.

Notice that we only provide the `text` field. The other properties remain unchanged.

Prisma returns the updated record after the operation succeeds.

If the record does not exist, Prisma throws a known request error with code `P2025`.

Therefore, our application should handle that case and return an appropriate response rather than exposing an internal database error.

### Deleting Records

The final CRUD operation is deleting an existing record.

We use the `delete()` method:

```typescript
const deletedQuote = await fastify.prisma.quote.delete({

    where: {
        id: 1
    }

})
```

The `where` property identifies the record to remove.

If the operation succeeds, Prisma returns the deleted record.

If the requested record does not exist, Prisma throws an error with code `P2025`.

Deletion is an irreversible operation unless we have an appropriate backup or recovery mechanism. Real applications should therefore perform additional checks and authorization before allowing users to delete important records.

### Summary of CRUD Operations

The four operations can be represented as follows:

| Operation | Prisma Method | Purpose |
|---|---|---|
| Create | `create()` | Insert a new record. |
| Read | `findMany()`, `findUnique()` | Retrieve records. |
| Update | `update()` | Modify an existing record. |
| Delete | `delete()` | Remove an existing record. |

These methods form the foundation of database-backed applications.

Prisma also provides additional methods for handling multiple records, combining operations, and performing more advanced queries.

## Querying, Filtering, and Sorting Records

Retrieving every record is not always what an application needs.

For example, our Quote Sharing application should display the most recent quotes first rather than returning records in an arbitrary order.

We might also want to search for quotes belonging to a particular author or limit the number of results displayed on a page.

Prisma provides query options that allow us to control which records are retrieved and how they are returned.

### Filtering Records

The `where` option allows us to retrieve records that satisfy specific conditions.

For example, to retrieve quotes belonging to Albert Einstein:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    where: {
        author: 'Albert Einstein'
    }

})
```

We can also use filtering operators for more complex conditions.

For example:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    where: {
        author: {
            contains: 'Einstein'
        }
    }

})
```

This retrieves quotes whose author field contains the specified text.

For PostgreSQL, Prisma also supports case-insensitive filtering through:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    where: {
        author: {
            equals: 'albert einstein',
            mode: 'insensitive'
        }
    }

})
```

This is particularly useful for search functionality because it allows us to find matching records without requiring the user to enter the exact capitalization used when the record was stored.

### Sorting Records

Sometimes we need to control the order in which records are returned.

Prisma provides the `orderBy` option.

For example, to retrieve quotes from newest to oldest:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    orderBy: {
        createdAt: 'desc'
    }

})
```

The `desc` value means descending order, while `asc` means ascending order.

Because the `createdAt` field stores when each quote was submitted, descending order places the newest records first.

We can also combine filtering and sorting:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    where: {
        author: {
            equals: 'Albert Einstein',
            mode: 'insensitive'
        }
    },

    orderBy: {
        createdAt: 'desc'
    }

})
```

This retrieves matching quotes and orders them from newest to oldest.

### Limiting Results

As an application grows, retrieving every record can become inefficient.

Imagine a website containing thousands of quotes. Displaying all of them on the homepage would consume unnecessary resources and make the page difficult to navigate.

Prisma provides the `take` option to limit the number of returned records.

For example:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    orderBy: {
        createdAt: 'desc'
    },

    take: 10

})
```

This retrieves only the ten most recent quotes.

Prisma also supports pagination through `skip` and `take`, allowing us to retrieve specific sections of a larger collection.

For example:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    orderBy: {
        createdAt: 'desc'
    },

    skip: 10,
    take: 10

})
```

Here, we skip the first ten records and retrieve the next ten.

This is called offset pagination. It is convenient for numbered pages, while cursor-based pagination is often more suitable for large datasets and continuously growing feeds.

## Integrating PostgreSQL into the Quote Sharing Application

Now that we understand how Prisma Client works, we can apply it to the application we created in Workshop 2.

Previously, our Quote Sharing application stored information inside an in-memory array.

We will now replace that array with PostgreSQL so that submitted quotes remain available even after the server restarts.

### Understanding the Changes

Previously, our application might have contained:

```typescript
const quotes = [
    {
        id: 1,
        author: 'Albert Einstein',
        text: 'Imagination is more important than knowledge.'
    }
]
```

Whenever someone submitted a new quote, we added it to this array.

Now, instead of modifying an in-memory collection, we will use:

```typescript
await fastify.prisma.quote.create({
    data: {
        author,
        text
    }
})
```

The record is stored in PostgreSQL and remains available to the application in future requests.

Similarly, when displaying quotes, we will retrieve them using:

```typescript
const quotes = await fastify.prisma.quote.findMany()
```

This is the main architectural change in this workshop.

Our routes and Handlebars templates remain responsible for handling requests and rendering pages. The difference is that database operations are now performed through Prisma rather than manipulating temporary arrays.

### Creating the Quotes Route Plugin

Create a file named `quotes.ts` inside `src/routes`:

```bash
touch src/routes/quotes.ts
```

Inside this file, we will implement the main functionality of our Quote Sharing application.

**`src/routes/quotes.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

type QuoteBody = {
    author: string
    text: string
    _csrf: string
}

const quoteSchema = {

    type: 'object',

    required: ['author', 'text', '_csrf'],

    properties: {

        author: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '\\S'
        },

        text: {
            type: 'string',
            minLength: 1,
            maxLength: 300,
            pattern: '\\S'
        },

        _csrf: {
            type: 'string',
            minLength: 1
        }

    },

    additionalProperties: false

} as const

const quoteRoutes: FastifyPluginAsync = async (fastify) => {

    // Homepage: Display recent quotes
    fastify.get('/', async (request, reply) => {

        const quotes = await fastify.prisma.quote.findMany({

            orderBy: {
                createdAt: 'desc'
            },

            take: 10

        })

        return reply.viewAsync('index', {
            title: 'Quote Sharing',
            quotes
        })

    })

    // Display the quote submission form
    fastify.get<{ Querystring: { created?: string } }>(
        '/share',
        async (request, reply) => {

            const csrfToken = await reply.generateCsrf()

            return reply.viewAsync('share', {

                title: 'Share a Quote',

                csrfToken,

                submitted: request.query.created === '1',

                values: {
                    author: '',
                    text: ''
                }

            })

        }
    )

    // Process a submitted quote
    fastify.post<{ Body: QuoteBody }>(
        '/share',
        {
            schema: {
                body: {
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: quoteSchema
                        }
                    }
                }
            },

            attachValidation: true,

            preValidation: async (request) => {

                const body = request.body as Record<string, unknown>

                if (typeof body.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body.text === 'string') {
                    body.text = body.text.trim()
                }

            },

            preHandler: fastify.csrfProtection
        },

        async (request, reply) => {

            // Handle invalid input
            if (request.validationError) {

                const csrfToken = await reply.generateCsrf()

                const body = request.body as Partial<QuoteBody>

                return reply.code(400).viewAsync('share', {

                    title: 'Share a Quote',

                    csrfToken,

                    error: 'Please check the author and quote text.',

                    values: {
                        author: body.author ?? '',
                        text: body.text ?? ''
                    }

                })

            }

            const { author, text } = request.body

            // Store the quote in PostgreSQL
            await fastify.prisma.quote.create({

                data: {
                    author,
                    text
                }

            })

            // Redirect after successful submission
            return reply.redirect('/share?created=1', 303)

        }
    )

    // Search for quotes by author
    fastify.get<{ Querystring: { author?: string } }>(
        '/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        author: {
                            type: 'string',
                            maxLength: 50
                        }
                    },
                    additionalProperties: false
                }
            }
        },

        async (request, reply) => {

            const author = request.query.author?.trim() ?? ''

            const quotes = author
                ? await fastify.prisma.quote.findMany({

                    where: {
                        author: {
                            equals: author,
                            mode: 'insensitive'
                        }
                    },

                    orderBy: {
                        createdAt: 'desc'
                    }

                })
                : []

            return reply.viewAsync('search', {

                title: 'Search Quotes',

                author,

                quotes,

                searched: author.length > 0

            })

        }
    )

    // Dashboard statistics
    fastify.get('/dashboard', async (request, reply) => {

        const [totalQuotes, authors] = await Promise.all([

            fastify.prisma.quote.count(),

            fastify.prisma.quote.findMany({

                distinct: ['author'],

                select: {
                    author: true
                }

            })

        ])

        return reply.viewAsync('dashboard', {

            title: 'Dashboard',

            totalQuotes,

            totalAuthors: authors.length

        })

    })

}

export default quoteRoutes
```

Let's understand the implementation.

### Displaying Quotes from PostgreSQL

Previously, we passed an array directly from our route to the homepage template.

Now we retrieve the information from PostgreSQL:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    orderBy: {
        createdAt: 'desc'
    },

    take: 10

})
```

The `findMany()` method retrieves multiple records from the Quote table.

We use `orderBy` to display the newest quotes first and `take` to limit the homepage to ten records.

The returned array is then passed to the template:

```typescript
return reply.viewAsync('index', {
    title: 'Quote Sharing',
    quotes
})
```

Notice that Handlebars does not need to know whether the information comes from an array, PostgreSQL, or another storage system.

It simply receives an array of quote objects and renders them.

This is an important architectural advantage: the data source can change without requiring us to completely rewrite the presentation layer.

### Storing Submitted Quotes

The POST route follows the same form-handling approach we introduced in Workshop 2.

It validates the submitted information using JSON Schema and checks the CSRF token before executing the route handler.

The important difference is what happens after validation succeeds.

Instead of adding information to an array, we execute:

```typescript
await fastify.prisma.quote.create({

    data: {
        author,
        text
    }

})
```

Prisma inserts the new record into PostgreSQL.

The database generates its identifier and creation timestamp according to the model configuration.

The application then redirects the browser to the submission page using the Post/Redirect/Get pattern.

The information is now stored persistently and can be retrieved by subsequent requests.

### Searching for Quotes

Our search route retrieves information directly from PostgreSQL.

We first obtain the author name from the query string:

```typescript
const author = request.query.author?.trim() ?? ''
```

Then we execute a filtered query:

```typescript
const quotes = await fastify.prisma.quote.findMany({

    where: {
        author: {
            equals: author,
            mode: 'insensitive'
        }
    },

    orderBy: {
        createdAt: 'desc'
    }

})
```

We use case-insensitive comparison so that searching for `albert einstein` also finds records stored as `Albert Einstein`.

The results are passed to the search template, where Handlebars displays the matching quotes.

This demonstrates how Prisma filtering allows us to perform database searches without manually constructing SQL statements.

### Generating Dashboard Statistics

The dashboard needs information about the total number of quotes and the number of distinct authors.

We could retrieve all records and calculate these values manually in JavaScript, but this would be inefficient for large datasets.

Instead, we use database queries.

To calculate the total number of quotes:

```typescript
const totalQuotes = await fastify.prisma.quote.count()
```

To retrieve distinct authors:

```typescript
const authors = await fastify.prisma.quote.findMany({

    distinct: ['author'],

    select: {
        author: true
    }

})
```

The `distinct` option ensures that each author appears only once in the returned results.

We then calculate:

```typescript
const totalAuthors = authors.length
```

Finally, we execute both queries using:

```typescript
await Promise.all([...])
```

This allows independent database operations to run concurrently instead of waiting for one to complete before starting the other.

The results are passed to our dashboard template.

### Updating the Templates

Our previous Handlebars templates already used dynamic data, so we only need to make sure they display the database results correctly.

For example:

**`views/index.hbs`:**

```handlebars
<section class="hero">

    <h1>Welcome to Quote Sharing</h1>

    <p>Discover and share meaningful quotes.</p>

</section>

<section class="quotes">

    <h2>Recent Quotes</h2>

    {{#each quotes}}

        <article class="quote-card">

            <blockquote>
                {{text}}
            </blockquote>

            <p class="quote-author">
                — {{author}}
            </p>

        </article>

    {{else}}

        <p>No quotes have been submitted yet.</p>

    {{/each}}

</section>
```

The `{{#each}}` helper iterates over the quotes retrieved from PostgreSQL.

For each record, Handlebars displays its text and author.

If the database contains no quotes, the `else` block displays an appropriate empty-state message.

Notice that we continue using normal Handlebars expressions for user-generated information. This ensures that submitted quote text and author names are HTML-escaped.

**`views/share.hbs`:**

```handlebars
<section class="share">

    <h1>Share a Quote</h1>

    {{#if submitted}}

        <p class="success">
            Your quote has been submitted successfully.
        </p>

    {{/if}}

    {{#if error}}

        <p class="error">
            {{error}}
        </p>

    {{/if}}

    <form action="/share" method="POST">

        <input
            type="hidden"
            name="_csrf"
            value="{{csrfToken}}"
        >

        <label for="author">Original Author:</label>

        <input
            type="text"
            id="author"
            name="author"
            value="{{values.author}}"
            required
        >

        <label for="text">Quote:</label>

        <textarea
            id="text"
            name="text"
            required
        >{{values.text}}</textarea>

        <button type="submit">
            Share Quote
        </button>

    </form>

</section>
```

The form includes the CSRF token, and the route provides the values and validation feedback when necessary.

**`views/search.hbs`:**

```handlebars
<section class="search">

    <h1>Search Quotes</h1>

    <form action="/search" method="GET">

        <label for="author">Author Name:</label>

        <input
            type="text"
            id="author"
            name="author"
            value="{{author}}"
            required
        >

        <button type="submit">
            Search
        </button>

    </form>

    {{#if searched}}

        <h2>Search Results</h2>

        {{#each quotes}}

            <article class="quote-card">

                <blockquote>
                    {{text}}
                </blockquote>

                <p>— {{author}}</p>

            </article>

        {{else}}

            <p>No quotes found for author.</p>

        {{/each}}

    {{/if}}

</section>
```

This template displays the search form and any matching results returned by the backend.

Because we use GET, the search term appears in the URL as a query parameter.

**`views/dashboard.hbs`:**

```handlebars
<section class="dashboard">

    <h1>Application Dashboard</h1>

    <div class="statistics">

        <article class="stat-card">

            <h2>Total Quotes</h2>

            <p>{{totalQuotes}}</p>

        </article>

        <article class="stat-card">

            <h2>Unique Authors</h2>

            <p>{{totalAuthors}}</p>

        </article>

    </div>

</section>
```

The dashboard displays statistics calculated from PostgreSQL.

### Registering the Quotes Plugin

Our application now has a route plugin responsible for the main Quote Sharing functionality.

Register it inside `app.ts`:

```typescript
import quoteRoutes from './routes/quotes.js'

// Inside buildApp()

fastify.register(quoteRoutes)
```

We also need to remove the previous homepage route if it defines the same `/` endpoint.

The database-backed route now replaces the earlier implementation.

Our application exposes the following endpoints:

```text
GET  /
GET  /share
POST /share
GET  /search
GET  /dashboard
```

All these pages use the same Handlebars layout and static resources introduced in Workshop 2.

## Updating and Deleting Existing Quotes

Our application can now create and retrieve persistent records.

However, complete data management also requires the ability to modify and remove existing records.

We already introduced these operations through Prisma Client, so let's see how they can be applied to individual quotes.

### Updating a Quote

Imagine that a quote contains a spelling mistake and needs to be corrected.

We can retrieve its identifier from the URL and update the corresponding record.

The database operation looks like this:

```typescript
const updatedQuote = await fastify.prisma.quote.update({

    where: {
        id: quoteId
    },

    data: {
        author,
        text
    }

})
```

The `where` condition identifies the quote, while `data` contains the new information.

For server-rendered applications, we can create an edit form that submits a POST request:

```text
GET  /quotes/:id/edit
POST /quotes/:id/edit
```

The GET route displays the existing quote information, while the POST route validates the submitted values and updates the record.

Since native HTML forms primarily support GET and POST methods, using POST for these form submissions is a straightforward approach for our workshop.

### Deleting a Quote

Deleting a quote uses Prisma's `delete()` method:

```typescript
await fastify.prisma.quote.delete({

    where: {
        id: quoteId
    }

})
```

We can expose this operation through another form endpoint:

```text
POST /quotes/:id/delete
```

The form should include a CSRF token because deleting a record changes application data.

We should also require appropriate authorization before allowing deletion in a real application.

Remember that CSRF protection does not determine whether someone is authorized to delete a quote. It only helps verify that the request contains a valid CSRF token.

### Handling Records That Do Not Exist

Both `update()` and `delete()` throw a Prisma error with code `P2025` when the requested record does not exist.

We can handle this using Prisma's error types.

For example:

```typescript
import { Prisma } from '../generated/prisma/client.js'

try {

    const updatedQuote = await fastify.prisma.quote.update({

        where: {
            id: quoteId
        },

        data: {
            author,
            text
        }

    })

    return updatedQuote

} catch (error) {

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
    ) {

        return reply.code(404).send({
            error: 'Quote not found'
        })

    }

    throw error

}
```

Here, we distinguish between a known database error and an unexpected failure.

If the record does not exist, we return a `404 Not Found` response.

For other errors, we rethrow the exception so Fastify's error-handling mechanism can process it.

We should not expose internal database errors directly to users because they may reveal implementation details or sensitive information.

This is an important part of designing reliable database-backed applications.

## Inspecting Database Records with Prisma Studio

One of the useful tools included in Prisma is **Prisma Studio**.

Prisma Studio provides a graphical interface that allows us to inspect and manage the records stored in our database.

Instead of writing SQL queries every time we want to examine the data, we can open a visual interface and browse the available tables.

To start Prisma Studio, execute:

```bash
npx prisma studio
```

Prisma Studio opens in your browser.

You should see our `Quote` model and the records currently stored inside it.

We can inspect the author, quote text, identifiers, and timestamps.

We can also create, modify, or delete records through the interface.

This is particularly useful during development because it allows us to verify that our backend is interacting with the database correctly.

## Testing Persistent Storage

Now comes an important part of the workshop: verifying that our data is actually persistent.

First, make sure PostgreSQL is running and start our Fastify application:

```bash
npm run dev
```

Visit:

```text
http://127.0.0.1:3000/share
```

Submit a new quote.

The server should validate the information and store it in PostgreSQL through Prisma Client.

Now visit:

```text
http://127.0.0.1:3000
```

The homepage should display the newly submitted quote.

We can also inspect the database using Prisma Studio:

```bash
npx prisma studio
```

The submitted record should appear inside the Quote table.

Now stop the Fastify application:

```text
Ctrl + C
```

Start it again:

```bash
npm run dev
```

Return to the homepage.

The previously submitted quote should still be available.

This is the fundamental difference between temporary in-memory storage and persistent database storage.

The information is no longer dependent on the lifetime of our Node.js process. It is stored in PostgreSQL and can be retrieved whenever the application connects to the database.

## Understanding Database Backups and Data Safety

There is one final concept worth understanding when working with persistent storage.

Although PostgreSQL provides reliable mechanisms for managing data, this does not mean that information is automatically protected against every possible failure.

For example, databases can be affected by hardware failures, accidental deletion, incorrect migrations, or administrative mistakes.

This is why production applications need a backup strategy.

PostgreSQL provides tools such as `pg_dump` for creating database backups.

For example:

```bash
pg_dump -U quote_app_user -d quote_sharing -F c -f quote_sharing.backup
```

This creates a backup file containing the database contents and structure.

We can restore a custom-format backup using:

```bash
pg_restore -U quote_app_user -d quote_sharing quote_sharing.backup
```

These commands are useful for understanding how database recovery works.

However, backups should be performed regularly, stored securely, and tested periodically. A backup that has never been tested is not a reliable recovery strategy.

Database backups and recovery planning become increasingly important as applications begin handling valuable information.

## Tasks

Now that we understand how PostgreSQL and Prisma work together, let's extend the Quote Sharing application from our previous workshop.

### Task 1: Make the Quote Sharing Application Persistent

In this task, we will replace the temporary in-memory storage with PostgreSQL and Prisma.

The goal is to ensure that all submitted quotes remain available even after the server restarts.

**Database Requirements**

Create a Prisma model named `Quote` containing:

- An automatically generated integer ID.
- The original author's name.
- The quote text.
- A creation timestamp.
- An update timestamp.

Use appropriate PostgreSQL data types and constraints.

**Functional Requirements**

The application should provide the following functionality:

**Homepage (`/`)**

Display the ten most recently submitted quotes.

Retrieve the information from PostgreSQL using Prisma Client rather than an in-memory array.

**Quote Submission (`/share`)**

Allow visitors to submit new quotes.

Validate the author name and quote text using JSON Schema.

Include CSRF protection and store valid submissions in PostgreSQL.

**Search (`/search`)**

Allow visitors to search for quotes by their original author's name.

The search should be case-insensitive and retrieve matching records directly from PostgreSQL.

**Dashboard (`/dashboard`)**

Display the total number of quotes and distinct authors.

Calculate these statistics using Prisma Client rather than manually maintaining counters.

**Persistence**

Restart the server and verify that previously submitted quotes remain available.

Use Prisma Studio to inspect the database and confirm that records are being stored correctly.

### Task 2: Implement Quote Management (CRUD)

Extend the application to support managing existing quotes.

Add the following operations:

**Update a Quote**

Create an edit page that allows users to modify an existing quote.

The form should display the current information and submit the updated values.

Validate the submitted information before applying the changes.

**Delete a Quote**

Add a delete operation that allows an existing quote to be removed.

Require confirmation before deletion and include CSRF protection.

**Additional Requirements**

- Use URL parameters to identify individual quotes.
- Handle records that do not exist.
- Return appropriate HTTP status codes or render appropriate error pages.
- Use Post/Redirect/Get after successful form submissions.
- Do not expose internal database errors to users.

For this educational project, management operations can be implemented without authentication. However, remember that a real application must enforce authorization before allowing users to modify or delete records.

### Task 3: Improve the Application

Once the core functionality is complete, extend the application with additional features.

You can introduce:

- Pagination for the homepage.
- Filtering quotes by submission date.
- Sorting quotes by author or creation date.
- Searching using partial author names.
- Displaying the date each quote was submitted.
- Adding a category field to each quote.

If you introduce a new field or modify the existing database model, remember to create and apply a migration, then regenerate Prisma Client.

The objective of these tasks is to become comfortable building applications that maintain and manage persistent information using PostgreSQL and Prisma.

## Conclusion

In this workshop, we extended our Fastify application by introducing persistent data storage using PostgreSQL and Prisma ORM.

We started by understanding why applications need databases and how relational databases organize information into tables, rows, and columns. We then explored the role of an ORM and how Prisma provides a type-safe interface for interacting with PostgreSQL.

After configuring our database connection, we defined our first Prisma model and used Prisma Migrate to create the corresponding database table.

We then integrated Prisma Client into Fastify through a reusable plugin, making database functionality available throughout our application.

Finally, we applied these concepts to our Quote Sharing application by replacing temporary in-memory storage with persistent database operations. We learned how to create, retrieve, update, delete, filter, and sort records using Prisma Client.

Our application can now retain information across server restarts, which is an important step toward building complete backend systems.

In the next workshop, we will build on these foundations by exploring more advanced backend functionality, including application architecture, authentication, and authorization. This will allow us to move beyond publicly accessible operations and start building applications that manage users, permissions, and protected resources.

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Prisma ORM Documentation](https://www.prisma.io/docs/orm/v7)
- [Prisma ORM PostgreSQL Quickstart](https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql)
- [Prisma ORM: Adding Prisma to an Existing Project](https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/postgresql)
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)
- [Prisma Client Documentation](https://www.prisma.io/docs/orm/v7/prisma-client)
- [Prisma CRUD Operations](https://www.prisma.io/docs/orm/v7/prisma-client/queries/crud)
- [Prisma Filtering and Sorting](https://www.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting)
- [Prisma Pagination](https://www.prisma.io/docs/orm/v7/prisma-client/queries/pagination)
- [Prisma Migrate](https://www.prisma.io/docs/orm/v7/prisma-migrate)
- [Prisma Development and Production Migrations](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Prisma Studio](https://www.prisma.io/studio)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)