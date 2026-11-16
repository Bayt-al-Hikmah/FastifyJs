# Antivirus Scanning and Quarantine (Workshop 5 Solution)

This solution implements **Task 4** of Workshop 5. It integrates a **malware detection and quarantine pipeline** into the file upload workflow. Files are received into an isolated quarantine zone, registered with a scan lifecycle status (`PENDING_SCAN`), and prevented from being downloaded until verified clean. The solution includes a built-in mock scanner that detects the standard EICAR test string, as well as production-ready TCP streaming support for a live **ClamAV** daemon.

### What This Solution Demonstrates

- **Quarantine Isolation:** Stashes newly uploaded files in an isolated quarantine directory (`var/uploads/quarantine`) before any user can access them.
- **Attachment Scan Lifecycle:** Uses a Prisma `ScanStatus` enum tracking the file through four distinct states:
  - `PENDING_SCAN`: Awaiting scan worker pickup.
  - `SCANNING`: Currently being analyzed by the scanner.
  - `AVAILABLE`: Verified clean and promoted to storage (`var/uploads/storage`).
  - `REJECTED`: Identified as malicious or corrupt; unlinked from disk.
- **Download Gatekeeping:** Requests to `GET /api/attachments/:id` return `423 Locked` while scanning is in progress and `403 Forbidden` if rejected.
- **Dual Scanner Modes:**
  - **Mock Scanner (Default):** Runs without external infrastructure dependencies, scanning incoming buffers for the standard harmless EICAR test signature (`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`).
  - **ClamAV Network Daemon:** Connects over TCP to ClamAV (`clamd`) using the standard `zINSTREAM` streaming protocol for production environments.
- **Secure File Destruction:** Automatically shreds/deletes quarantined payloads immediately when malware or signature violations are detected.
- **Frontend Live Dashboard:** An interactive web client at `/app` showing real-time badge updates (`PENDING_SCAN` -> `AVAILABLE` or `REJECTED`).

### Project Structure

- `prisma/schema.prisma` — Schema with `ScanStatus` enum, `User`, `Task`, and `Attachment` models.
- `prisma7.config.ts` — Prisma configuration file.
- `src/lib/scanner.ts` — Mock EICAR engine and ClamAV TCP network scanner client.
- `src/lib/file-storage.ts` — Storage layout management (`quarantine`, `storage`, safe promotion, and unlinking).
- `src/lib/password.ts` — Argon2id password utilities.
- `src/lib/prisma-errors.ts` — Prisma error detection helper.
- `src/config/scans.ts` — Scanner timeouts, ClamAV host/port, and quarantine path configuration.
- `src/plugins/scanner.ts` — Fastify plugin decorating the instance with the active scanner service.
- `src/plugins/auth.ts` — JWT authentication and role checks.
- `src/plugins/prisma.ts` — Prisma Client lifecycle plugin.
- `src/plugins/static.ts` — Serves the dashboard from `public/`.
- `src/routes/attachments.ts` — Quarantined upload flow, status polling, and gated download endpoint.
- `src/routes/tasks.ts` — Task CRUD routes.
- `src/routes/auth.ts` — Authentication routes (`/register`, `/login`).
- `src/routes/users.ts` — Profile management (`/me`).
- `public/app/` — Live quarantine dashboard (`index.html`, `app.js`, `styles.css`).
- `package.json` — Dependencies and scripts.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Create the Database and Role**

```bash
sudo -i -u postgres
psql
```

Create a dedicated role and database:

```sql
CREATE ROLE w5_task4_antivirus_scanning_user
WITH LOGIN PASSWORD 'change_me'
CREATEDB;

CREATE DATABASE w5_task4_antivirus_scanning
OWNER w5_task4_antivirus_scanning_user;

\q
```

**3. Configure Environment Variables**

```bash
cp .env.example .env
```

Generate a secure 32-byte secret for JWT signing:

```bash
openssl rand -base64 32
```

Edit `.env`:

```env
DATABASE_URL="postgresql://w5_task4_antivirus_scanning_user:change_me@localhost:5432/w5_task4_antivirus_scanning?schema=public"
JWT_SECRET="YOUR_GENERATED_SECRET_HERE"
UPLOAD_DIR="./var/uploads"
CLAMAV_HOST=""
CLAMAV_PORT="3310"
SCANNER_TIMEOUT_MS="15000"
MOCK_SCAN_DELAY_MS="500"
```

*(Note: Leaving `CLAMAV_HOST` empty activates the built-in mock scanner).*

**4. Run Migrations and Generate Prisma Client**

```bash
npx prisma migrate dev --name init_antivirus
npx prisma generate
```

**5. Start the Server**

```bash
npm run dev
```

Visit the dashboard in your browser: `http://127.0.0.1:3000/app/`.

### Exploring the Solution

**1. Upload a Clean File**

In the web interface at `http://127.0.0.1:3000/app/` (or via `curl`):
- Log in and upload a benign document `clean-notes.txt`.
- The dashboard shows the status transition: `PENDING_SCAN` -> `SCANNING` -> `AVAILABLE`.
- Once `AVAILABLE`, the file is moved out of quarantine and can be downloaded.

**2. Upload the EICAR Standard Antivirus Test Signature**

Create a benign text file containing the universal EICAR test string:

```bash
echo -n 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar-test.com.txt
```

Upload the test file:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks/1/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@eicar-test.com.txt"
```

Observe the response and terminal log:
- The mock scanner identifies the EICAR test signature.
- The attachment status is set to `REJECTED`.
- The file is immediately purged from `var/uploads/quarantine/`.
- Attempts to download `GET /api/attachments/:id` return `403 Forbidden` with `"Attachment was rejected by security scan"`.

### Workshop Objective

By completing this task, you have learned why binary file validation must be decoupled from malware scanning, how to design quarantine storage workflows, how to enforce status-gated access controls, and how to interface with daemon-based antivirus scanners.
