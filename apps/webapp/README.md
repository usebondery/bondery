# Bondery WebApp

The authenticated web application for Bondery - the personal relationship manager.

## Overview

This is the main application that runs at **app.usebondery.com**.

## Features

- Contact/relationship management
- Network visualization (graph view)
- Map view with contact locations
- User settings and profile management
- OAuth authentication (GitHub, LinkedIn)

## Development

```bash
# Run development server on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# URLs
NEXT_PUBLIC_APP_URL=https://app.usebondery.com
NEXT_PUBLIC_API_URL=https://api.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

## Routes

### Public Routes
- `/login` - Authentication page

### Authenticated Routes (require login)
- `/app` - Redirects to relationships
- `/app/relationships` - Main contacts view
- `/app/person` - Individual contact detail
- `/app/network` - Network graph visualization
- `/app/map` - Map view of contacts
- `/app/settings` - User settings

## Architecture

- **API Calls**: All API requests are proxied to the Fastify server at api.usebondery.com
- **Authentication**: Uses Supabase Auth with session cookies
- **Internationalization**: Supports EN/CS via next-intl
