---
name: mantine-skills
description: A collection of guides, best practices, and resources for using Mantine UI in your projects.
metadata:
  version: 0.0.1
---

# Mantine Skills
To reference the latest Mantine UI documentation, best practices, and guides, visit the official Mantine documentation at [https://mantine.dev/llms.txt](https://mantine.dev/llms.txt).

# Common mistakes to avoid
## Avatars with children
When using the Avatar component, avoid nesting child elements inside it. The Avatar component supports name prop for generating fallback initials. Do not place a child element with initials text inside the Avatar. 

## Not using server component
Mantine UI compoennts support Next.js server components. However, they need to be referenced as named exports. For example the List.Item must be imported as ListItem to be used in a server component.