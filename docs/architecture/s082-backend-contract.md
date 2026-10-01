# S082 backend implementation contract

This document is the hand-off contract for replacing the S082 in-memory adapter with the backend.
The UI, shared types, and `PartnershipsRepository` are the source of truth for request and response
shapes.

## Service boundary

Expose the endpoints under `/api` on the same origin as the portal. Authentication uses secure,
HTTP-only session cookies. The API must derive the actor and permissions from the session; it must
never trust actor names or role claims supplied by the browser.

Every response uses `ApiEnvelope<T>` or `PaginatedEnvelope<T>`. Return a stable error body with
`code`, `message`, `fieldErrors`, and `correlationId`. Use `409` for lifecycle or optimistic-lock
conflicts, `422` for validation, `403` for authorization, and `404` for missing records.

## Required endpoints

| Capability | Method and path |
| --- | --- |
| Search/list | `GET /partnerships` |
| Create/read/update | `POST /partnerships`, `GET/PATCH /partnerships/:id` |
| Controlled transition | `POST /partnerships/:id/status` |
| Renew/terminate | `POST /partnerships/:id/renewals`, `POST /partnerships/:id/termination` |
| Migration | `POST /partnerships/imports` |
| Obligations | `GET/POST /partnerships/:id/obligations`, `PATCH /partnership-obligations/:id` |
| Progress | `GET/POST /partnership-obligations/:id/progress` |
| Reviews | `GET/POST /partnerships/:id/reviews`, `PATCH /partnership-reviews/:id` |
| Renewals | `GET /partnerships/:id/renewals` |
| Renewal alerts | `GET/PUT /partnerships/:id/renewal-alerts` |
| Alert delivery | `POST /partnership-renewal-alerts/:id/dispatch` |
| Alert acknowledgement | `POST /partnership-renewal-alerts/:id/acknowledgement` |
| Agreement history | `GET /partnerships/:id/history` |
| Audit feed | `GET /partnership-audit-events` |
| Integration health | `GET /partnerships/integrations/health` |

## Invariants

- Agreement references are unique. Stakeholder/title pairs are duplicate candidates.
- Every party ID must resolve to an S081 stakeholder. Activation is blocked while a party is
  inactive or has incomplete required screening.
- Effective date precedes expiry date. Active agreements require effective/expiry dates, a signed
  S003 document reference, an S136 legal reference, parties, and deliverables.
- Lifecycle transitions follow the state machine enforced by the frontend. The backend repeats all
  guards transactionally.
- Completed obligations require at least one S003 evidence reference. Due dates dynamically produce
  overdue status unless completed or waived.
- Termination requires reason, approval identity, supporting-document reference, and final archive
  reference. Open obligations must be resolved or waived.
- Reviews require a period, realised output, strategic score, recommendation, and next-review date.
- Renewal creates an immutable renewal record, increments `renewalCount`, supersedes open alerts,
  and schedules the new 180/90/30-day alert set atomically.

## Concurrency and idempotency

Return an `ETag` for agreement resources and require `If-Match` on mutations after the initial
create. Return `409` with the current server representation for stale writes. Accept an
`Idempotency-Key` on create, transition, renewal, termination, import, alert dispatch, and review
creation so browser retries cannot duplicate records or notifications.

## Authorization

Enforce the same capabilities represented in `features/partnerships/permissions.ts`:

- CRM Administrator and CCP Partnerships Manager: full S082 management.
- Registrar: update metadata, review value, approve lifecycle actions, and export.
- Executive Viewer and Auditor: read and export only.

Field-level authorization and transition approval are backend responsibilities; disabled frontend
controls are usability aids only.

## Integration ownership

- S081 supplies stakeholder and party identity.
- S203 supplies screening state used by activation gates.
- S003 owns documents and evidence; S082 stores references and display metadata only.
- S136 owns legal/contract records; S082 stores the contract reference and lifecycle linkage.
- S074 delivers obligation reminders and renewal alerts. Persist its message ID, status, timestamps,
  retry count, and failure reason.
- S204 receives append-only audit events for every mutation and export.
- S225 receives versioned domain events or scheduled extracts for aggregate analytics.

Use an outbox in the same transaction as S082 mutations. Consumers must be idempotent. A failed
integration cannot roll back the business record; expose delivery status and retry safely.

## Audit and security

Audit before/after values, actor ID, delegated role, timestamp, correlation ID, source IP, and event
type. Audit rows are immutable and retention-controlled. Exports and migration attempts are audited,
including zero-row and rejected operations. Validate uploaded MIME type and content, apply file and
row limits, scan uploads, and never persist the source workbook after processing unless records
policy explicitly requires it.

Do not log cookie values, contact data, document contents, or raw upload rows. Apply CSRF protection,
rate limits, security headers, structured logging, backups, restore tests, and environment-separated
secrets.

## Acceptance gate

Before production, replace the in-memory provider with the HTTP repository, add loading/error/empty
states around all queries and mutations, prove conflict recovery with `409`, verify role matrices
server-side, contract-test every endpoint, exercise alert retry and outbox recovery, test migration
rollback, and complete accessibility, performance, backup, and security reviews.
