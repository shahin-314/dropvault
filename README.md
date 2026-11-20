# DropVault

A backend REST API for cloud file storage and file management, built with Node.js, Express, PostgreSQL and Supabase Storage.

## Features

- User registration and login with bcrypt password hashing
- JWT-based authentication
- User profile endpoint
- Password reset through email using Resend
- Secure file upload and download
- 1 GB storage quota per user
- 4 MB maximum upload size
- SHA-256 file hashing and duplicate upload detection
- Trash, restore and permanent deletion
- Login history and last-login tracking
- Rate limiting for authentication and uploads
- Interactive API documentation with Swagger UI

## Tech Stack

- Node.js
- Express.js
- PostgreSQL (Supabase)
- Supabase Storage
- JWT
- bcrypt
- Multer
- Resend
- Swagger UI

## Project Structure

```text
src/
├── config/
├── controllers/
├── docs/
├── middleware/
├── routes/
├── services/
├── db.js
└── server.js
database/
└── migrations/
```

## Getting Started

### Requirements

- Node.js
- npm
- Supabase project with PostgreSQL and Storage configured
- Resend API key for password reset emails

### Installation

```bash
git clone https://github.com/shahin-314/dropvault.git
cd dropvault
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Fill in the required environment variables in `.env`.

### Environment Variables

| Variable | Purpose |
|---|---|
| PORT | API server port |
| DATABASE_URL | PostgreSQL connection string |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| JWT_SECRET | Secret used to sign JWTs |
| RESEND_API_KEY | Resend email API key |
| API_DOCS_URL | Swagger documentation URL |

Never commit `.env` or expose service-role keys.

### Database Setup

Run the SQL migration in `database/migrations/001_dropvault_additions.sql` against your Supabase PostgreSQL database.

The base `users` and `files` tables must already exist.

### Start the Server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API Documentation

Once the server is running, open:

`http://localhost:3000/api-docs`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/profile` | Get authenticated user profile |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password using token |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/my-files` | List active files |
| GET | `/api/files/trash` | List trashed files |
| PATCH | `/api/files/:fileId/restore` | Restore file |
| DELETE | `/api/files/:fileId` | Move file to Trash |
| DELETE | `/api/files/:fileId/permanent` | Permanently delete file |
| GET | `/api/files/download/:fileId` | Download file |

Protected endpoints require a JWT Bearer token.

## Security

- Passwords are hashed using bcrypt.
- Authentication uses signed JWTs.
- Password reset tokens are stored as SHA-256 hashes, expire after 30 minutes and are single-use.
- File operations verify ownership.
- Uploads have size and storage quota limits.
- Authentication and upload routes have rate limits.

## Testing

Implemented API flows have been manually tested using Swagger UI, including registration/login, password reset, file upload/download, duplicate detection, Trash, restore and permanent deletion.

An automated test suite is not yet configured.

## Future Improvements

- Automated integration tests
- File sharing and access permissions
- File versioning
- Background processing
- Caching and observability

---

Built as a hands-on backend engineering project.
