# Phase 2 Hardening Report

## Objective

Phase 2 focused on making the hardened core more coherent, abuse-resistant,
governable, and maintainable without expanding into new product scope.

The main targets were:

- centralize privileged API authorization patterns
- reduce route-by-route security variance
- harden public payment and Noemia flows against abuse and enumeration
- tighten error shaping and operator-facing diagnostics
- introduce a real lint baseline that can run in CI

## Authorization Model Improvements

New shared authorization helpers now live in:

- `apps/portal-backend/lib/auth/api-authorization.ts`

The shared model now separates:

- `requireStaffRouteAccess(...)` for staff/admin session-backed APIs
- `requireRouteSecretOrStaffAccess(...)` for automation/internal-secret routes
  that may also allow authenticated staff access

This reduces route-local duplication and normalizes:

- default-deny behavior
- `401` vs `403` handling through the existing staff session guard
- secret-guarded denial responses
- security tracing for denied privileged access

The shared access model was applied to:

- notifications cron and worker routes
- premium subscription webhook
- internal appointments, clients, events, and Telegram distribution routes
- Noemia triage routes
- privileged Noemia payment flow
- protected payment lead lookup

## Payment And Noemia Abuse Hardening

High-risk public and semi-public flows were tightened in these areas:

- `POST /api/payment/create`
- `GET /api/payment/create`
- `GET/POST /api/noemia/payment`
- `POST /api/noemia/chat`
- `POST /api/public/triage`
- `GET /api/payment/webhook`

Hardening added:

- schema-based request validation for payment creation and Noemia payment input
- in-memory throttling for:
  - public payment creation
  - public payment status lookups
  - Noemia chat
  - public triage
- public-safe payment lookup failures via `payment_status_unavailable`
  instead of sharper existence signals
- payment metadata sanitization so caller-controlled metadata can no longer
  overwrite reserved fields like `lead_id`, `user_id`, offer identity, pricing,
  or internal reference fields
- lightweight request fingerprinting for payment creation telemetry/debugging
- generic public-facing configuration failure responses instead of exposing env
  gaps in public payment create/webhook responses

## Middleware And Guard Simplification

Phase 1 had already introduced strong secret enforcement on critical routes.
Phase 2 reduced manual variance across the broader sensitive perimeter by
replacing repeated inline guard logic with shared helpers on sensitive routes.

This makes the portal/backend assumptions more explicit:

- privileged API access is resolved in the backend project through shared helpers
- automation routes can accept the intended secret and optionally allow internal
  staff fallback where appropriate
- Telegram webhook Phase 1 behavior remains untouched

## Error Discipline And Observability

New shared route utilities now live in:

- `apps/portal-backend/lib/http/api-response.ts`
- `apps/portal-backend/lib/http/request-guards.ts`

These utilities support:

- safe JSON request parsing
- compact public error responses
- optional structured validation detail for internal callers
- reusable rate-limit headers

Operational visibility improved through:

- denied privileged access tracing from the shared authorization layer
- rate-limit logging for public payment creation
- sanitized public error shaping for triage and premium subscription webhook
- restricted Mercado Pago webhook diagnostics:
  - public callers now see only a generic active message
  - internal secret/staff access is required for runtime diagnostics

## Lint And Quality Baseline

Phase 2 introduced a scoped TypeScript ESLint baseline for the hardened backend
perimeter instead of attempting a noisy full-repo cleanup.

Added:

- root `npm run lint`
- workspace lint script for the backend app
- TypeScript ESLint configuration in `apps/portal-backend/.eslintrc.cjs`
- CI lint step in `.github/workflows/ci.yml`

Scope:

- backend API routes for cron, ecosystem, internal, Noemia, payment, and public
  surfaces
- shared auth/http/payment helpers
- backend tests

Important note:

- `next build` now skips full-repo linting through `next.config.ts`
- this is intentional so production builds are not blocked by unrelated legacy
  lint debt outside the scoped Phase 2 baseline
- the scoped lint gate remains enforced explicitly in CI through `npm run lint`

## Validation Summary

Validated locally:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Added regression coverage for:

- shared staff route access
- shared secret-or-staff route access
- payment metadata sanitization
- shared rate limiting behavior

## Known Remaining Risks

- the broader frontend and service layer still carries significant pre-existing
  lint debt outside the scoped Phase 2 lint baseline
- rate limiting is intentionally lightweight and in-memory, so it improves abuse
  resistance but is not a distributed/global limiter
- some legacy internal routes still rely directly on older guard patterns and
  can be migrated gradually to the shared access helpers
- operational secret rotation items from Phase 1 still remain separate from this
  code-focused hardening pass

## Recommended Phase 3

Phase 3 should focus on distributed abuse controls and governance depth rather
than new surface area:

- move high-risk public throttles to a shared durable limiter or edge-backed
  control plane
- finish migrating remaining sensitive routes and privileged writes onto the
  shared authorization helpers
- pay down the broader repo lint backlog until build-time linting can be
  re-enabled safely
