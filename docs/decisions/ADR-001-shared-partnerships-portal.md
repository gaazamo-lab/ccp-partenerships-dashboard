# ADR-001: Shared portal for S081 and S082

- Status: Proposed for confirmation
- Date: 2026-09-19
- Source: `CLET_C6_CCP_Ecosystem_PRD_v2 (1).docx`
- Systems: S081 Stakeholder / Partner CRM; S082 MOU & Partnership Lifecycle Tracker

## Decision

Provide one authenticated **CCP Partnerships Portal** for users, containing two distinct modules:

1. **Stakeholders / CRM (S081)**
2. **MOUs & Partnerships (S082)**

The modules share the application shell, navigation, identity, permissions, stakeholder lookup,
notifications, audit presentation, and cross-system links. They retain separate domain models,
lifecycle rules, API boundaries, authorization capabilities, audit events, and authoritative
records.

## PRD basis

- Both systems are operated by the CCP Strategic Partnerships Unit.
- The CCP Partnerships Manager is the principal operational role for both S081 and S082.
- The documented partnership lifecycle begins in S081 with contact identification, screening,
  engagement, meetings, calls, and correspondence.
- When an opportunity reaches formal negotiation and execution, S082 becomes authoritative for the
  agreement, obligations, deliverables, evidence, renewals, value-realisation reviews, and
  termination.
- S082 draws partnership engagement history and contacts from S081 rather than duplicating them.
- S082 is also anchored to S136 for legal contract/signature storage and sends renewal alerts
  through S074.
- The PRD identifies S081 and S082 as separate system IDs, phases, scopes, integrations, and
  migration workstreams. A shared portal must not collapse them into one data model.

## Recommended user experience

```text
CCP Partnerships Portal
├── Overview
├── Stakeholders (S081)
│   ├── Organisations
│   ├── Contacts
│   ├── Engagement timeline
│   ├── Compliance screening
│   └── Audience segments
├── MOUs & Partnerships (S082)
│   ├── MOU pipeline
│   ├── Agreements
│   ├── Obligations and evidence
│   ├── Renewal calendar
│   ├── Value-realisation reviews
│   └── Termination and archive
└── Reports and audit
```

A stakeholder 360 profile should display linked S082 agreements. Selecting an agreement opens the
S082 module without requiring another login or a context reset. An S082 agreement references the
authoritative S081 stakeholder and contacts by ID.

## Technical boundary

- One frontend portal and design system.
- One SSO session through the approved CLET identity boundary.
- Separate frontend feature modules and route namespaces, for example `/stakeholders/*` and
  `/partnerships/*`.
- Separate API contracts or backend bounded contexts for S081 and S082.
- No duplication of stakeholder/contact master data in S082.
- No storage of signed legal documents in either module; retain S136/S003 references as required by
  the PRD.
- Cross-system transitions use stable identifiers, explicit permissions, and audit events.

## Delivery implication

S081 remains the Fast-Track foundation. S082 can be added as a Phase 2 module inside the same portal
shell without changing the S081 navigation, identity, or stakeholder model. Backend services may be
deployed separately even though the user experiences one portal.

## Rejected alternatives

### Two unrelated portals

Rejected as the default because the same operating users would repeatedly switch context during one
continuous partnership workflow, and stakeholder/contact context would be harder to preserve.

### One merged S081/S082 domain

Rejected because the PRD explicitly assigns different authoritative responsibilities, lifecycle
data, integrations, phases, and co-owners to the two systems.
