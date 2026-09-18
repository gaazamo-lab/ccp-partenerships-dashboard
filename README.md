# Partner CRM

Partner CRM is a pnpm and Turborepo workspace for a first-party partner relationship platform.

## Workspace

- `apps/partner-portal`: React application and route composition.
- `packages/auth`: First-party, cookie-session authentication boundary.
- `packages/api-client`: Shared HTTP client with normalized errors.
- `packages/ui`: Application provider composition.
- `packages/types`: Cross-application contracts.
- `packages/utils`: Framework-independent helpers.
- `packages/*-config`: Shared TypeScript, ESLint, Prettier, and Tailwind configuration.

Apps may import packages. Apps must not import other apps.

## Authentication

Production authentication is designed around same-origin, secure, HTTP-only session cookies. The
browser never stores access tokens. The expected backend contract is:

- `POST /api/auth/login` with `{ email, password }`, returning `{ user }`.
- `GET /api/auth/session`, returning `{ user }` or `401`.
- `POST /api/auth/logout`, returning `204`.

`apps/partner-portal/.env.local` enables an isolated mock adapter for local layout work. It accepts
any valid email and a password of at least eight characters. Set `VITE_AUTH_MODE=api` when the
first-party auth service is connected. Production builds reject mock auth.

## Start

```bash
pnpm install
pnpm dev --filter @partner-crm/partner-portal
```

Then open `http://localhost:5175`.
