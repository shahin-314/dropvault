# DropVault

DropVault is a backend project I built to understand how a cloud file storage service works.

The idea is simple: a user should be able to create an account, log in, upload files, see their uploaded files, download them, and manage deleted files through a Trash section.

I wanted to build more than a basic file upload API. While working on this project, I focused on authentication, database operations, file storage, duplicate detection, storage limits, and handling errors safely.

This project currently provides a REST API. It does not include a separate frontend application.

## What can you do with DropVault?

- Create an account and log in.
- Access a protected user profile.
- Upload and download files.
- View files uploaded to your account.
- Detect duplicate uploads using file hashes.
- Keep uploads within a 1 GB per-user storage quota.
- Move files to Trash and restore them later.
- Permanently delete files from Trash.
- Request a password reset through email.
- Track successful login activity.
- Explore and test endpoints through Swagger UI.

## How the project works

DropVault uses two main storage components:

**PostgreSQL** stores information about users and their files. For example, when a file is uploaded, its name, size, storage location, and other details are saved in the database.

**Supabase Storage** stores the actual file content. This keeps file data separate from the database records.

The backend connects these two parts. It checks who is making a request, validates the operation, communicates with the database or storage service, and sends the result back to the client.

### A simple file upload flow

1. The user logs in and receives a JWT.
2. The user sends a file upload request with the JWT.
3. The authentication middleware verifies the token.
4. The upload route checks the file and its size.
5. DropVault calculates a SHA-256 hash of the file.
6. It checks whether the same user has already uploaded that file.
7. It checks whether the user's storage quota would be exceeded.
8. The file is uploaded to Supabase Storage.
9. File information is saved in PostgreSQL.
10. The API returns the upload result.

If saving the file information in the database fails after the storage upload, the uploaded storage object is cleaned up. This helps avoid leaving an untracked file behind.

### How duplicate detection works

A file's SHA-256 hash is used as a fingerprint of its content.

When a user uploads a file, DropVault calculates its hash and checks it against the hashes already stored for that user.

If the same hash already exists, the API rejects the upload instead of storing another copy for that user.

The database also has a unique partial index on the user and file hash to support this check.

### How Trash works

Deleting a file does not immediately remove the actual file from storage.

Instead, DropVault updates the file's `deleted_at` field in PostgreSQL. This is called a soft delete.

- The normal file list does not show trashed files.
- The Trash endpoint lists deleted files.
- Restore sets `deleted_at` back to `NULL`.
- Permanent deletion removes the object from Supabase Storage and then removes its database record.

This gives users a chance to recover files before permanently deleting them.

## Authentication and password reset

Passwords are hashed using bcrypt before they are stored in PostgreSQL. The original password is not stored.

After a successful login, the server creates a signed JWT containing the user's ID and email. The token expires after one hour.

Protected routes use authentication middleware to verify the token before allowing access to the requested resource.

### Password reset flow

1. A user submits their registered email address.
2. DropVault generates a random reset token.
3. Only the SHA-256 hash of that token is stored in PostgreSQL.
4. The original token is sent by email using Resend.
5. The token expires after 30 minutes.
6. The user submits the token along with a new password.
7. The server checks that the token is valid, unused, and not expired.
8. The password is updated and the token is marked as used.

A reset token can only be used once. The forgot-password endpoint also returns a generic response so that it does not reveal whether an email address has an account.

## Login activity

DropVault records successful logins in a `login_history` table and updates `last_login_at` in the users table.

The login-history insert and last-login update are performed inside a database transaction. This keeps the two updates together.

## Technology used

| Technology | Why it is used |
|---|---|
| Node.js | JavaScript runtime for the backend |
| Express.js | Building REST API routes and middleware |
| PostgreSQL | Storing users, file metadata and login activity |
| Supabase | PostgreSQL hosting and file storage |
| JWT | Authentication for protected endpoints |
| bcrypt | Password hashing |
| Multer | Handling multipart file uploads |
| Resend | Sending password reset emails |
| Swagger UI | API documentation and manual testing |

## Project structure

```text
src/
├── config/
│   └── supabase.js
├── controllers/
├── docs/
│   └── swagger.js
├── middleware/
│   ├── auth.middleware.js
│   └── rate-limit.middleware.js
├── routes/
│   ├── auth.routes.js
│   ├── file.routes.js
│   ├── health.routes.js
│   └── upload.routes.js
├── services/
│   └── email.service.js
├── db.js
└── server.js

database/
└── migrations/
    └── 001_dropvault_additions.sql
```

The routes handle incoming API requests. Middleware is used for authentication and rate limiting. The services folder contains reusable operations such as sending password reset emails. Database and Supabase configuration are kept separate from route logic.

## API endpoints

All endpoints are available under the `/api` prefix.

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check whether the API is running |

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET | `/api/auth/profile` | Get the logged-in user's profile |
| POST | `/api/auth/forgot-password` | Request a password reset email |
| POST | `/api/auth/reset-password` | Set a new password using a reset token |

### File management

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files/my-files` | List active files |
| GET | `/api/files/trash` | List files in Trash |
| GET | `/api/files/download/:fileId` | Download a file |
| DELETE | `/api/files/:fileId` | Move a file to Trash |
| PATCH | `/api/files/:fileId/restore` | Restore a file |
| DELETE | `/api/files/:fileId/permanent` | Permanently delete a trashed file |

Protected endpoints require a Bearer token in the Authorization header.

## Limits and security

- Maximum file size: 4 MB.
- Storage quota: 1 GB per user.
- JWT expiry: 1 hour.
- Password reset token expiry: 30 minutes.
- Authentication requests are rate-limited to 10 requests per 15 minutes.
- Upload requests are rate-limited to 20 requests per 15 minutes.
- File operations check ownership before accessing a user's files.
- Passwords and reset tokens are not stored as plain text.

## Run locally

### Requirements

- Node.js and npm
- A Supabase project with PostgreSQL and Storage configured
- A Resend API key for password reset emails

### 1. Clone the repository

```bash
git clone https://github.com/shahin-314/dropvault.git
cd dropvault
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env
```

Add your own values to `.env`.

| Variable | Description |
|---|---|
| `PORT` | Port used by the server |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret used to sign JWTs |
| `RESEND_API_KEY` | Resend API key |
| `API_DOCS_URL` | URL of the Swagger documentation |

Never commit your actual `.env` file or share your service role key.

### 4. Set up the database

Run `database/migrations/001_dropvault_additions.sql` in the Supabase SQL Editor.

This migration adds file hashes, Trash support, login tracking, and password reset token storage.

The base `users` and `files` tables must already exist.

### 5. Start the server

For development:

```bash
npm run dev
```

For a normal start:

```bash
npm start
```

## API documentation

Swagger UI is available at:

`http://localhost:3000/api-docs`

It provides an interactive way to view endpoints, enter request data, authorize with a JWT, and try API calls.

## Testing

I manually tested the main API flows using Swagger UI.

These checks included registration and login, protected profile access, password reset, file upload and download, duplicate upload rejection, and the Trash, restore, and permanent-delete flow.

An automated test suite has not been added yet.

## Current limitations and possible next steps

This is an actively developed backend project. Some features that could make it more complete are:

- Automated unit and integration tests.
- Sharing files with other users.
- File version history.
- Background jobs for longer-running tasks.
- Caching and better monitoring.
- A separate web interface for users.

These are future improvements, not features currently included in the API.

## Project links

- GitHub: https://github.com/shahin-314/dropvault
- API: https://dropvault-taupe.vercel.app
- API health check: https://dropvault-taupe.vercel.app/api/health

---

I built DropVault to get practical experience with backend development and to understand how authentication, databases, file storage, and API design fit together in a real application.
