# Workshop 5: File Uploads and File Management with Fastify

## Objectives

In this workshop, we will learn how to implement secure file uploads and file management in backend applications using Fastify, PostgreSQL, and Prisma.

We will explore how HTTP handles file uploads, how multipart requests work, and how Fastify processes uploaded files using streams.

We will also examine the security risks associated with accepting user-provided files and implement appropriate mechanisms to validate, store, retrieve, and manage uploaded content.

We will learn how to:

- Understand how file uploads work over HTTP.
- Understand `multipart/form-data` and its structure.
- Work with streams and asynchronous file operations in Node.js.
- Implement file uploads using `@fastify/multipart`.
- Understand the security risks associated with file uploads.
- Validate file extensions, MIME types, and file signatures.
- Enforce file size limits and upload restrictions.
- Store files securely outside the application's public directory.
- Generate server-controlled filenames and storage identifiers.
- Integrate file storage with PostgreSQL and Prisma.
- Associate uploaded files with existing database resources.
- Protect file uploads and downloads using authentication and authorization.
- Implement file listing, downloading, and deletion.
- Understand private object storage and modern cloud-based upload architectures.
- Build a secure task attachment system.

## Introduction to File Uploads

In our previous workshops, we learned how to build backend applications using Fastify, process HTTP requests, interact with PostgreSQL through Prisma, and implement authentication and authorization.

In Workshop 4, we built a protected Task Management API.

Users can now register, authenticate, create tasks, and manage their own work. We also introduced administrative permissions and resource ownership to prevent unauthorized access to other users' information.

However, there is another important requirement that many applications need.

Imagine that we are developing a Task Management application where users need to attach documents, screenshots, reports, or images to their tasks.

For example, Alice creates a task describing a software bug. She wants to attach a screenshot showing the problem.

Similarly, Bob creates a task for preparing a technical report and wants to attach a PDF document containing the relevant information.

Our current application can store textual information inside PostgreSQL, but it does not yet provide a mechanism for receiving and managing actual files.

To support this functionality, we need to implement **file uploads**.

File uploading is a fundamental capability in modern backend applications.

It is used in many different scenarios, including:

- Profile pictures and avatars.
- Documents and reports.
- Product images.
- Attachments in messaging applications.
- Videos and multimedia content.
- Documents submitted through educational platforms.

However, accepting files introduces additional security and infrastructure concerns.

Unlike ordinary JSON data, uploaded files can contain arbitrary binary content. They can also be extremely large, malformed, or intentionally crafted to exploit vulnerabilities in the application or the systems processing them.

Therefore, implementing file uploads is not simply a matter of receiving a file and saving it to disk.

We need to establish a controlled process that validates the uploaded content, limits resource consumption, stores files safely, and ensures that only authorized users can access them.

Throughout this workshop, we will extend our existing Task Management application by implementing a secure attachment system.

## Understanding How File Uploads Work

Before implementing file uploads with Fastify, we need to understand how clients transmit files to backend applications.

When a browser uploads a file, it usually sends an HTTP request using the `multipart/form-data` content type.

Unlike `application/json`, which represents structured information as JSON text, `multipart/form-data` is designed to transmit multiple parts within a single HTTP request.

These parts can contain:

- Text fields.
- Files.
- Other binary information.

For example, imagine a form containing a username and a profile picture.

The browser could submit:

```html
<form
    action="/api/profile"
    method="POST"
    enctype="multipart/form-data"
>
    <input
        type="text"
        name="username"
    >

    <input
        type="file"
        name="avatar"
    >

    <button type="submit">
        Upload
    </button>

</form>
```

The important attribute here is:

```html
enctype="multipart/form-data"
```

It tells the browser to encode the form using the multipart format.

### Understanding multipart/form-data

When the browser sends a multipart request, the payload is divided into separate parts.

Each part contains headers describing the information it carries, followed by its actual content.

For example:

```http
POST /api/profile HTTP/1.1
Host: example.com
Content-Type: multipart/form-data; boundary=----Boundary123

------Boundary123
Content-Disposition: form-data; name="username"

Alice
------Boundary123
Content-Disposition: form-data; name="avatar"; filename="profile.png"
Content-Type: image/png

[BINARY FILE CONTENT]
------Boundary123--
```

Let's understand the important elements.

**Content-Type**

The request uses:

```http
Content-Type: multipart/form-data; boundary=----Boundary123
```

The `boundary` parameter separates the different parts of the request.

Its value is generated by the client and tells the server where each part begins and ends.

**Content-Disposition**

Each part contains a `Content-Disposition` header describing its purpose.

For example:

```http
Content-Disposition: form-data; name="avatar"; filename="profile.png"
```

Here:

- `name` identifies the form field.
- `filename` contains the filename provided by the client.

**Part Content-Type**

A file part may also contain a MIME type:

```http
Content-Type: image/png
```

This indicates the media type the client claims the file contains.

However, we must not blindly trust this value.

The client controls the multipart headers and can easily submit an incorrect MIME type.

We will examine this security issue later.

### Understanding MIME Types

A MIME type describes the type of content represented by a file or an HTTP resource.

For example:

| File Type | MIME Type |
|---|---|
| JPEG Image | `image/jpeg` |
| PNG Image | `image/png` |
| PDF Document | `application/pdf` |
| JSON | `application/json` |
| Plain Text | `text/plain` |
| ZIP Archive | `application/zip` |
| MP4 Video | `video/mp4` |

MIME types are useful because applications can use them to determine how different types of content should be handled.

For example, a browser can display an image directly when the response identifies it as an image.

However, the MIME type included in an uploaded file's multipart headers is only a claim made by the client.

An attacker could upload an executable file while claiming that it is a PNG image.

Therefore, we need additional validation based on the actual file content.

## Understanding File Upload Architecture

Now that we understand how browsers transmit files, let's examine what happens inside a backend application.

A typical file upload operation involves several stages:

```text
             CLIENT
                |
                |
                v
        HTTP Multipart Request
                |
                v
             FASTIFY
                |
                v
       Authentication Check
                |
                v
       Authorization Check
                |
                v
         Multipart Parsing
                |
                v
        File Size Validation
                |
                v
       Temporary File Storage
                |
                v
       File Content Detection
                |
                v
       File Type Validation
                |
                v
        Private File Storage
                |
                v
       Save File Metadata
                |
                v
        PostgreSQL Database
                |
                v
        Return File Metadata
```

Let's examine the responsibilities of the different components.

**Fastify**

Fastify receives the HTTP request and processes its multipart payload.

It provides the mechanisms required to extract uploaded files and their associated metadata.

**File Storage**

The actual binary content is stored in a dedicated storage system.

For our educational implementation, we will use the local filesystem.

**PostgreSQL**

PostgreSQL stores metadata describing the uploaded files, such as their original names, sizes, MIME types, and associated resources.

The database does not need to contain the complete binary content.

This separation allows the application to manage file information independently from the actual storage mechanism.

## Understanding File Storage Strategies

Before implementing uploads, we need to understand where uploaded files should be stored.

There are several common approaches.

### 1. Storing Files Inside the Database

One option is to store file contents directly inside PostgreSQL using binary data types such as `BYTEA`.

For example:

```sql
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    content BYTEA
);
```

The `content` column stores the actual binary data.

This approach has some advantages:

- File data and metadata can participate in database transactions.
- Database backup mechanisms can include the stored content.
- Access control can be implemented through database operations.

However, it also introduces disadvantages:

- Large files increase database storage requirements.
- Database backups become significantly larger.
- File retrieval can increase database workload.
- Database storage is generally not optimized for serving large media files.

For these reasons, storing large uploaded files directly inside the database is not the approach we will use.

### 2. Storing Files on the Filesystem

Another approach is to store files directly on the server's filesystem.

For example:

```text
project/
│
├── src/
│
├── prisma/
│
├── public/
│
└── var/
    └── uploads/
        ├── staging/
        └── objects/
```

The filesystem stores the actual binary content, while PostgreSQL stores the information needed to locate and manage each file.

For example, PostgreSQL might contain:

| id | originalName | storageKey | mimeType |
|---|---|---|---|
| 1 | screenshot.png | 8f3a... | image/png |
| 2 | report.pdf | 2b7c... | application/pdf |

The actual files exist separately inside the storage directory.

This approach is simple and efficient for applications running on a single server or a small deployment with persistent shared storage.

However, local filesystem storage introduces additional considerations.

For example:

- Files must be included in the backup strategy.
- Storage permissions must be configured correctly.
- Multiple application instances need access to the same storage.
- Disk capacity must be monitored.
- File deletion and database deletion must be coordinated.

For this workshop, we will use filesystem storage because it allows us to understand the complete upload process without introducing additional cloud infrastructure.

### 3. Using Object Storage

Modern production applications frequently use dedicated object storage systems.

Examples include:

- Amazon S3.
- Cloudflare R2.
- Google Cloud Storage.
- Azure Blob Storage.
- MinIO.

These systems are designed to store and retrieve objects such as images, documents, and videos.

Instead of storing files inside the application server, the backend communicates with an external storage service.

For example:

```text
             CLIENT
                |
                v
             BACKEND
                |
                v
          AUTHENTICATION
                |
                v
          ISSUE UPLOAD URL
                |
                v
             CLIENT
                |
                v
         OBJECT STORAGE
                |
                v
        UPLOAD COMPLETED
                |
                v
             BACKEND
                |
                v
       VERIFY UPLOADED OBJECT
                |
                v
       SAVE DATABASE METADATA
```

A particularly useful technique is **presigned URLs**.

Instead of sending the entire file through our backend, the backend generates a temporary URL that allows the client to upload directly to object storage.

The client then uploads the file without sending all its binary data through the application server.

This can significantly reduce backend bandwidth consumption.

However, the backend must still verify the uploaded object, enforce size and type restrictions, and ensure that the user is authorized to upload it.

We will discuss this architecture later in the workshop.

For now, we will implement local filesystem storage while keeping our application architecture compatible with a future object-storage implementation.

## Understanding Streams in Node.js

Before implementing file uploads with Fastify, we need to understand an important Node.js concept: **streams**.

Streams allow Node.js to process data incrementally instead of loading the entire content into memory.

This is particularly important when handling large files.

Imagine that a user uploads a file containing 500 MB of data.

One possible implementation is to read the entire file into memory:

```typescript
const buffer = await file.toBuffer()
```

The result is a `Buffer` containing the entire file.

Although this approach is convenient, it introduces a serious scalability problem.

Suppose ten users upload 500 MB files simultaneously.

The application might need approximately:

```text
10 × 500 MB = 5000 MB
```

of memory just for the uploaded file contents.

This can quickly exhaust available memory.

Instead of loading everything into memory, we can process the file incrementally using streams.

### What is a Stream?

A stream is an interface for processing data incrementally.

Instead of receiving the entire file at once, the application receives smaller chunks of data over time.

For example:

```text
         UPLOADED FILE
           500 MB
              |
              v
          READ STREAM
              |
        ┌─────┼─────┐
        |     |     |
        v     v     v
      CHUNK CHUNK CHUNK
       1     2     3
        |     |     |
        └─────┼─────┘
              |
              v
        WRITE STREAM
              |
              v
        FILESYSTEM
```

This allows the application to process large files without keeping the entire content in memory.

### Understanding Node.js Stream Types

Node.js provides four primary stream types.

**1. Readable Streams**

Readable streams represent sources from which data can be consumed.

For example:

```typescript
import { createReadStream } from 'node:fs'

const stream = createReadStream('report.pdf')
```

Here, we create a readable stream that reads data from a file.

**2. Writable Streams**

Writable streams represent destinations to which data can be written.

For example:

```typescript
import { createWriteStream } from 'node:fs'

const stream = createWriteStream('copy.pdf')
```

Here, we create a writable stream that writes data into a file.

**3. Duplex Streams**

Duplex streams support both reading and writing.

For example, a TCP socket can receive data and send data through the same connection.

**4. Transform Streams**

Transform streams are duplex streams that modify data as it passes through them.

For example, a compression stream can compress data before writing it to a destination.

### Connecting Streams with pipeline()

Node.js provides a useful function called `pipeline()`.

It connects streams together and handles important details such as stream errors and cleanup.

For example:

```typescript
import { createReadStream, createWriteStream } from 'node:fs'

import { pipeline } from 'node:stream/promises'

await pipeline(

    createReadStream('report.pdf'),

    createWriteStream('copy.pdf')

)
```

This reads the original file and writes its contents to another file.

The important advantage is that the data flows incrementally.

We do not need to load the complete file into memory.

The `pipeline()` function also returns a Promise, allowing us to use it naturally with `async/await`.

This is particularly useful when implementing file uploads.

## Understanding File Upload Security

Accepting files from clients introduces several security risks.

Before writing our implementation, we need to understand the most important threats.

### 1. Unrestricted File Uploads

One of the most common mistakes is accepting every file type without restrictions.

Imagine an application that allows users to upload profile pictures.

If the application accepts arbitrary files, an attacker might upload:

- Executable files.
- Server-side scripts.
- HTML documents.
- Malicious documents.
- Files designed to exploit image-processing libraries.

The application may unintentionally expose these files or process them using vulnerable software.

To reduce this risk, we should define an explicit **allowlist** of supported file types.

For our Task Management application, we will allow:

| Extension | MIME Type | Purpose |
|---|---|---|
| `.jpg` | `image/jpeg` | Images |
| `.jpeg` | `image/jpeg` | Images |
| `.png` | `image/png` | Images |
| `.pdf` | `application/pdf` | Documents |

We deliberately exclude formats such as SVG and ZIP.

SVG files can contain active content, while archive formats introduce additional risks related to file extraction, nested files, and decompression attacks.

We can introduce additional formats later when the application has the appropriate validation and processing mechanisms.

### 2. MIME Type Spoofing

Another common mistake is trusting the MIME type provided by the client.

Consider a client uploading an executable file while declaring:

```http
Content-Type: image/png
```

The backend might accept the file if it only checks the request's MIME type.

This is unsafe because the MIME type is controlled by the client.

We therefore need to inspect the actual file content.

### Understanding File Signatures

Many binary file formats contain specific byte patterns near the beginning of the file.

These patterns are commonly called **magic numbers** or file signatures.

For example:

| File Type | Example Signature |
|---|---|
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| JPEG | `FF D8 FF` |
| PDF | `%PDF-` |

These signatures help identify the actual format of a file.

Instead of trusting the declared MIME type, we can inspect the binary content and determine which format it most likely represents.

However, signature detection is not a complete security solution.

A malicious or malformed file can still contain a valid file signature.

Therefore, file signatures should be combined with other validation and security mechanisms.

### 3. Path Traversal

Another important vulnerability involves filesystem paths.

Suppose our application stores files using the filename supplied by the client:

```typescript
const filePath = `uploads/${filename}`
```

A malicious client might submit:

```text
../../../../etc/passwd
```

If the application uses this value directly when constructing filesystem paths, it could access files outside the intended directory.

This vulnerability is known as **Path Traversal**.

We should never allow client-provided filenames to determine where files are stored.

Instead, we generate our own unique storage identifiers using a cryptographically secure random generator.

For example:

```typescript
import { randomUUID } from 'node:crypto'

const storageKey = randomUUID()
```

The resulting identifier looks similar to:

```text
8f3a1b72-6c95-4d21-ae75-4b2c8f9d1036
```

We use this identifier as the internal storage filename.

The original filename can still be stored in PostgreSQL for display purposes, but it must never determine the filesystem path.

### 4. Denial of Service Through Large Files

Another problem occurs when the application allows users to upload arbitrarily large files.

An attacker could submit files containing several gigabytes of data and exhaust:

- Disk storage.
- Memory.
- Network bandwidth.
- Processing resources.

To prevent this, we need to enforce file size limits.

We should also limit the number of files and multipart fields accepted in each request.

For our application, we will introduce a maximum upload size of:

```text
10 MB per file
```

We will also implement upload rate limiting.

The upload limits should be enforced at the application level and, where appropriate, at the reverse proxy or API gateway.

### 5. Malicious Files and Unsafe Processing

Even when a file has a valid signature, it may still contain malicious content.

For example, a PDF document could contain malicious content targeting vulnerable document-processing software.

An image may exploit a vulnerability in an outdated image-processing library.

This is why production applications often use antivirus scanning, sandboxed processing, or Content Disarm and Reconstruction (CDR).

In our educational implementation, we will validate the file format and restrict which files can be uploaded.

We will not implement an antivirus scanning service.

We must therefore understand that **passing format validation does not prove that a file is malware-free**.

For production systems that accept untrusted documents, files should remain in private quarantine storage until an isolated scanning process has approved them.

## Implementing File Uploads with Fastify

Now that we understand file uploads, streams, and their security requirements, we can implement the functionality inside our Fastify application.

Fastify does not handle multipart file uploads automatically.

Instead, we will use an official plugin called `@fastify/multipart`.

The plugin provides methods for processing multipart requests and accessing uploaded files through streams.

### Installing @fastify/multipart

Install the package:

```bash
npm install @fastify/multipart@^10.1.8
```

We are using Fastify 5, and this release supports the Fastify 5 plugin interface.

It is important to use a maintained version.

In particular, do not use an outdated multipart package or an affected release of `@fastify/multipart`. Versions before 10.1.7 have documented malformed-upload and cleanup-related denial-of-service issues.

### Understanding the Multipart Plugin

Before integrating it into our application, let's understand how it works.

Register the plugin:

```typescript
import multipart from '@fastify/multipart'

fastify.register(multipart)
```

After registering it, Fastify provides additional methods through the request object.

Some of the most useful methods are:

| Method | Purpose |
|---|---|
| `request.isMultipart()` | Checks whether the request uses multipart encoding. |
| `request.file()` | Retrieves a single uploaded file. |
| `request.files()` | Iterates over uploaded files. |
| `request.parts()` | Iterates over all multipart fields and files. |
| `request.saveRequestFiles()` | Temporarily saves uploaded files to disk. |

For our implementation, we will primarily use:

```typescript
request.file()
```

It retrieves a single file and exposes its contents as a readable stream.

For example:

```typescript
fastify.post('/upload', async (request, reply) => {

    const file = await request.file()

    if (!file) {

        return reply.code(400).send({
            error: 'No file was provided'
        })

    }

    console.log(file.filename)

    console.log(file.mimetype)

    console.log(file.file)

})
```

Here:

- `filename` contains the original filename supplied by the client.
- `mimetype` contains the MIME type supplied by the client.
- `file` is the readable stream containing the actual binary content.

An important detail is that we should not automatically use:

```typescript
await file.toBuffer()
```

for large uploads because this accumulates the entire file in memory.

Instead, we will stream the content directly into temporary storage.

### Understanding Multipart Limits

The multipart plugin allows us to configure limits on incoming requests.

For example:

```typescript
fastify.register(multipart, {

    limits: {

        fileSize: 10 * 1024 * 1024,

        files: 1,

        fields: 0,

        parts: 1

    }

})
```

Here:

- `fileSize` limits the size of an individual uploaded file.
- `files` limits the number of file fields.
- `fields` limits the number of ordinary form fields.
- `parts` limits the total number of multipart parts.

These limits are important for protecting application resources.

There is one additional detail worth understanding.

Multipart requests use a dedicated streaming parser. Fastify's normal `bodyLimit` does not act as an aggregate limit for all multipart content.

Therefore, we must configure the multipart limits explicitly and also enforce a suitable total request-size limit at the reverse proxy or API gateway.

For this workshop, we will accept exactly one file and no additional form fields per request.

## Preparing the Database for File Attachments

Before implementing the upload endpoint, we need to extend our database schema.

In Workshop 4, we introduced the `User` and `Task` models.

We will now introduce a new model called `Attachment`.

The purpose of this model is to store information about files associated with tasks.

An attachment needs:

- A unique identifier.
- The task it belongs to.
- The user who uploaded it.
- Its original filename.
- Its internal storage identifier.
- Its detected MIME type.
- Its file extension.
- Its size.
- Its creation date.

We will store the actual file content in the filesystem rather than PostgreSQL.

### Extending the Prisma Schema

Open:

```text
prisma/schema.prisma
```

We need to extend the existing `User` and `Task` models.

Inside the `User` model, add:

```prisma
uploadedAttachments Attachment[] @relation("AttachmentUploader")
```

This represents the attachments uploaded by the user.

Inside the `Task` model, add:

```prisma
attachments Attachment[]
```

This represents the files associated with each task.

Next, add the following model:

**`prisma/schema.prisma`:**

```prisma
model Attachment {

    id Int @id @default(autoincrement())

    taskId Int

    task Task @relation(
        fields: [taskId],
        references: [id],
        onDelete: Cascade
    )

    uploadedById Int

    uploadedBy User @relation(
        "AttachmentUploader",
        fields: [uploadedById],
        references: [id],
        onDelete: Restrict
    )

    originalName String @db.VarChar(255)

    storageKey String @unique @db.VarChar(36)

    mimeType String @db.VarChar(100)

    extension String @db.VarChar(10)

    size Int

    createdAt DateTime @default(now())

    @@index([taskId, createdAt])

    @@index([uploadedById])

}
```

Let's understand the model.

### The Task Relationship

We introduce:

```prisma
taskId Int

task Task @relation(
    fields: [taskId],
    references: [id],
    onDelete: Cascade
)
```

This establishes a relationship between attachments and tasks.

The relationship is one-to-many:

- One task can have multiple attachments.
- Each attachment belongs to one task.

We also use:

```prisma
onDelete: Cascade
```

This means that deleting a task automatically deletes its associated attachment records from PostgreSQL.

However, remember that PostgreSQL cannot automatically delete the corresponding files from the filesystem.

Database cascades only affect database records.

We will discuss the implications of this when considering file lifecycle management.

### The Uploader Relationship

We also introduce:

```prisma
uploadedById Int

uploadedBy User @relation(
    "AttachmentUploader",
    fields: [uploadedById],
    references: [id],
    onDelete: Restrict
)
```

This records which authenticated user uploaded the file.

We use `onDelete: Restrict` because deleting a user should not silently remove information about files they uploaded.

The application must explicitly handle attachment retention and account deletion.

### Understanding storageKey

The `storageKey` field is particularly important:

```prisma
storageKey String @unique @db.VarChar(36)
```

It contains the internal identifier used to locate the file in our storage system.

For example:

```text
8f3a1b72-6c95-4d21-ae75-4b2c8f9d1036
```

This is different from the original filename.

The original filename is user-provided metadata, while the storage key is generated and controlled by our application.

This separation prevents users from influencing filesystem paths.

### Understanding File Metadata

The remaining fields describe the uploaded file:

```prisma
originalName String @db.VarChar(255)

mimeType String @db.VarChar(100)

extension String @db.VarChar(10)

size Int
```

For example, the database might contain:

| Field | Value |
|---|---|
| `originalName` | `project-report.pdf` |
| `storageKey` | `8f3a1b72-6c95-4d21-ae75-4b2c8f9d1036` |
| `mimeType` | `application/pdf` |
| `extension` | `pdf` |
| `size` | `524288` |

Notice that the database stores the file size in bytes.

Because we limit our attachments to 10 MB, a PostgreSQL integer is sufficient for this implementation.

### Applying the Migration

After updating the Prisma schema, create a migration:

```bash
npx prisma migrate dev --name add_task_attachments
```

Next, regenerate Prisma Client:

```bash
npx prisma generate
```

Our database can now store attachment metadata and associate uploaded files with their tasks.

## Preparing File Storage

Now that the database supports attachments, we need to create the storage directories.

We will use two directories:

```text
var/
└── uploads/
    ├── staging/
    └── objects/
```

The `staging` directory temporarily holds files while we process and validate them.

The `objects` directory stores files that have passed our initial format validation.

We deliberately keep these directories outside the application's public directory.

For example, we should not store private uploads inside:

```text
public/uploads/
```

or:

```text
static/uploads/
```

Otherwise, the web server could expose files directly without checking whether a user is authorized to access them.

### Configuring the Storage Directory

Open the `.env` file and add:

```env
UPLOAD_DIR=./var/uploads
```

This allows us to change the storage location without modifying application code.

The storage directory should resolve to a location outside the application's public web root.

Also update the root `.gitignore`:

```gitignore
var/uploads/
```

Uploaded files should not become part of our source-control repository.

### Understanding File Permissions

File storage also needs appropriate operating-system permissions.

We will use restrictive permissions:

```text
Directory: 0700
File:      0600
```

These permissions restrict access to the operating-system account that owns the files.

For a production deployment, the application should run under a dedicated operating-system user with only the permissions required to manage uploaded files.

## Implementing the Upload Configuration

Before writing the route, we will define the maximum attachment size in a reusable configuration file.

Create:

```bash
mkdir -p src/config
touch src/config/uploads.ts
```

**`src/config/uploads.ts`:**

```typescript
export const MAX_ATTACHMENT_SIZE =
    10 * 1024 * 1024
```

This represents 10 MiB, expressed in bytes.

We will use the same value when configuring the multipart plugin and implementing our upload endpoint.

## Implementing the Authentication-Protected Upload Plugin

We will create a separate plugin responsible for managing task attachments.

It will provide the following endpoints:

```text
POST   /api/tasks/:taskId/attachments

GET    /api/tasks/:taskId/attachments

GET    /api/attachments/:attachmentId/download

DELETE /api/attachments/:attachmentId
```

The first endpoint uploads an attachment.

The second retrieves metadata for the attachments associated with a task.

The third downloads an attachment.

The fourth deletes an attachment.

All these operations will require authentication.

They will also enforce resource ownership.

### Installing File-Type Detection

Before implementing the route, we need a library for identifying uploaded file formats.

We will use the `file-type` package.

Install it:

```bash
npm install file-type
```

The package detects file formats by inspecting binary signatures, commonly known as magic numbers.

For example, it can identify whether the uploaded binary content actually resembles a JPEG, PNG, or PDF file.

It provides:

```typescript
import { fileTypeFromFile } from 'file-type'
```

We can then inspect a file stored on disk:

```typescript
const detected = await fileTypeFromFile(
    '/path/to/upload'
)
```

The function returns information similar to:

```typescript
{
    ext: 'png',
    mime: 'image/png'
}
```

Or `undefined` when it cannot identify a supported format.

An important distinction:

**File signature detection identifies a likely file format. It does not prove that the entire file is valid or free from malicious content.**

We will combine it with size restrictions, extension allowlists, MIME checks, and access control.

The `file-type` package is an ECMAScript module, which is compatible with our existing ESM-based TypeScript project.

### Creating the Attachments Routes

Create:

```bash
touch src/routes/attachments.ts
```

Inside this file, we will implement our attachment functionality.

**`src/routes/attachments.ts`:**

```typescript
import type { FastifyPluginAsync } from 'fastify'

import { randomUUID } from 'node:crypto'

import {
    mkdir,
    chmod,
    open,
    rename,
    stat,
    unlink
} from 'node:fs/promises'

import {
    basename,
    extname,
    join,
    resolve
} from 'node:path'

import { pipeline } from 'node:stream/promises'

import { Writable } from 'node:stream'

import { fileTypeFromFile } from 'file-type'

import { MAX_ATTACHMENT_SIZE } from '../config/uploads.js'


// Storage configuration

const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

const STAGING_DIR = join(
    UPLOAD_ROOT,
    'staging'
)

const OBJECTS_DIR = join(
    UPLOAD_ROOT,
    'objects'
)


// Supported extensions and their expected MIME types

const ALLOWED_EXTENSIONS: Record<string, string> = {

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.png': 'image/png',

    '.pdf': 'application/pdf'

}


// Convert detected MIME types into server-controlled extensions

const MIME_EXTENSIONS: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png',

    'application/pdf': 'pdf'

}


// Route parameter types

type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}


// Sanitize the original filename for metadata storage

function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'upload').slice(0, 255)

}


// Validate database identifiers

const taskIdSchema = {

    type: 'object',

    properties: {

        taskId: {

            type: 'integer',

            minimum: 1,

            maximum: 2147483647

        }

    },

    required: ['taskId'],

    additionalProperties: false

} as const


const attachmentIdSchema = {

    type: 'object',

    properties: {

        attachmentId: {

            type: 'integer',

            minimum: 1,

            maximum: 2147483647

        }

    },

    required: ['attachmentId'],

    additionalProperties: false

} as const


const attachmentResponseSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer'
        },

        taskId: {
            type: 'integer'
        },

        originalName: {
            type: 'string'
        },

        mimeType: {
            type: 'string'
        },

        extension: {
            type: 'string'
        },

        size: {
            type: 'integer'
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [

        'id',

        'taskId',

        'originalName',

        'mimeType',

        'extension',

        'size',

        'createdAt'

    ],

    additionalProperties: false

} as const


const attachmentsRoutes: FastifyPluginAsync = async (fastify) => {


    // Create private storage directories

    await mkdir(STAGING_DIR, {

        recursive: true,

        mode: 0o700

    })

    await mkdir(OBJECTS_DIR, {

        recursive: true,

        mode: 0o700

    })

    await chmod(STAGING_DIR, 0o700)

    await chmod(OBJECTS_DIR, 0o700)



    // Upload a task attachment

    fastify.post<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [

                fastify.authenticate

            ],

            config: {

                rateLimit: {

                    max: 20,

                    timeWindow: '1 hour'

                }

            },

            schema: {

                params: taskIdSchema,

                response: {

                    201: attachmentResponseSchema

                }

            }

        },

        async (request, reply) => {


            // Retrieve the authenticated user

            const user = request.currentUser!


            // Verify task ownership before consuming the file

            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.taskId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : { createdById: user.id })

                },

                select: {

                    id: true

                }

            })


            if (!task) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            // Ensure the request uses multipart/form-data

            if (!request.isMultipart()) {

                return reply.code(415).send({

                    error: 'Expected multipart/form-data'

                })

            }


            // Retrieve the uploaded file

            const part = await request.file({

                throwFileSizeLimit: false

            })


            if (!part) {

                return reply.code(400).send({

                    error: 'No file was provided'

                })

            }


            // Only accept the expected multipart field

            if (part.fieldname !== 'file') {

                // Consume the stream before returning

                await pipeline(

                    part.file,

                    new Writable({

                        write(_chunk, _encoding, callback) {

                            callback()

                        }

                    })

                )

                return reply.code(400).send({

                    error: 'The file field must be named "file"'

                })

            }


            // Generate server-controlled identifiers

            const storageKey = randomUUID()

            const stagingPath = join(

                STAGING_DIR,

                `${storageKey}.part`

            )

            const objectPath = join(

                OBJECTS_DIR,

                storageKey

            )


            let stagingFileCreated = false

            let objectFileCreated = false

            let metadataCreated = false


            try {


                // Create the temporary file without overwriting existing files

                const handle = await open(

                    stagingPath,

                    'wx',

                    0o600

                )

                stagingFileCreated = true


                // Stream the uploaded content to temporary storage

                await pipeline(

                    part.file,

                    handle.createWriteStream({

                        autoClose: true

                    })

                )


                // Check whether the multipart file was truncated

                if (part.file.truncated) {

                    return reply.code(413).send({

                        error: 'File exceeds the maximum allowed size'

                    })

                }


                // Inspect the stored file size

                const fileStats = await stat(stagingPath)


                if (fileStats.size === 0) {

                    return reply.code(400).send({

                        error: 'Empty files are not allowed'

                    })

                }


                if (fileStats.size > MAX_ATTACHMENT_SIZE) {

                    return reply.code(413).send({

                        error: 'File exceeds the maximum allowed size'

                    })

                }


                // Sanitize the original filename

                const originalName = sanitizeOriginalName(

                    part.filename

                )


                // Check the original extension against our allowlist

                const extension = extname(

                    originalName

                ).toLowerCase()


                const expectedMime = ALLOWED_EXTENSIONS[extension]


                if (!expectedMime) {

                    return reply.code(415).send({

                        error: 'Unsupported file extension'

                    })

                }


                // Detect the actual file format from its binary signature

                const detected = await fileTypeFromFile(

                    stagingPath,

                    {

                        maxBufferSize: 64 * 1024

                    }

                )


                if (!detected || detected.mime !== expectedMime) {

                    return reply.code(415).send({

                        error: 'File content does not match the allowed format'

                    })

                }


                // Compare the client-provided MIME type when available

                if (

                    part.mimetype !== 'application/octet-stream' &&

                    part.mimetype !== detected.mime

                ) {

                    return reply.code(415).send({

                        error: 'Declared MIME type does not match the file content'

                    })

                }


                // Determine the extension from the detected file type

                const detectedExtension = MIME_EXTENSIONS[

                    detected.mime

                ]


                if (!detectedExtension) {

                    return reply.code(415).send({

                        error: 'Unsupported file format'

                    })

                }


                // Move the validated file into private object storage

                await rename(

                    stagingPath,

                    objectPath

                )

                stagingFileCreated = false

                objectFileCreated = true


                // Save file metadata in PostgreSQL

                const attachment = await fastify.prisma.attachment.create({

                    data: {

                        taskId: task.id,

                        uploadedById: user.id,

                        originalName,

                        storageKey,

                        mimeType: detected.mime,

                        extension: detectedExtension,

                        size: Number(fileStats.size)

                    },

                    select: {

                        id: true,

                        taskId: true,

                        originalName: true,

                        mimeType: true,

                        extension: true,

                        size: true,

                        createdAt: true

                    }

                })


                metadataCreated = true


                // Return public attachment metadata

                return reply.code(201).send(attachment)

            } finally {


                // Remove any remaining temporary file

                if (stagingFileCreated) {

                    await unlink(stagingPath).catch(() => {})

                }


                // Remove stored content if database persistence failed

                if (objectFileCreated && !metadataCreated) {

                    await unlink(objectPath).catch(() => {})

                }

            }

        }

    )



    // Retrieve attachments belonging to a task

    fastify.get<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: taskIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.taskId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : { createdById: user.id })

                },

                select: {

                    id: true

                }

            })


            if (!task) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            return fastify.prisma.attachment.findMany({

                where: {

                    taskId: task.id

                },

                select: {

                    id: true,

                    taskId: true,

                    originalName: true,

                    mimeType: true,

                    extension: true,

                    size: true,

                    createdAt: true

                },

                orderBy: {

                    createdAt: 'desc'

                }

            })

        }

    )



    // Download an attachment

    fastify.get<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId/download',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: attachmentIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            // Retrieve only attachments the user is authorized to access

            const attachment = await fastify.prisma.attachment.findFirst({

                where: {

                    id: request.params.attachmentId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : {

                            task: {

                                is: {

                                    createdById: user.id

                                }

                            }

                        })

                }

            })


            if (!attachment) {

                return reply.code(404).send({

                    error: 'Attachment not found'

                })

            }


            // Verify the internal storage identifier

            if (

                !/^[0-9a-f-]{36}$/i.test(

                    attachment.storageKey

                )

            ) {

                throw new Error('Invalid internal storage identifier')

            }


            const filePath = join(

                OBJECTS_DIR,

                attachment.storageKey

            )


            // Open the stored file

            let handle

            try {

                handle = await open(filePath, 'r')

            } catch (error) {

                if (

                    typeof error === 'object' &&

                    error !== null &&

                    'code' in error &&

                    error.code === 'ENOENT'

                ) {

                    return reply.code(404).send({

                        error: 'Attachment content not found'

                    })

                }

                throw error

            }


            // Always force download rather than rendering user content

            return reply

                .header(

                    'Content-Type',

                    'application/octet-stream'

                )

                .header(

                    'Content-Disposition',

                    `attachment; filename="attachment-${attachment.id}.${attachment.extension}"`

                )

                .header(

                    'X-Content-Type-Options',

                    'nosniff'

                )

                .header(

                    'Cache-Control',

                    'private, no-store'

                )

                .header(

                    'Content-Length',

                    String(attachment.size)

                )

                .send(

                    handle.createReadStream({

                        autoClose: true

                    })

                )

        }

    )



    // Delete an attachment

    fastify.delete<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: attachmentIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            const attachment = await fastify.prisma.attachment.findFirst({

                where: {

                    id: request.params.attachmentId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : {

                            task: {

                                is: {

                                    createdById: user.id

                                }

                            }

                        })

                },

                select: {

                    id: true,

                    storageKey: true

                }

            })


            if (!attachment) {

                return reply.code(404).send({

                    error: 'Attachment not found'

                })

            }


            const filePath = join(

                OBJECTS_DIR,

                attachment.storageKey

            )


            // Remove the physical file

            try {

                await unlink(filePath)

            } catch (error) {

                if (

                    typeof error === 'object' &&

                    error !== null &&

                    'code' in error &&

                    error.code !== 'ENOENT'

                ) {

                    throw error

                }

            }


            // Remove the corresponding database record

            await fastify.prisma.attachment.delete({

                where: {

                    id: attachment.id

                }

            })


            return reply.code(204).send()

        }

    )

}

export default attachmentsRoutes
```

### Understanding the Implementation

Our implementation performs several important operations.

Let's examine the upload process carefully.

#### 1. Initialize Private Storage

At the beginning of the plugin, we create two directories:

```typescript
await mkdir(STAGING_DIR, {
    recursive: true,
    mode: 0o700
})

await mkdir(OBJECTS_DIR, {
    recursive: true,
    mode: 0o700
})
```

The `staging` directory temporarily stores incoming files.

The `objects` directory stores files that have passed our initial validation.

We also apply restrictive filesystem permissions.

#### 2. Authenticate and Authorize the Request

Before processing the uploaded content, we use:

```typescript
preHandler: [
    fastify.authenticate
]
```

This ensures that the client has a valid access token.

However, authentication alone is not sufficient.

We also query the database to determine whether the authenticated user can access the requested task.

For regular users, the task must belong to their account.

Administrators can access all tasks.

This is important because an attacker should not be able to upload attachments to another user's task simply by changing its ID.

Notice that we perform this authorization check before consuming the uploaded file stream.

#### 3. Retrieve the Uploaded File

We use:

```typescript
const part = await request.file()
```

This returns the uploaded file information and its readable stream.

We also check that the request uses `multipart/form-data`.

Our implementation expects the multipart field to be named:

```text
file
```

This makes the upload contract explicit.

#### 4. Generate a Unique Storage Key

We generate:

```typescript
const storageKey = randomUUID()
```

This produces a unique identifier controlled by our application.

We use it to construct both the temporary filename and the final storage location.

The original filename is never used to determine where the file is saved.

This prevents path traversal and filename-based overwriting attacks.

#### 5. Stream the File into Temporary Storage

We create a file using:

```typescript
const handle = await open(
    stagingPath,
    'wx',
    0o600
)
```

The `'wx'` flag is important.

It opens the file for writing but fails if a file with the same name already exists.

This prevents the application from unintentionally overwriting an existing file.

We then stream the uploaded content:

```typescript
await pipeline(
    part.file,
    handle.createWriteStream({
        autoClose: true
    })
)
```

The application receives the file incrementally and writes it directly to disk.

It does not accumulate the complete file in memory.

#### 6. Enforce the File Size Limit

After the stream finishes, we check:

```typescript
if (part.file.truncated) {
    return reply.code(413).send({
        error: 'File exceeds the maximum allowed size'
    })
}
```

The multipart plugin can mark a file stream as truncated when its configured file size limit is reached.

We explicitly configure `throwFileSizeLimit: false` so that our handler can inspect this state after consuming the stream.

If the upload exceeded the allowed size, we reject it.

We also inspect the actual file size using:

```typescript
const fileStats = await stat(stagingPath)
```

This gives us the size recorded by the filesystem.

#### 7. Validate the Original Extension

Next, we sanitize the original filename:

```typescript
const originalName = sanitizeOriginalName(
    part.filename
)
```

The function removes path components and control characters.

This filename is only metadata for display purposes.

We then extract its extension:

```typescript
const extension = extname(
    originalName
).toLowerCase()
```

And check it against our allowlist:

```typescript
const expectedMime = ALLOWED_EXTENSIONS[extension]
```

If the extension is unsupported, the request is rejected.

However, extension validation alone is insufficient because users can rename files without changing their actual content.

#### 8. Detect the Actual File Format

We use:

```typescript
const detected = await fileTypeFromFile(
    stagingPath,
    {
        maxBufferSize: 64 * 1024
    }
)
```

The library examines the binary content and attempts to determine the file format.

We then compare its result against the MIME type expected for the filename extension:

```typescript
if (!detected || detected.mime !== expectedMime) {

    return reply.code(415).send({

        error: 'File content does not match the allowed format'

    })

}
```

For example, if someone uploads a PDF renamed to:

```text
image.jpg
```

the extension suggests that the file is a JPEG, but the detected content indicates that it is a PDF.

The application rejects the upload.

We also compare the detected MIME type against the client-provided MIME type when the client has supplied a meaningful value.

This provides an additional consistency check, but the detected file content remains the important validation input.

#### 9. Move the File into Private Storage

After validation, we move the file:

```typescript
await rename(
    stagingPath,
    objectPath
)
```

The file now resides in our private object directory.

Its internal filename is still the server-generated UUID.

We deliberately do not preserve the original filename as the physical storage filename.

#### 10. Save the Metadata

Next, we create the database record:

```typescript
const attachment = await fastify.prisma.attachment.create({

    data: {

        taskId: task.id,

        uploadedById: user.id,

        originalName,

        storageKey,

        mimeType: detected.mime,

        extension: detectedExtension,

        size: Number(fileStats.size)

    }

})
```

Notice that:

- `taskId` comes from the authorized task.
- `uploadedById` comes from the authenticated user.
- `storageKey` is generated by the server.
- `mimeType` comes from file-content detection.
- `size` comes from the filesystem.

We do not accept these important values directly from the client.

Finally, we return the attachment metadata with HTTP `201 Created`.

We deliberately exclude the internal storage path and storage key from the public response.

### Understanding Error Cleanup

One important part of the implementation is the `try/finally` block.

Consider what happens if:

1. The file is successfully uploaded.
2. The file passes format validation.
3. The file is moved into permanent storage.
4. The database operation fails.

Without cleanup, we would have a file on disk without a corresponding database record.

We therefore track the storage state and remove the final file if database persistence fails.

Similarly, temporary files are removed when validation fails.

This is an example of compensating cleanup.

However, filesystem operations and database transactions cannot form one atomic transaction.

A process crash between moving a file and creating its database record can still leave an orphaned file.

Production systems should periodically reconcile database metadata with storage objects or use a durable storage workflow with an outbox and background cleanup process.

## Registering the Multipart and Attachment Plugins

Now that we have implemented our attachment routes, we need to register the multipart plugin and our new routes.

Update `src/app.ts`.

**`src/app.ts`:**

```typescript
import Fastify from 'fastify'

import rateLimit from '@fastify/rate-limit'

import multipart from '@fastify/multipart'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'
import attachmentsRoutes from './routes/attachments.js'

import {
    MAX_ATTACHMENT_SIZE
} from './config/uploads.js'


export function buildApp() {

    const fastify = Fastify({

        logger: true

    })


    // Register database functionality

    fastify.register(prismaPlugin)


    // Register authentication

    fastify.register(authPlugin)


    // Register rate limiting

    fastify.register(rateLimit, {

        global: false

    })


    // Register multipart processing

    fastify.register(multipart, {

        throwFileSizeLimit: false,

        limits: {

            fieldNameSize: 100,

            fieldSize: 1024,

            fields: 0,

            files: 1,

            fileSize: MAX_ATTACHMENT_SIZE,

            headerPairs: 100,

            parts: 1

        }

    })


    // Register application routes

    fastify.register(authRoutes, {

        prefix: '/api/auth'

    })


    fastify.register(userRoutes, {

        prefix: '/api/users'

    })


    fastify.register(taskRoutes, {

        prefix: '/api'

    })


    fastify.register(attachmentsRoutes, {

        prefix: '/api'

    })


    return fastify

}
```

Notice that we register the multipart plugin before the attachment routes.

This is necessary because the attachment routes depend on the request methods provided by `@fastify/multipart`.

We also register the plugin only once at the application level so that all relevant route plugins can access its functionality.

The multipart configuration restricts each request to one file and no additional ordinary form fields.

The maximum file size is 10 MiB.

We also rely on the rate-limiting plugin from Workshop 4 to restrict the number of upload requests.

Our complete attachment endpoints are now:

```text
POST   /api/tasks/:taskId/attachments

GET    /api/tasks/:taskId/attachments

GET    /api/attachments/:attachmentId/download

DELETE /api/attachments/:attachmentId
```

## Understanding Secure File Downloads

Uploading files is only one part of file management.

Users also need a way to retrieve the files they have uploaded.

However, file downloads introduce another important security requirement.

We must ensure that the application does not expose files directly to anyone who knows their storage location.

For example, suppose Alice uploads:

```text
project-report.pdf
```

The file is stored internally using a generated storage key.

A naive implementation might expose the file through:

```text
https://example.com/uploads/8f3a1b72...
```

This is problematic because direct file access can bypass our authentication and authorization mechanisms.

Instead, the application should retrieve files through a protected endpoint.

### Understanding the Download Flow

Our download endpoint follows this process:

```text
             CLIENT
                |
                v
        GET /attachments/:id
                |
                v
        AUTHENTICATION
                |
                v
        AUTHORIZATION
                |
                v
       Retrieve Attachment
          from Database
                |
                v
       Verify Resource Access
                |
                v
       Retrieve Storage Key
                |
                v
       Read Private File
                |
                v
       Stream File to Client
```

The important point is that access is checked before the file is opened.

For a regular user, the attachment must belong to a task created by that user.

An administrator can access all attachments.

If a user requests an attachment they cannot access, the application returns:

```text
404 Not Found
```

This prevents the API from directly revealing whether another user's attachment exists.

### Understanding Download Headers

Our implementation uses several HTTP headers:

```http
Content-Type: application/octet-stream

Content-Disposition: attachment; filename="attachment-15.pdf"

X-Content-Type-Options: nosniff

Cache-Control: private, no-store
```

Let's examine their purpose.

**Content-Type**

We use:

```http
Content-Type: application/octet-stream
```

This tells the browser to treat the response as generic binary content.

**Content-Disposition**

We use:

```http
Content-Disposition: attachment
```

This instructs the browser to download the response instead of displaying it directly.

We also generate the download filename ourselves.

We do not put the original user-provided filename directly into the HTTP response header.

This avoids introducing unnecessary risks involving untrusted filenames and header construction.

**X-Content-Type-Options**

We use:

```http
X-Content-Type-Options: nosniff
```

This instructs browsers not to override the declared content type through MIME sniffing.

**Cache-Control**

We use:

```http
Cache-Control: private, no-store
```

This prevents shared caches from storing responses containing private attachments.

These headers are useful defenses, but they do not replace authentication or authorization.

## Testing the Attachment System

Now that our implementation is complete, we need to verify that uploads, downloads, and authorization behave correctly.

Make sure PostgreSQL is running and start the application:

```bash
npm run dev
```

We will use the accounts and tokens created in Workshop 4.

For our examples:

```bash
ALICE_TOKEN="YOUR_ALICE_ACCESS_TOKEN"

BOB_TOKEN="YOUR_BOB_ACCESS_TOKEN"
```

### 1. Uploading a File

Assume Alice has already created a task with ID `1`.

We can upload a PDF attachment using:

```bash
curl -i -X POST \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -F "file=@./report.pdf"
```

The `-F` option tells curl to create a multipart form request.

The uploaded file is sent using the field name:

```text
file
```

If the upload succeeds, the server should return:

```text
201 Created
```

The response should contain something similar to:

```json
{
    "id": 1,
    "taskId": 1,
    "originalName": "report.pdf",
    "mimeType": "application/pdf",
    "extension": "pdf",
    "size": 524288,
    "createdAt": "2026-11-15T..."
}
```

Notice that the response does not expose the filesystem path or internal storage key.

### 2. Retrieving Task Attachments

We can retrieve the attachment metadata using:

```bash
curl -i \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

The server returns the attachments associated with Alice's task.

The response contains metadata rather than the actual binary content.

### 3. Downloading an Attachment

Assuming the attachment ID is `1`, download it using:

```bash
curl -i \
    http://127.0.0.1:3000/api/attachments/1/download \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -o downloaded-report.pdf
```

The server verifies Alice's identity and checks whether she is authorized to access the attachment.

If the operation succeeds, curl saves the returned binary content into:

```text
downloaded-report.pdf
```

We can inspect the downloaded file using:

```bash
file downloaded-report.pdf
```

The output should identify it as a PDF document.

### 4. Deleting an Attachment

We can delete an attachment using:

```bash
curl -i -X DELETE \
    http://127.0.0.1:3000/api/attachments/1 \
    -H "Authorization: Bearer $ALICE_TOKEN"
```

The server checks whether Alice owns the task associated with the attachment.

If the operation succeeds, it returns:

```text
204 No Content
```

The physical file and its corresponding database record are removed.

For production applications, this operation should use a durable deletion workflow so database and storage failures can be reconciled.

### 5. Testing Unauthorized Access

Now let's verify that our application prevents users from accessing one another's files.

Assume Alice has uploaded an attachment associated with task `1`.

Bob attempts to retrieve its metadata:

```bash
curl -i \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -H "Authorization: Bearer $BOB_TOKEN"
```

The server should return:

```text
404 Not Found
```

Bob should also be unable to download Alice's attachment:

```bash
curl -i \
    http://127.0.0.1:3000/api/attachments/1/download \
    -H "Authorization: Bearer $BOB_TOKEN"
```

The expected response is:

```text
404 Not Found
```

This confirms that file access is protected by the same resource-ownership principles we introduced in Workshop 4.

### 6. Testing Invalid File Types

Let's create a file containing ordinary text:

```bash
echo "This is not a PDF document" > fake.pdf
```

Although the filename ends with `.pdf`, the content is not a valid PDF signature.

Attempt to upload it:

```bash
curl -i -X POST \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -F "file=@./fake.pdf;type=application/pdf"
```

The backend should reject the request with:

```text
415 Unsupported Media Type
```

This demonstrates why checking only the filename or client-provided MIME type is insufficient.

### 7. Testing File Size Restrictions

We can generate a file larger than the allowed limit:

```bash
truncate -s 11M oversized.pdf
```

Now attempt to upload it:

```bash
curl -i -X POST \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -F "file=@./oversized.pdf"
```

The application should reject the upload with:

```text
413 Payload Too Large
```

The partially written temporary file must also be removed.

### 8. Testing Missing Authentication

Try uploading a file without providing an access token:

```bash
curl -i -X POST \
    http://127.0.0.1:3000/api/tasks/1/attachments \
    -F "file=@./report.pdf"
```

The application should return:

```text
401 Unauthorized
```

This confirms that file upload endpoints are protected by the authentication mechanism introduced in Workshop 4.

## Modern Production File Storage

Our implementation uses the local filesystem to make the upload process easier to understand.

However, modern applications often require a storage architecture that can scale across multiple application instances.

Let's examine how we can evolve our implementation.

### Private Object Storage

For production systems, we can use object storage such as Amazon S3 or another S3-compatible service.

The database continues to store metadata, while the actual files reside in a private storage bucket.

For example:

```text
             FASTIFY API
                  |
                  |
          ┌───────┴────────┐
          |                |
          v                v
      POSTGRESQL       OBJECT STORAGE
          |                |
          v                v
      METADATA          FILE CONTENT
```

This provides several advantages:

- Storage can scale independently of the backend.
- Multiple application instances can access the same files.
- Storage capacity is not limited by the application's local disk.
- Object storage can provide durability and lifecycle-management features.
- The backend does not need to serve all large file transfers itself.

### Understanding Presigned URLs

A particularly useful object-storage feature is the presigned URL.

Instead of transmitting the complete file through Fastify, the backend generates a temporary URL that allows the client to upload directly to storage.

The process works as follows:

1. The client requests permission to upload a file.
2. Fastify authenticates the user.
3. Fastify verifies that the user can upload to the requested task.
4. Fastify generates a short-lived upload URL for a server-controlled object key.
5. The client uploads directly to object storage.
6. The client notifies Fastify that the upload has completed.
7. Fastify verifies the stored object and validates its metadata and content.
8. Fastify saves the attachment metadata in PostgreSQL.

This architecture reduces the amount of file data passing through our application server.

However, presigned URLs introduce their own security considerations.

They should:

- Have short expiration times.
- Refer only to server-generated object keys.
- Restrict the permitted operation.
- Use private storage buckets.
- Enforce appropriate content-length and content-type conditions where supported.
- Avoid granting unnecessary access to other objects.

The backend must not assume that a successful object-storage upload means the content is safe.

It must still validate the object before making it available for download.

## Important Production Security Considerations

The implementation we built provides several important security protections, but production systems require additional measures.

### 1. Private Storage

Files should not be directly accessible through a public web directory.

Our application stores them under:

```text
var/uploads/objects/
```

and exposes them only through authorized backend endpoints.

Production systems should use private object-storage buckets or private filesystem storage.

### 2. Malware Scanning

File signatures identify likely formats, but they cannot guarantee that uploaded files are safe.

For production systems, uploaded files should be placed in quarantine and scanned using an appropriate antivirus or sandboxing service.

For example, a background worker can process newly uploaded files and update their status:

```text
PENDING_SCAN
      |
      v
   SCANNING
      |
   ┌──┴──┐
   |     |
   v     v
 CLEAN  REJECTED
   |
   v
AVAILABLE
```

Only files marked as available after the required security checks should be downloadable.

For supported document formats, Content Disarm and Reconstruction (CDR) may also be appropriate.

### 3. File Content Processing

If we introduce image processing, thumbnail generation, or document conversion, those operations must happen in appropriately isolated workers.

Uploaded content must be treated as untrusted input.

We should use maintained processing libraries, resource limits, execution timeouts, and sandboxing where appropriate.

### 4. Storage Quotas

Per-file size limits are not sufficient for applications that allow users to upload many files.

We should also enforce:

- Maximum storage per user.
- Maximum number of attachments per task.
- Total application storage limits.
- Upload rate limits.
- Retention policies.

This prevents an authenticated user from exhausting the entire storage capacity simply by repeatedly uploading files that individually satisfy the size restrictions.

### 5. Database and Storage Consistency

PostgreSQL transactions cannot automatically include filesystem operations or external object-storage operations.

For example, deleting a task may cascade-delete its attachment records, but the physical files will remain in storage.

Similarly, a server crash could happen after a file is saved but before its metadata is committed.

Production applications should consider:

- Background cleanup workers.
- Periodic storage reconciliation.
- Transactional outbox patterns.
- Durable deletion queues.
- Retry mechanisms for failed storage operations.

This ensures that files and their database metadata remain consistent over time.

### 6. Secure Downloads

Every download operation must enforce authentication and authorization.

We should also:

- Force downloads for untrusted user content.
- Set `X-Content-Type-Options: nosniff`.
- Use appropriate cache-control headers.
- Avoid putting user-supplied filenames directly into HTTP headers.
- Avoid exposing internal filesystem paths.
- Apply rate limits where appropriate.

### 7. Cross-Site Request Forgery

Our examples use Bearer tokens in the Authorization header.

If the application later changes to cookie-based authentication, we must consider CSRF protection.

Browsers automatically attach eligible cookies to requests, so malicious websites may attempt to trigger unwanted upload operations.

Appropriate SameSite cookie configuration and CSRF protections are therefore necessary for cookie-based authentication.

### 8. Upload Infrastructure

File uploads can consume considerable network and storage resources.

Production deployments should also configure:

- Request-size restrictions at the reverse proxy.
- Request and connection timeouts.
- Storage monitoring.
- Rate limiting.
- Appropriate disk permissions.
- Persistent storage and backups.

The application-level limits should complement, not replace, infrastructure-level protections.

## Tasks

Now that we understand how file uploads and secure file management work, let's extend our application through practical exercises.

### Task 1: Multiple Attachments

Extend the Task Management API to allow users to upload multiple attachments to a single task.

Requirements:

- Use `request.files()` to process multiple file streams.
- Limit each file to 10 MB.
- Allow a maximum of five files per request.
- Reject unsupported file types.
- Generate a unique storage identifier for every file.
- Store file metadata in PostgreSQL.
- Associate every attachment with its task and uploader.
- Ensure that all uploaded files are cleaned up if processing fails.

The objective is to understand how Fastify handles multiple multipart streams and how to manage several filesystem operations safely.

### Task 2: User Storage Quotas

Introduce storage quotas for regular users.

For this exercise, define:

```text
Maximum storage per user: 100 MB

Maximum attachment size: 10 MB

Maximum attachments per task: 10
```

Requirements:

- Calculate the user's current storage usage.
- Reject uploads that exceed the user's quota.
- Prevent simultaneous uploads from bypassing the quota.
- Update the storage usage when attachments are deleted.
- Return an appropriate HTTP error when the quota is exceeded.

Consider how database transactions and concurrent requests affect storage accounting.

### Task 3: Image Processing and Thumbnails

Extend the application to generate thumbnails for uploaded JPEG and PNG images.

Use an appropriate image-processing library such as `sharp`.

Requirements:

- Accept JPEG and PNG images.
- Generate thumbnails with a maximum width of 300 pixels.
- Preserve the image aspect ratio.
- Strip unnecessary metadata.
- Store the generated thumbnails separately.
- Keep the original image.
- Ensure that image processing has appropriate resource limits.

This task introduces another important backend concept: processing uploaded content asynchronously or through dedicated background workers.

### Task 4: Antivirus Scanning

Introduce an antivirus-scanning stage into the upload workflow.

Use an appropriate scanning solution, such as ClamAV, in an isolated environment.

Update the attachment lifecycle to support:

```text
PENDING_SCAN
SCANNING
AVAILABLE
REJECTED
```

Requirements:

- Store newly uploaded files in quarantine.
- Do not allow downloads while a file is pending scanning.
- Scan uploaded content using the antivirus service.
- Mark clean files as available.
- Reject files identified as malicious.
- Remove rejected files from storage.
- Handle scanning failures without exposing unscanned files.

The objective is to understand why file validation and malware detection are separate responsibilities.

### Task 5: Implement Private Object Storage

Replace the local filesystem storage implementation with an S3-compatible object-storage service.

Use MinIO for local development or another suitable object-storage provider.

Requirements:

- Create a private storage bucket.
- Upload files using server-controlled object keys.
- Implement short-lived presigned upload URLs.
- Verify uploaded objects before creating database records.
- Implement authorized downloads.
- Ensure that storage buckets are never publicly accessible.
- Keep database metadata separate from binary content.

This task introduces an architecture commonly used by modern production applications.

## Conclusion

In this workshop, we extended our Task Management API by implementing file uploads and file management using Fastify.

We started by understanding how HTTP transmits files through `multipart/form-data` and how Node.js streams allow applications to process large files without loading their entire contents into memory.

We then explored the security risks associated with file uploads, including unrestricted file types, MIME type spoofing, path traversal, oversized uploads, and malicious content.

Next, we integrated `@fastify/multipart` and implemented a streaming upload system with file size restrictions, extension validation, MIME type checks, and binary signature detection.

We extended our PostgreSQL database using Prisma to store attachment metadata and associate uploaded files with their tasks and users.

Finally, we implemented private file storage, authenticated downloads, attachment management, and resource-level authorization.

We also explored how production applications can evolve toward private object storage, presigned URLs, antivirus scanning, and background file-processing services.

File uploads are a fundamental feature in many backend applications, but they also introduce responsibilities beyond simply receiving and saving binary data.

A well-designed upload system must control what it accepts, where it stores files, how users access them, and how uploaded content is processed.

In the next workshop, we will build on these foundations by exploring more advanced backend application architecture, including services, repositories, centralized error handling, and automated testing.

This will help us move from a collection of working endpoints toward a more structured, maintainable, and scalable backend application.

## References

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Fastify Lifecycle Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [Fastify Plugin Architecture](https://fastify.dev/docs/latest/Reference/Plugins/)
- [@fastify/multipart Documentation](https://github.com/fastify/fastify-multipart)
- [@fastify/multipart Security Advisories](https://github.com/fastify/fastify-multipart/security/advisories)
- [Node.js Streams Documentation](https://nodejs.org/api/stream.html)
- [Node.js Filesystem Documentation](https://nodejs.org/api/fs.html)
- [file-type Documentation](https://github.com/sindresorhus/file-type)
- [Prisma ORM Documentation](https://www.prisma.io/docs/orm/v7)
- [Prisma Relations](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/relations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)