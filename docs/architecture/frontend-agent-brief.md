# Frontend implementation brief (shared by every module)

Repository: `C:\Users\Administrator\Documents\partner-crm` — pnpm + Turborepo monorepo, React 19,
React Router 7 (data router, `lazy` routes exporting `Component`), Tailwind 4,
`@rfdtech/components` design system. Read `CLAUDE.md` first.

## Hard rules

- Apps may import packages; apps never import other apps.
- `@rfdtech/components` for standard UI (Button, Badge, Card, Modal/ModalContent/ModalHeader…,
  Tabs, Notice, Table parts, `useToast`, `exportToCsv`). Read its types in
  `apps/partner-portal/node_modules/@rfdtech/components/dist/index.d.ts` when unsure of props.
- The shared kit in `@partner-crm/ui` is the default for page structure: `PageHeader`,
  `SectionCard`, `KpiGrid`, `DataTable`, `TextField`/`SelectField`/`TextareaField`/
  `MultiSelectField`/`CheckboxField`/`FormGrid`, `EmptyState`, `DetailGrid`/`DetailItem`,
  `StatusBadge`, `ActionMenu`, `ExportMenu`, `PortfolioDonutChart`, and helpers `formatDate`,
  `formatDateTime`, `formatCount`, `titleCase`, `labelize`, `daysUntil`, `rate`, `filterLink`,
  `useNow`, `usePagedRows`. Source: `packages/ui/src/kit/**`.
- Contracts are fixed: `packages/types/src/*.ts` and `packages/api-client/src/*.ts` are read-only
  for you. If a contract is genuinely missing something, work around it and list it in your final
  report — do not edit shared packages.
- No endpoint URLs, `fetch`, or transport logic in React components. Components talk to a
  provider/hook; the provider talks to a repository.
- Never store tokens or data in `localStorage`/`sessionStorage` (the existing mock *auth* client is
  the only exception and is not yours to change).
- Do not run `pnpm install`, do not add dependencies, do not run root-level `pnpm typecheck`
  (turbo). Use `pnpm --filter <package> typecheck|lint|test|build`.
- Other agents are editing other folders at the same time. If typecheck reports errors in files
  you do not own, ignore them; fix everything in files you own.
- Do not commit.

## Visual conventions (match the GSL starter)

- A page is `<section className="flex flex-col gap-body">` → `PageHeader` (title, description,
  optional `meta` badge like `<Badge variant="outline">System S083</Badge>`, `actions`, `backTo`
  on detail pages) → optional `KpiGrid` → `SectionCard`s / `DataTable`.
- Muted copy: `text-sm text-foreground-muted`. Subtle panels: `bg-surface-subtle`. Rounded
  panels `rounded-xl border border-border`. Do not introduce new colour systems.
- Status values: map every member of a closed union to a Badge variant explicitly (see
  `apps/partner-portal/src/features/partnerships/components/PartnershipStatusBadge.tsx`).
- Every list has an empty state that tells the user what to do next. Every destructive or
  state-changing action gives a toast (`useToast` → `toast({ title, description, variant })`).
- Forms: field-level validation messages, keep entered data on failure, disable submit while
  saving.
- Reference implementation to imitate: `apps/partner-portal/src/features/partnerships/**`
  (list page `pages/Partnerships.tsx`, detail with `Tabs variant="line"` in
  `pages/PartnershipDetail.tsx`, modals in `components/*FormModal.tsx`, pure domain logic +
  vitest tests in `lifecycle.ts`/`lifecycle.test.ts`, role gates in `permissions.ts`).

## Data mode

Each app has `src/config/env.ts` exposing `env.dataMode` (`'mock' | 'api'`) and
`src/config/api.ts` exposing `apiClient` (same-origin `/api/v1`, cookie credentials).

- **New modules** (S083, S091, S092): write `data/memoryRepository.ts` implementing the
  api-client repository interface for the module (async, seeded with realistic Ghanaian/CLET
  data, enforcing the same rules as the backend — see `docs/architecture/new-module-rules.md`,
  throwing `Error` with a user-readable message on rule violations), and
  `data/repository.ts` choosing `createHttp…Repository(apiClient)` when `env.dataMode === 'api'`
  and the memory repository otherwise. The provider loads through the repository, exposes
  `loading`/`error` state and async actions, and shows toasts on failure.
- **Existing modules** (S081, S082, S088) keep their synchronous in-memory providers for mock
  mode. In api mode the provider loads initial state from the repository on mount and each
  mutation applies the optimistic local change, then calls the repository; the create calls
  pass the client-generated `crypto.randomUUID()` so IDs stay stable; on success replace the
  record with the server's version; on failure revert (reload from the server) and toast the
  server's message (`ApiError.message` already carries it).

## Roles

Users have one role string (`useAuth().user.role`). Mock auth signs everyone in as
`CRM Administrator`, which must keep full access so mock mode stays usable. Known roles:
`System Administrator`, `CRM Administrator`, `CCP Partnerships Manager`, `Partnerships Officer`,
`Registrar`, `IR Officer`, `Correspondence Officer`, `IR Approver`, `Content Manager`,
`RMF Reviewer`, `Consultation Manager`, `Executive Viewer`, `Auditor`. Put the matrix for your
module in a `permissions.ts` and gate buttons with it (disabled + tooltip/description, not
hidden, for read-only users).

## Definition of done

`pnpm --filter <your package> typecheck`, `lint`, `test` and `build` all pass for the files you
own; domain rules have vitest tests; final report lists files created/changed, what each screen
does, and anything you could not finish.
