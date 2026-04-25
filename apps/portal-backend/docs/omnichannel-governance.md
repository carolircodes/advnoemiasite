# Omnichannel Governance

## Source Of Truth

- Meta channels:
  `app/api/meta/webhook/route.ts` + `lib/services/channel-conversation-router.ts`
- WhatsApp:
  `app/api/whatsapp/webhook/route.ts` + `lib/services/channel-conversation-router.ts`
- Telegram:
  `app/api/telegram/webhook/route.ts` + `lib/services/telegram-conversation-service.ts`
- YouTube:
  `lib/services/youtube-orchestration.ts` + `lib/youtube/youtube-config.ts`
- Capability/readiness matrix:
  `lib/channels/omnichannel-governance.ts`

Legacy services such as `lib/meta/webhook-processor.ts`, `lib/services/comment-duplicate-guard.ts`,
`lib/services/instagram-message-guard.ts` and `lib/services/instagram-comment-automation.ts`
are not the canonical runtime for guarded omnichannel automation.

## Capability Matrix

### Instagram

- Safe today:
  DM inbound/outbound, guarded public reply, conversation linking, handoff to Inbox/WhatsApp.
- Do not automate blindly:
  comment-to-DM campaigns outside policy, legacy keyword/comment services.
- Current mode:
  `guarded_auto`

### Facebook / Messenger

- Safe today:
  Messenger inbound/outbound, guarded public comment reply, CRM/Inbox routing.
- Do not automate blindly:
  cold outreach, comment-to-DM without explicit policy.
- Current mode:
  `guarded_auto`

### WhatsApp

- Safe today:
  inbound/outbound text, status reconciliation, handoff, commercial continuity, payment continuity.
- Do not automate blindly:
  template outreach and any provider-window bypass.
- Current mode:
  `guarded_auto`

### Telegram

- Safe today:
  private assisted replies, curated group signal capture, private redirect, human handoff.
- Do not automate blindly:
  full-auto group participation.
- Current mode:
  `assisted_only`

### YouTube

- Safe today:
  ingestion, inbox/CRM routing, read-only and suggestion mode.
- Do not automate blindly:
  active reply without complete OAuth, policy and human review posture.
- Current mode:
  `assisted_only`

### TikTok

- Safe today:
  nothing beyond architecture planning.
- Do not automate blindly:
  any inbound/outbound behavior before adapter, readiness and policy exist.
- Current mode:
  `human_only`

## Automation And Handoff Policy

- `human_only`:
  channel is not allowed to auto-respond.
- `assisted_only`:
  AI may classify, suggest, summarize and route; outbound stays human-reviewed or heavily constrained.
- `guarded_auto`:
  AI may respond inside explicit policy boundaries, with dedup, observability and handoff.
- `full_auto_blocked`:
  reserved label for channels that technically can automate but are intentionally blocked by policy.

Handoff rules:

- Any explicit request for lawyer/human, urgency, sensitive case or commercial commitment must create a human-visible state transition.
- Public surfaces must prefer:
  public acknowledgement -> private continuation -> human takeover when needed.
- Group/community surfaces must prefer:
  signal capture -> private redirect -> human review.

## Readiness Truth Model

Each channel must report one of:

- `healthy`
- `degraded`
- `missing_configuration`
- `unauthorized`
- `provider_error`
- `optional_subsystem_gap`

No channel should look "connected" if it is actually missing secrets, signature enforcement,
outbound credentials or safe automation mode.

## Adding A New Channel

1. Add a canonical adapter entry in `lib/channels/omnichannel-governance.ts`.
2. Define inbound/outbound contracts before wiring provider calls.
3. Add idempotency fingerprint inputs for retries, duplicate events and manual reprocessing.
4. Emit operational trace events for:
   inbound accepted, signature validated, duplicate blocked, route chosen, reply sent,
   provider error, retry scheduled, handoff triggered, automation blocked.
5. Add readiness/config evaluation before enabling runtime traffic.
6. Add tests for:
   capabilities, readiness, dedup stability and blocked automation.
7. Keep legacy provider experiments outside the canonical source of truth until they meet the same guarantees.
