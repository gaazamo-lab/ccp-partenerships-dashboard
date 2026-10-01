# Partner CRM

Partner CRM is the frontend monorepo for the CCP Digital Workspace: a first-party partner
relationship platform made of five deployable React apps that share one set of contracts, one API
client, one authentication boundary and one UI kit. It is a pnpm and Turborepo workspace.

**New here?** Read [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) first. It explains what each module is
for, who uses it and how every workflow should behave. This README covers setup, configuration and
day-to-day development.

## Contents

- [Modules](#modules)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Repository layout](#repository-layout)
- [Authentication and data modes](#authentication-and-data-modes)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Working with the backend](#working-with-the-backend)
- [Development rules](#development-rules)
- [Testing and quality gates](#testing-and-quality-gates)
- [Building and deploying](#building-and-deploying)
- [Troubleshooting](#troubleshooting)
- [Module notes](#module-notes)
- [Architecture documents](#architecture-documents)
- [Git and contributions](#git-and-contributions)

## Modules

| System | Module                                        | App                                                     | Port |
| ------ | --------------------------------------------- | ------------------------------------------------------- | ---- |
| S081   | Stakeholder / Partner CRM                     | `apps/partner-portal`                                   | 5175 |
| S082   | MOU & Partnership Lifecycle Tracker           | `apps/partner-portal`                                   | 5175 |
| S092   | Influencer / KOL & Thought-Leader Tracker     | `apps/partner-portal` (`/kol`)                          | 5175 |
| S088   | Public Survey / Consultation Platform         | `apps/consultation-portal` (public `/`, admin `/admin`) | 5176 |
| S091   | Donor / Annual-Report Microsite Builder       | `apps/donor-microsites` (public `/`, admin `/admin`)    | 5178 |
| S083   | International Relations & Protocols Workspace | `apps/ir-workspace`                                     | 5179 |
| S084   | Visa & Travel Authorisation                   | `apps/travel-authorisation`                             | 5177 |

The backend for all of these is a separate repository, `All-partner-cm-bacnkend` (FastAPI,
PostgreSQL, Celery). See its README for running it.

## Tech stack

- React 19 with React Router 7 (data router, lazy routes), Vite and TypeScript.
- Tailwind CSS 4 with a shared preset and design tokens (`packages/tailwind-config`).
- `@rfdtech/components` for standard UI elements, vendored as a tarball in `vendor/`.
- pnpm workspaces and Turborepo for task orchestration and caching.
- Vitest for unit tests, ESLint for linting, Prettier for formatting.

## Prerequisites

- Node.js 22 or newer (`.nvmrc` pins 22; run `nvm use` if you use nvm).
- pnpm 11 or newer (the repo declares `pnpm@11.7.0`; Corepack will pick it up with
  `corepack enable`).
- Optional: the backend repository, if you want to run against real data instead of mock mode.

## Getting started

```bash
pnpm install
```

Each app reads its own `.env.local`. Copy the example and choose a mode (see
[Environment variables](#environment-variables)). For a first look with no backend, use mock mode:

```bash
cp apps/partner-portal/.env.example apps/partner-portal/.env.local
# then set VITE_AUTH_MODE=mock and VITE_DATA_MODE=mock in that file
```

Start whichever apps you need:

```bash
pnpm dev --filter @partner-crm/partner-portal        # http://localhost:5175
pnpm dev --filter @partner-crm/consultation-portal   # http://localhost:5176
pnpm dev --filter @partner-crm/travel-authorisation  # http://localhost:5177
pnpm dev --filter @partner-crm/donor-microsites      # http://localhost:5178
pnpm dev --filter @partner-crm/ir-workspace          # http://localhost:5179
```

`pnpm dev` with no filter starts every app at once.

In mock mode any email and a password of 8 or more characters signs you in, as **CRM
Administrator**.

## Repository layout

```text
apps/
  partner-portal/          S081, S082, S092 (the main CRM workspace)
  consultation-portal/     S088 public survey site and admin
  donor-microsites/        S091 microsite builder and public sites
  ir-workspace/            S083 International Relations workspace
  travel-authorisation/    S084 visa and travel authorisation
packages/
  types/                   Transport-neutral contracts for every module
  api-client/              HTTP client and one repository per module (endpoint map)
  auth/                    Cookie-session boundary, ProtectedRoute, shared LoginScreen
  ui/                      Providers, shared UI kit, cross-app WorkspaceLaunchpad
  tailwind-config/         Tailwind preset and theme.css design tokens
  utils/                   Shared helpers
  eslint-config/           Shared ESLint configuration
  prettier-config/         Shared Prettier configuration
  tsconfig/                Shared TypeScript configuration
docs/
  architecture/            Module boundaries, backend contracts, business rules
  decisions/               Architecture decision records
vendor/                    Vendored @rfdtech/components tarball (do not delete)
```

Key points:

- `packages/types` is the source of truth for contracts; the backend follows it.
- `packages/api-client` holds every endpoint declaration. Apps never call `fetch` directly.
- `packages/ui` provides `PageHeader`, `SectionCard`, `KpiGrid`, `DataTable`, form fields and other
  building blocks so every module looks and behaves the same.
- Apps may import packages. Apps must never import other apps.

## Authentication and data modes

Authentication is email and password against the backend, using same-origin, secure, HTTP-only
session cookies. The browser never stores tokens. Authentication is kept behind `@partner-crm/auth`;
the repo has no ZITADEL or IAM dependency.

Endpoints the backend must provide:

- `POST /api/v1/auth/login` with `{ email, password }` returns `{ user }`.
- `GET /api/v1/auth/session` returns `{ user }` or `401`.
- `POST /api/v1/auth/logout` returns `204`.

Two independent switches control where each app gets its behaviour:

| Mode   | Authentication                         | Data                                           |
| ------ | -------------------------------------- | ---------------------------------------------- |
| `mock` | any email and an 8+ character password | seeded in-memory data enforcing the same rules |
| `api`  | real backend session cookies           | real backend endpoints                         |

Production builds reject both mock modes and fail at startup if either is set to `mock`. In
development every Vite server proxies `/api` to `http://localhost:8000`.

## Environment variables

Each app reads four variables from its own `.env.local` (`.env.example` shows the shape).
`.env.local` is git-ignored; only `.env.example` files are committed.

| Variable            | Meaning                           | Typical value  |
| ------------------- | --------------------------------- | -------------- |
| `VITE_AUTH_MODE`    | `api` or `mock` authentication    | `api`          |
| `VITE_AUTH_API_URL` | Base path of the auth endpoints   | `/api/v1/auth` |
| `VITE_DATA_MODE`    | `api` or `mock` data              | `api`          |
| `VITE_API_URL`      | Base path of the module endpoints | `/api/v1`      |

Defaults: the four apps other than `travel-authorisation` default both modes to `api`.
`travel-authorisation` defaults both to `mock` in development and `api` in production builds.

Never put secrets in `VITE_*` variables. Vite embeds them in the browser bundle.

## Scripts

Run from the repository root; Turborepo runs each across all packages that define it.

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Start dev servers (use `--filter` to pick an app) |
| `pnpm build`        | Typecheck and build every app and package         |
| `pnpm typecheck`    | Run TypeScript with `--noEmit` everywhere         |
| `pnpm lint`         | Run ESLint everywhere                             |
| `pnpm test`         | Run Vitest suites                                 |
| `pnpm format`       | Format the repo with Prettier                     |
| `pnpm format:check` | Check formatting without writing                  |
| `pnpm clean`        | Run each package's clean task                     |

Scope any task to one package with `--filter`, for example
`pnpm --filter @partner-crm/partner-portal test`.

## Working with the backend

1. Start the backend first (see its README). It listens on port 8000.
2. Optionally seed demo users with `python -m scripts.seed --demo`. The demo password is
   `Clet-Demo-2026!`, for example `partnerships@clet.gov.gh`. These are for local development only.
3. In the app's `.env.local`, set `VITE_AUTH_MODE=api` and `VITE_DATA_MODE=api`.
4. Start the app. The Vite dev server proxies `/api` to the backend, so cookies stay same-origin.

To try roles other than CRM Administrator you need `api` mode with the backend's demo users. S084 is
the exception: it has a role switcher in the app. See
[Roles and what they can do](SYSTEM_OVERVIEW.md#roles-and-what-they-can-do).

## Development rules

These are enforced in review and described in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md):

- Deployable applications live in `apps/*`; shared code lives in `packages/*`.
- Apps may import packages, never other apps.
- Use `@rfdtech/components` for standard UI elements, and the `@partner-crm/ui` kit for page
  structure.
- Keep endpoint declarations and transport logic out of React components. Components talk to a
  provider or hook, the provider talks to a repository, and the repository lives in
  `packages/api-client`.
- Keep authentication behind `@partner-crm/auth`.
- Do not persist tokens in `localStorage` or `sessionStorage`.
- Do not add dependencies casually; the `@rfdtech/components` tarball and `xlsx` are pinned through
  `pnpm-workspace.yaml` overrides.
- Match the existing visual conventions described in
  [docs/architecture/frontend-agent-brief.md](docs/architecture/frontend-agent-brief.md).

## Testing and quality gates

After any code change, run:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

and `pnpm test` when behaviour changed. `pnpm build` also typechecks each app before bundling.

Unit tests use Vitest and live beside the code they cover in each app. Mock repositories enforce the
same business rules as the backend (see
[docs/architecture/new-module-rules.md](docs/architecture/new-module-rules.md)), so tests run
without a server.

## Building and deploying

```bash
pnpm build
```

Each app emits a static bundle to its own `dist/` folder, with source maps. Serve each bundle from
the same origin as the backend (or behind a reverse proxy that routes `/api` to it) so the HTTP-only
session cookie works. Production builds must use `api` mode for both authentication and data; a
build configured with `mock` fails at startup.

Preview a built app locally with `pnpm --filter <package> preview`.

## Troubleshooting

- **`pnpm install` fails on `@rfdtech/components`:** check that
  `vendor/rfdtech-components-2.3.0-beta.2544d4a.tgz` exists. It is committed on purpose.
- **Login fails in development:** confirm the backend is running on port 8000, or switch the app to
  `mock` mode.
- **"Mock authentication and data are not allowed in production builds":** set both modes to `api`
  for the production build.
- **Port already in use:** each app has a fixed port (5175 to 5179). Stop the other process or
  change `server.port` in that app's `vite.config.ts`.
- **Stale builds or odd type errors:** delete `.turbo/` and each app's `dist/`, then rerun the
  command.

## Module notes

### S081 Stakeholder / Partner CRM

`apps/partner-portal` implements the workspace defined by the S081 SRS:

- stakeholder register, duplicate-aware creation, and spreadsheet import;
- stakeholder 360 profiles, contacts, communication history, and engagement logging;
- S203 screening gates and S188 consent-status handling;
- live audience segments for S075 Newsletter and S088 consultations;
- current-state portfolio analytics and CSV reporting;
- role gates, S203 screening decisions, consent with date and channel, contact edit and
  deactivation, duplicate override with a reason, pipeline stages, and Excel reporting.

In `mock` data mode the CRM provider uses seeded in-memory data. In `api` mode it loads through
`createHttpStakeholdersRepository`, applies changes optimistically with client-generated IDs, and
reloads with the server's message if a change is rejected.

### S082 MOU & Partnership Lifecycle Tracker

The same portal contains the MOU & Partnership Lifecycle Tracker:

- agreement portfolio search, status metrics, and linked S081 stakeholder records;
- controlled lifecycle transitions from draft through activation, renewal, expiry, or termination;
- obligation tracking, completion evidence references, renewal milestones, and structured value
  reviews;
- portfolio filters, CSV and Excel exports, print-to-PDF reporting, and validated legacy import;
- centralized role gates, audit-aware event history, and visible integration readiness;
- references to S136 legal records and S003 signed-document records without duplicating their data;
- an obligations workspace, a milestone calendar, review-due alerts and per-agreement dossier
  export.

The provider uses seeded data in `mock` mode and `createHttpPartnershipsRepository` in `api` mode.
See `docs/architecture/partnerships-portal.md` for module ownership, routes and API boundaries, and
`docs/architecture/s082-backend-contract.md` for the backend contract.

### S092, S088, S091 and S083

- **S092 KOL Tracker** (`partner-portal`, `/kol`): KOL register linked to S081 records, profiles
  with engagement pipeline, participation, content collaboration workflow and media reach, an
  outreach planner board and an impact dashboard.
- **S088 Consultations** (`consultation-portal`): question builder with skip logic, sections and
  translations, S081 segment audiences and consent-based invitations, approval lifecycle, analytics,
  theme coding, triggers, and published "what we heard" outcomes on the public site.
- **S091 Donor Microsites** (`donor-microsites`): template library, block-based builder with live
  preview, four-eyes review, publish, unpublish and archive, public and access-code-protected sites,
  and engagement analytics.
- **S083 International Relations** (`ir-workspace`): engagements with delegation, protocol
  checklist, support handoffs (S084, S078, S086, S074), follow-ups and approval history; calendar
  with clash detection; correspondence register with EN, FR and AR letter templates (RTL preview);
  gifts register with S011 cross-flagging; reports.

### S084 Visa & Travel Authorisation

`apps/travel-authorisation` implements the workspace defined by the S084 SRS:

- inbound visa-support and outbound official-travel intake;
- secure evidence readiness and policy-versioned approval routes;
- pre-travel estimates with an explicit S144 handoff boundary;
- support-letter and travel-authorisation issuance gates;
- GIS liaison, accommodation, records and notification status tracking;
- amendment-aware history, approval inboxes and operational reporting;
- role and record-scope preview for travellers, reviewers, auditors and DTI administrators;
- editable estimates, document issuance, notifications, reconciliation, closure, configuration and
  CSV export;
- a student self-service portal for outbound travel requests and return reporting.

The frontend currently uses typed, session-persisted preview data so the workflow can be reviewed
before backend contracts are finalised. S083, S140, S144, S031, S074 and S003 are represented as
external handoffs rather than simulated as authoritative services.

## Architecture documents

- [docs/architecture/partnerships-portal.md](docs/architecture/partnerships-portal.md): S081 and
  S082 portal boundaries.
- [docs/architecture/s082-backend-contract.md](docs/architecture/s082-backend-contract.md): S082
  backend contract.
- [docs/architecture/new-module-rules.md](docs/architecture/new-module-rules.md): S083, S091 and
  S092 business rules, shared by the frontend mock repositories and the backend.
- [docs/architecture/frontend-agent-brief.md](docs/architecture/frontend-agent-brief.md):
  conventions every module follows.
- [docs/decisions/ADR-001-shared-partnerships-portal.md](docs/decisions/ADR-001-shared-partnerships-portal.md).

## Git and contributions

- Work on `main` or a feature branch and keep commits focused.
- Never commit `.env.local`, tokens, or credentials. Only `.env.example` files are tracked.
- Source requirement documents (SRS, PRD, signed MOUs) live in a local `Files/` folder that is
  git-ignored on purpose; ask the project owner for access.
- Before opening a change, run `pnpm typecheck`, `pnpm lint` and `pnpm build`, and
  `pnpm format:check` for documentation or style changes.
