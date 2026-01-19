# API Documentation Guide

This document explains how to work with the Bondery API documentation.

## Overview

The Bondery API documentation is written in **OpenAPI 3.0.3** format and configured for publication on **GitBook**.

- **Spec File**: [`openapi.yaml`](./openapi.yaml)
- **GitBook Config**: [`.gitbook.yaml`](./.gitbook.yaml)

## Viewing the Documentation

### Option 1: Swagger Editor (Online)

1. Go to [editor.swagger.io](https://editor.swagger.io/)
2. Click **File** → **Import File**
3. Select `openapi.yaml`

### Option 2: VS Code Extensions

Install one of these VS Code extensions:
- **OpenAPI (Swagger) Editor** by 42Crunch
- **Swagger Viewer** by Arjun G

### Option 3: Postman/Insomnia

1. Open Postman or Insomnia
2. Import the `openapi.yaml` file
3. All endpoints will be available with examples

### Option 4: GitBook (Production)

Once published to GitBook, the documentation will be automatically rendered and available at your GitBook URL.

## GitBook Integration

The `.gitbook.yaml` file configures how GitBook processes the API documentation:

```yaml
root: ./

structure:
  readme: README.md

integrations:
  openapi:
    - id: bondery-api
      file: ./openapi.yaml
```

### Publishing to GitBook

1. Push changes to your repository
2. GitBook will automatically sync if you have it connected
3. The API documentation will appear in your GitBook space

For more details, see [GitBook API Reference Documentation](https://docs.gitbook.com/product-tour/integrations/openapi).

## Updating the Documentation

### When Adding a New Endpoint

1. **Implement the endpoint** in `src/routes/`
2. **Define types** in `@bondery/types` if needed
3. **Add to OpenAPI spec**:
   - Add the path under `paths:`
   - Define request/response schemas
   - Add examples
   - Tag it appropriately
4. **Test the endpoint** locally
5. **Validate the spec** (see below)

### When Modifying an Endpoint

1. **Update the implementation** in `src/routes/`
2. **Update types** in `@bondery/types` if changed
3. **Update OpenAPI spec**:
   - Modify the path definition
   - Update schemas if changed
   - Update examples
4. **Test and validate**

### Validation

To validate the OpenAPI spec:

```bash
# Using npx with swagger-cli
npx @apidevtools/swagger-cli validate openapi.yaml

# Or using VS Code extension
# Install "OpenAPI (Swagger) Editor" and it will validate automatically
```

## OpenAPI Structure

### Key Sections

```yaml
openapi: 3.0.3          # Version
info:                   # API metadata
servers:                # Server URLs
tags:                   # Endpoint groupings
paths:                  # API endpoints
components:             # Reusable components
  schemas:              # Data models
  securitySchemes:      # Auth methods
  responses:            # Reusable responses
security:               # Global security
```

### Schema Definitions

All data models are defined under `components/schemas/`:
- `Contact` - Contact entity
- `CreateContactInput` - Contact creation
- `UpdateContactInput` - Contact updates
- `UserSettings` - User settings
- `ApiError` - Error responses

### Tags

Endpoints are organized by tags:
- `Health` - Health check
- `Contacts` - Contact management
- `Account` - User account
- `Settings` - User settings
- `Redirect` - Extension integration

## Best Practices

### 1. Keep Spec and Code in Sync

Always update the OpenAPI spec when changing endpoints. Consider this workflow:
1. Update types in `@bondery/types`
2. Update implementation
3. Update OpenAPI spec
4. Commit together

### 2. Use Descriptive Examples

Provide realistic examples for:
- Request bodies
- Response bodies
- Path parameters
- Query parameters

### 3. Document All Responses

Include all possible responses:
- Success responses (200, 201, etc.)
- Client errors (400, 401, 404)
- Server errors (500)

### 4. Use Components for Reusability

Define common schemas, responses, and parameters in `components/` and reference them with `$ref`:

```yaml
$ref: '#/components/schemas/Contact'
```

### 5. Security Documentation

Document authentication requirements:
- Which endpoints require auth
- How to authenticate
- Cookie/token format

## Troubleshooting

### GitBook Not Syncing

1. Check `.gitbook.yaml` is in the root of `apps/api/`
2. Verify `openapi.yaml` path is correct
3. Check GitBook integration settings in GitBook dashboard
4. Ensure repository is connected to GitBook

### Validation Errors

Common issues:
- **Invalid $ref**: Check that referenced schema exists
- **Missing required fields**: Ensure all required fields are defined
- **Invalid format**: Check date-time, email, uri formats
- **YAML syntax**: Check indentation and structure

### Examples Not Showing

Make sure examples are properly formatted:

```yaml
example: value          # For simple values
examples:               # For multiple examples
  default:
    value: {...}
```

## Resources

- [OpenAPI 3.0.3 Specification](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md)
- [GitBook OpenAPI Integration](https://docs.gitbook.com/product-tour/integrations/openapi)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Guide](https://swagger.io/docs/specification/about/)

## Questions?

If you have questions about the API documentation:
1. Check the [OpenAPI specification](https://github.com/OAI/OpenAPI-Specification)
2. Review the [GitBook docs](https://docs.gitbook.com/)
3. Look at existing endpoint definitions as examples
