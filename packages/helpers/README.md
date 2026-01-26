# @bondery/helpers

Shared helper functions and utilities for the Bondery monorepo.

## Features

- Environment variable validation
- Build-time checks for required configuration

## Usage

```typescript
import { checkEnvVariables } from '@bondery/helpers/check-env';

checkEnvVariables({
  environment: 'production',
  appPath: __dirname,
  requiredVars: ['API_URL', 'API_KEY']
});
```
