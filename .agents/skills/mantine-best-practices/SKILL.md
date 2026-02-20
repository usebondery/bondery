---
name: mantine-skills
description: A collection of guides, best practices, and resources for using Mantine UI in your projects.
metadata:
  version: 0.0.1
---

# Mantine Skills

To reference the latest Mantine UI documentation, best practices, and guides, visit the official Mantine documentation at [https://mantine.dev/llms.txt](https://mantine.dev/llms.txt).

# Component specific

## Avatar component

The Avatar component in Mantine UI is designed to display user profile pictures or initials. When using the Avatar component, it is important to utilize the name prop to generate fallback initials. Avoid nesting child elements inside the Avatar, as this can lead to unexpected behavior and styling issues. Instead, rely on the name prop to ensure that the Avatar displays correctly even when an image is not provided.

## Anchor, Button, and Link components

When using the Anchor, Button with a Link, or Next.js Link components, import the helper components from packages/mantine-next. These provide wrappers around the standard Mantine components that are optimized for Next.js applications. Using these helper components ensures better performance and compatibility with Next.js features such as server-side rendering and client-side navigation.

## Modals

Import the common ModalTitle from packages/mantine-next to ensure consistent styling and behavior across your application. The ModalTitle component provides a standardized way to display titles within modals, enhancing the user experience and maintaining a cohesive design throughout your application.

# Common mistakes to avoid

## Not using server component

Mantine UI compoennts support Next.js server components. However, they need to be referenced as named exports. For example the List.Item must be imported as ListItem to be used in a server component.
