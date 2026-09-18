# Partner CRM agent guide

This repository is a pnpm and Turborepo monorepo.

- Deployable applications live in `apps/*`.
- Shared code lives in `packages/*`.
- Apps may import packages. Apps must never import other apps.
- Use `@rfdtech/components` for standard UI elements.
- Keep authentication behind `@partner-crm/auth`; do not add ZITADEL or IAM dependencies.
- Production auth uses secure, same-origin, HTTP-only session cookies. Do not persist tokens in
  localStorage or sessionStorage.
- Keep endpoint declarations and transport logic out of React components.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` after code changes.
