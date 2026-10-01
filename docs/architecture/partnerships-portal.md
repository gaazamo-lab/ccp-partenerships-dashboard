# CCP Partnerships Portal architecture

## Product boundary

The portal is one authenticated user experience with two bounded system modules:

- **S081 Stakeholder / Partner CRM** owns external stakeholder organisations, contacts, screening
  and consent references, engagement history, and audience segments.
- **S082 MOU & Partnership Lifecycle Tracker** owns formal agreement metadata, lifecycle state,
  obligations, evidence references, renewal milestones, value-realisation reviews, and termination
  records.

S082 stores `stakeholderId` references to S081. It does not duplicate stakeholder or contact master
data. Legal contract and signature records remain references to S136, while signed documents and
evidence remain references to S003.

## Monorepo layers

```text
apps/partner-portal
  routes and application shell
  features/stakeholders       S081 screens and local adapter
  features/partnerships       S082 screens and local adapter

packages/types
  transport-neutral S081/S082 entities, commands, states, and envelopes

packages/api-client
  endpoint declarations and same-origin HTTP repository implementations

packages/auth
  first-party cookie-session authentication boundary
```

Apps may consume shared packages. Feature modules must not embed endpoint URLs or transport logic in
React components.

## Route map

```text
/                         shared portfolio overview
/stakeholders             S081 stakeholder register
/stakeholders/new         S081 full-page stakeholder creation
/stakeholders/:id         S081 stakeholder 360 profile
/compliance               S081 screening and consent operations
/segments                 S081 live audience segments
/partnerships             S082 agreement portfolio
/partnerships/new         S082 full-page agreement creation
/partnerships/:id         S082 lifecycle, obligations, renewal, and reviews
/reports                  cross-module reporting
```

## API ownership

The frontend consumes separate repository contracts even if the first backend release is deployed as
one service:

- `StakeholdersRepository` for `/api/stakeholders`, contacts, engagements, screening references, and
  segments.
- `PartnershipsRepository` for `/api/partnerships`, lifecycle transitions, obligations, renewal
  actions, and reviews.

All HTTP requests use secure same-origin cookies through `@partner-crm/api-client`. Neither module
stores authentication tokens in browser storage.

## Cross-system workflow

1. Identify and onboard the partner in S081.
2. Complete S203 screening where the category is regulated.
3. Log relationship development and negotiation activity in S081.
4. Create an S082 draft referencing the S081 stakeholder ID.
5. Link the S136 legal record during drafting and review.
6. On execution, record the S003 signed-document reference and activate the agreement.
7. Track obligations, evidence, reviews, and renewal/termination in S082.
8. Deliver renewal alerts through S074 and publish aggregate analytics to S225.

## Current implementation stage

The portal includes contract-faithful in-memory providers for interactive frontend development.
`@partner-crm/api-client` now exposes the S082 HTTP repository boundary. Replacing the local
provider with the HTTP implementation must not require page-component changes.
