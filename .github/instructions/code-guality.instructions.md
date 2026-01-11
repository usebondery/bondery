---
applyTo: "**"
---

# Tech stack

- Next.js with TypeScript
- Supabase for database and authentication
- Mantine as the UI framework
- Tailwind CSS for supplemental styling
- next-intl for localization

# Best practices

- DRY: Avoid duplicating code by creating reusable components and functions.
- Use descriptive variable names (e.g., isLoading, hasError).
- Error Handling: Implement try-catch blocks in server components to handle errors gracefully.

## Next.js

- Server Components: Use server components where possible to improve performance and SEO. Note that when using Mantine components in server components, import them as MenuItem instead of Menu.Item for SSR compatibility.

## Supabase

- Import Supabase clients from the shared library rather than creating new instances in each file.
- Seperate big components into a separate file for better readability and maintainability.
- Use Supabase types defined in supabase.types.ts for type safety when working with database records.
- When providing an SQL query, update the corresponding type in supabase.types.ts to reflect any changes in the database schema.
- When defining a new table in Supabase, create proper RLS (Row Level Security) policies to ensure data security.

## Project structure

- Data Fetching: Fetch data in server components and pass it down to client components as props to reduce client-side data fetching.
- If a component needs notifications or modals, define them in the client component rather than the parent component.

## Localization

- All texts should be stored in a separate file for easier localization and management. The dictionaries file is located at /translations. Only CZ and EN are supported for now. Import the texts from there rather than hardcoding them in components.

## Types and documentation

- Use TypeScript types and interfaces to define the shape of data and props.
- If creating or editing a shared function, create a documentation comment block above it to explain its purpose, parameters, and return values.

## Mantine

- When using modals, use the modals manager rather than importing Modal component.
