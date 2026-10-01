# S083, S091 and S092 business rules

These rules are the shared behaviour contract for the three modules added in September 2026. The
frontend in-memory repositories (used when `VITE_DATA_MODE=mock`) and the backend services must
enforce the same rules, return the same shapes (`packages/types`) and use the same endpoints
(`packages/api-client`). Rejected commands return `409` (state conflict) or `422` (validation)
with `{ code, message, fieldErrors, correlationId }`.

## S092 KOL & Thought-Leader Tracker

Owner: CCP Strategic Partnerships. Lives in `apps/partner-portal` under `/kol`.

- A KOL profile is an extension record. `stakeholderId` must reference an existing S081
  stakeholder when set; `alumniRef` is a free S034 reference. The profile never copies stakeholder
  master data.
- `email` is unique across KOL profiles (case-insensitive) when present.
- `fullName`, `category`, `relationshipOwner` are required. `riskNotes` is required when
  `riskLevel` is `MEDIUM` or `HIGH`.
- Engagement stages: `PLANNED → INVITED → CONFIRMED → COMPLETED`; `DECLINED` from `INVITED`;
  `CANCELLED` from `PLANNED | INVITED | CONFIRMED`. `COMPLETED`, `DECLINED`, `CANCELLED` are
  terminal. Participation can only be recorded on a `COMPLETED` engagement (recording it on a
  `CONFIRMED` one moves it to `COMPLETED`).
- Creating an engagement for an `ARCHIVED` KOL is rejected.
- Content stages: `COMMISSIONED → DRAFT_SUBMITTED → IN_REVIEW → (CHANGES_REQUESTED →
  DRAFT_SUBMITTED)* → APPROVED → PUBLISHED`; `WITHDRAWN` from any non-terminal stage.
  `DRAFT_SUBMITTED` requires `draftRef`; `PUBLISHED` requires `publishedUrl` (and sets
  `publishedAt`); `CHANGES_REQUESTED` requires `reviewNotes`. `PUBLISHED` and `WITHDRAWN` are
  terminal.
- Media mentions carry `reach >= 0`. Manual mentions have `source = 'MANUAL'`; S085 feed rows
  have `source = 'S085'`.
- Impact = total reach of mentions, engagements completed, content published, mean
  contribution score.

## S091 Donor / Annual-Report Microsite Builder

Owner: CCP Strategic Partnerships with RMF. App: `apps/donor-microsites` (admin at `/admin`,
public viewer at `/sites/:slug`).

- `slug` is unique, lowercase `a-z0-9-`, 3–60 characters. `title` is required.
- Creating from a template seeds one empty block per `template.blockTypes` entry.
- Status machine: `DRAFT → IN_REVIEW` (review decision `SUBMITTED`) → `APPROVED` or
  `CHANGES_REQUESTED` (comment required) → back to `DRAFT` on the next edit. `APPROVED →
  PUBLISHED` via publish. `PUBLISHED → APPROVED` via unpublish. Any non-archived state →
  `ARCHIVED` with a required S003 `archiveRef`. `ARCHIVED` is terminal.
- Content (`PUT /microsites/:id`) can be edited only in `DRAFT`, `CHANGES_REQUESTED` or
  `APPROVED`; every edit increments `version`. Editing an `APPROVED` site sends it back to
  `DRAFT` (approval is for a specific version).
- The approver of a version cannot be the person who submitted it (four-eyes).
- Publish requires status `APPROVED`, at least one block, and valid access settings. It sets
  `publishedVersion = version` and `publishedAt`.
- Access: `PUBLIC` needs nothing; `PASSWORD` needs an access code (min 8 characters; stored
  hashed, never returned); `NAMED_AUDIENCE` needs at least one S081 stakeholder ID. Changing
  access on a published site takes effect immediately.
- Public endpoints only return `PUBLISHED` sites. Restricted sites return `401` with code
  `MICROSITE_LOCKED` until unlocked; a successful unlock is remembered for the browser session.
  Unlock attempts are rate-limited. `POST /public/microsites/:slug/views` increments analytics.
- Metrics blocks store `sourceRef` (S225/S150); media blocks store S080 asset IDs.

## S083 International Relations & Protocols Workspace

Owner: CCP International Relations & Protocols. App: `apps/ir-workspace`.

### Engagements

- Reference format `CLET/IR/<year>/<seq>` assigned on create. Classification defaults to
  `INTERNAL`.
- State machine (SRS §4):
  - `DRAFT → SUBMITTED` — requires `title`, `purpose`, `owner`, `startAt`, `endAt` (end after
    start), `timeZone`; otherwise `422`.
  - `SUBMITTED → UNDER_REVIEW` (approver picks it up).
  - `UNDER_REVIEW → APPROVED` or `→ RETURNED` (comment required).
  - `RETURNED → SUBMITTED` (resubmit after changes).
  - `APPROVED → SCHEDULED` — blocked while any mandatory protocol task is `OPEN`.
  - `SCHEDULED → IN_PROGRESS → COMPLETED`.
  - `COMPLETED → CLOSED` — blocked while any mandatory follow-up is `OPEN`; `minutesRef`
    required.
  - `CANCELLED` from any state before `COMPLETED`, comment required.
  - `CLOSED → IN_PROGRESS` (reopen) — comment required.
- Every transition appends an approval-history entry (`SUBMITTED`, `APPROVED`, `RETURNED`,
  `REOPENED`, `CANCELLED`) with actor, comment, version and time. Approval is blocked for the
  engagement's own `owner` (four-eyes).
- Editing core fields (`PUT`) increments `version`. A material edit while `APPROVED` or
  `SCHEDULED` moves the engagement back to `SUBMITTED` (approval invalidated).
- Tasks and follow-ups: status `OPEN → DONE | EXCEPTION`. `DONE` on a mandatory protocol task
  requires `evidenceRef`; `EXCEPTION` requires `exceptionReason`.
- Support requests (`S084`, `S078`, `S086`, `S074`) start `REQUESTED`. Submission is not
  completion: status moves only via explicit updates (`ACKNOWLEDGED → COMPLETED`, or `FAILED`
  which may be retried back to `REQUESTED`).
- Calendar clash: two non-cancelled engagements clash when their time ranges overlap and they
  share the same `host` or the same `venue` (case-insensitive). Clashes are displayed, not
  blocked.

### Correspondence

- Reference format `CLET/COR/<year>/<seq>`.
- Inbound items are registered as `RECEIVED` (require `receivedAt`); outbound items start as
  `DRAFT`.
- Inbound: `RECEIVED → AWAITING_RESPONSE → RESPONDED → CLOSED`.
- Outbound: `DRAFT → IN_REVIEW → APPROVED | RETURNED`; `RETURNED → IN_REVIEW`; `APPROVED →
  DISPATCHED` (records `sentAt` and an S074 `dispatchRef`) `→ AWAITING_RESPONSE → RESPONDED →
  CLOSED`, or `DISPATCHED → CLOSED` when no response is expected.
- Approval records `approvedVersion = version`. Editing body/subject/recipient/language after
  approval increments `version` and returns the item to `DRAFT` — unapproved text cannot be
  dispatched (`DISPATCHED` requires `approvedVersion === version`).
- A correspondence item is overdue when `responseDeadline` has passed and status is
  `RECEIVED` or `AWAITING_RESPONSE`.
- Letters in `AR` render right-to-left.

### Letter templates

- One active template per `name + language`. Updating a template creates the next `version`;
  correspondence keeps the `templateVersion` it was drafted from. Placeholders use
  `{{recipient}}`, `{{sender}}`, `{{date}}`, `{{subject}}`, `{{engagement}}`.

### Gifts

- `RECEIVED` gifts start with `s011Status = PENDING` and are cross-flagged to S011 through the
  outbox; `GIVEN` gifts are `NOT_REQUIRED`.
- `valueKnown = false` requires `value = null`; `valueKnown = true` requires `value >= 0` and a
  3-letter `currency`.
- Retrying the S011 flag (`POST /ir/gifts/:id/s011-flag`) is idempotent: it never creates a
  second flag, increments `flagAttempts`, and is rejected once `ACKNOWLEDGED`.
