# Bondery API Server

Fastify-based REST API server for the Bondery application.

## Overview

This server handles all API requests for the Bondery webapp, including:

- **Contacts** - CRUD operations for contacts/people
- **Account** - User account management and profile photos
- **Settings** - User preferences and settings
- **Redirect** - Browser extension integration endpoint

## Deployment

- **Production URL**: `api.usebondery.com`

## Environment Variables

**Required** environment variables (server will fail to start if missing):

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321/rest/v1
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
```

**Optional** environment variables with defaults:

```bash
# Server Configuration
PORT=3001                                  # Default: 3001
HOST=0.0.0.0                              # Default: 0.0.0.0
LOG_LEVEL=info                            # Default: info

# CORS Origins
WEBAPP_URL=https://app.usebondery.com     # Default: https://app.usebondery.com
WEBSITE_URL=https://usebondery.com        # Default: https://usebondery.com
```

The server uses `@fastify/env` to validate environment variables at startup. If any required variables are missing, the server will fail immediately with a clear error message.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Endpoints

### Contacts

- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `DELETE /api/contacts` - Delete multiple contacts
- `GET /api/contacts/:id` - Get a single contact
- `PATCH /api/contacts/:id` - Update a contact
- `POST /api/contacts/:id/photo` - Upload contact photo
- `DELETE /api/contacts/:id/photo` - Delete contact photo

### Account

- `GET /api/account` - Get current user account
- `PATCH /api/account` - Update account metadata
- `DELETE /api/account` - Delete user account
- `POST /api/account/signout` - Sign out user
- `POST /api/account/photo` - Upload profile photo
- `DELETE /api/account/photo` - Delete profile photo

### Settings

- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update user settings

### Redirect (Browser Extension)

- `GET /api/redirect` - Create/find contact and redirect
- `POST /api/redirect` - Create/find contact (JSON response)

## Authentication

The server authenticates requests using Supabase session cookies. Cookies are passed from the webapp and validated against Supabase Auth.

### How it works:

1. User authenticates via webapp (OAuth with GitHub/LinkedIn)
2. Webapp stores session in cookies
3. API requests include cookies
4. Server extracts tokens from cookies
5. Server validates tokens with Supabase
6. Authenticated requests proceed with user context
