# Password Hashing (Workshop 4 Example)

This small command-line example isolates the most important rule in authentication: **never store a password, store a password hash**. It uses Argon2id to hash the same password twice, shows that the two hashes differ because each one gets a fresh random salt, and verifies correct, incorrect, and malformed hashes.

There is no database, HTTP server, or browser interface. The output is intentionally verbose so you can read the encoded parameters and see the behaviour directly in the terminal.

### What You'll Learn

- **Why hashes beat plain text:** A database leak should not reveal usable passwords.
- **Salting:** A unique random salt means identical passwords produce different hashes.
- **Argon2id:** Use a memory-hard algorithm with explicit cost parameters.
- **OWASP baseline:** 19 MiB of memory, two iterations, and one lane of parallelism.
- **Verification:** Compare a candidate password with an encoded hash without reversing it.
- **Failure safety:** A malformed or truncated hash returns `false`, never an authenticated result.
- **Hash anatomy:** Read the `$argon2id$v=19$m=...,t=...,p=...$salt$hash` format.
- **Separation of concerns:** Keep hashing helpers in a small module that routes can reuse.

### Project Structure

```text
password-hashing/
├── src/
│   ├── demo.ts                  # Runs the comparison and prints results
│   └── password.ts              # hashPassword() and verifyPassword()
├── package.json
└── tsconfig.json
```

### Prerequisites

- Node.js 20 or newer.
- No database or environment file is required.

`argon2` is a native module. The package ships prebuilt binaries for common platforms; if installation compiles from source, you may need a C++ build toolchain.

### Getting Started

**1. Install Dependencies**

```bash
npm install
```

**2. Run the Demo**

```bash
npm run demo
```

**3. Watch the Output**

The script prints:

1. The Argon2id configuration.
2. The original password and a reminder that it is never stored.
3. Two hashes of the same password.
4. The parameter and salt portions of each hash.
5. A confirmation that the hashes differ.
6. Verification of the correct password (`true`).
7. Verification of a wrong password (`false`).
8. Verification of a malformed hash (`false`).

### Understanding the Output

A typical encoded hash looks like this:

```text
$argon2id$v=19$m=19456,t=2,p=1$<base64-salt>$<base64-hash>
```

| Segment | Meaning |
|---|---|
| `argon2id` | The algorithm variant |
| `v=19` | Argon2 version |
| `m=19456` | Memory cost in KiB (19 MiB) |
| `t=2` | Time cost: two passes |
| `p=1` | Parallelism: one lane |
| `<base64-salt>` | A fresh random salt for this hash |
| `<base64-hash>` | The derived key |

The salt is stored alongside the hash, which is safe: its purpose is to make precomputed tables useless and to ensure two identical passwords do not produce identical hashes.

### Exploring the Example

| Try this | What to notice |
|---|---|
| Run the demo twice | Every run produces new salts and therefore new hashes. |
| Hash the same password twice | `firstHash !== secondHash`, yet both verify successfully. |
| Change one character in the candidate password | Verification returns `false`. |
| Paste a truncated hash | Verification returns `false` instead of throwing into the caller. |
| Raise `memoryCost` | Hashing takes more memory and more time. |
| Lower `timeCost` | Hashing gets faster, which also makes guessing cheaper. |
| Print `hash.length` | The encoded string includes the parameters and salt. |

### Using the Helpers Elsewhere

```ts
import { hashPassword, verifyPassword } from './password.js'

const storedHash = await hashPassword('correct-horse-battery-staple')

const valid = await verifyPassword(storedHash, 'correct-horse-battery-staple')
// true

const invalid = await verifyPassword(storedHash, 'wrong-password')
// false
```

Registration calls `hashPassword()` once and stores the result. Login calls `verifyPassword()` with the stored hash and the submitted password.

### Practical Notes

- **Do not invent your own scheme.** Use a maintained library such as `argon2`.
- **Tune costs for your hardware.** The example uses OWASP’s recommended minimum. Benchmark on production hardware.
- **Never log passwords or hashes.** Logs are often retained longer than databases.
- **Use a dummy hash for unknown accounts.** This keeps login timing closer to the wrong-password path.
- **Consider rehashing later.** If parameters change, verify with the old hash and rehash after a successful login.
- **Use HTTPS.** Hashing protects stored passwords; TLS protects passwords in transit.

### Useful Scripts

| Script | Purpose |
|---|---|
| `npm run demo` | Run the hashing comparison |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled demo |

### Workshop Objective

By the end of this example, you should be able to explain why passwords are salted and hashed, read an Argon2id encoded hash, choose sensible cost parameters, and verify a password without ever storing or comparing plain text.
