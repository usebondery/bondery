---
name: bondery-specific
description: A documentation containing the specifid architectural decisions and their rationale.
metadata:
  version: 0.0.1
---

# Using avatars and logos

The strategy for handling contact avatars involves removing the stored avatar column entirely and instead deriving the image URL deterministically from the user ID and contact ID (e.g., constructing avatars/{userId}/{contactId}.jpg on-the-fly when needed). This eliminates redundancy, prevents stale or outdated URLs after file moves/migrations, reduces row size by ~120 bytes per record, and avoids meaningless cache-busting timestamps baked into stored URLs. The frontend component always receives a predictable URL when an avatar is expected to exist; if no file is present, the browser or CDN returns a 404, which the <Avatar> component gracefully handles by falling back to displaying the contact's initials (a lightweight, performant pattern commonly used in high-scale apps for similar profile images). This approach keeps the database lean and simple, centralizes URL logic in a single helper function, and relies on client-side fallback rather than expensive pre-checks or additional metadata—ensuring clean, maintainable code without compromising user experience or performance.

# Fastify server

Use Fastify built in console logging functions of `request.log` and `reply.log` instead of `console.log` for better performance, structured logging, and integration with Fastify's logging ecosystem.

# Code review

When reviewing code, focus on the following aspects:

1. **Code Quality**: Ensure the code is clean, well-structured, and follows best practices. Look for readability, maintainability, and adherence to coding standards.
2. **Functionality**: Verify that the code works as intended and meets the requirements.
3. **Performance**: Assess the efficiency of the code, looking for potential bottlenecks or areas where performance can be improved.
4. **Security**: Check for any security vulnerabilities or potential risks in the code.
5. **Edge Cases**: Consider how the code handles edge cases and unexpected inputs.
6. **Documentation**: Verify that the code is well-documented, with clear comments and explanations where necessary.
7. **UX** Consider the user experience implications of the code, ensuring it provides a smooth and intuitive experience for users.
