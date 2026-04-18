# Phase 3 Hardening Report

## Objective

Phase 3 focused on making the hardened platform more durable under real
production conditions without expanding product scope.

The main targets were:

- replace in-memory abuse controls on the highest-risk public routes
- finish migrating the highest-value privileged APIs onto the shared access model
- reduce worker/background fragility in multi-instance processing
- improve protected operator diagnostics and readiness visibility
- expand the lint baseline just enough to cover the new security-critical code

## Durable Abuse Protections Introduced

Phase 2 had already added throttling, but it was intentionally in-memory.
Phase 3 introduced a Supabase-backed durable control layer in:

- `apps/portal-backend/lib/http/durable-abuse-protection.ts`
- `apps/portal-backend/supabase/migrations/20260418120000_phase3_durable_abuse_controls.sql`

This adds:

- `request_rate_limits` for cross-instance rate-limit buckets
- `idempotency_keys` for replay-safe high-impact operations
- a `claim_rate_limit_bucket(...)` SQL function for atomic bucket updates
- a conservative in-memory fallback path with explicit operational warning traces

The durable limiter now protects:

- `POST /api/payment/create`
- `GET /api/payment/create`
- `POST /api/noemia/chat`
- `POST /api/public/triage`
- `POST /api/public/events`
- `POST /api/leads/create`

Payment creation also now uses a durable idempotency claim:

- repeated identical requests replay the stored response instead of duplicating
  the checkout creation path
- conflicting in-flight requests return a controlled conflict response
- failures are marked so the same caller can retry safely after the short retry
  window

## Remaining Perimeter Migration Completed

Phase 3 moved another high-risk slice of the privileged perimeter onto the
shared Phase 2 helper model:

- `apps/portal-backend/app/api/internal/operational/route.ts`
- `apps/portal-backend/app/api/internal/conversations/route.ts`
- `apps/portal-backend/app/api/internal/clients/merge/route.ts`
- `apps/portal-backend/app/api/internal/documents/route.ts`
- `apps/portal-backend/app/api/internal/document-requests/route.ts`
- `apps/portal-backend/app/api/internal/follow-up/route.ts`
- `apps/portal-backend/app/api/internal/leads/route.ts`
- `apps/portal-backend/app/api/internal/leads/[userId]/conversations/route.ts`
- `apps/portal-backend/app/api/leads/create/route.ts` `GET`

These routes now rely on `requireStaffRouteAccess(...)` or the existing
secret-or-staff helper instead of route-local auth branches.

That improves:

- centralized `401` / `403` behavior
- default-deny semantics
- access-denial tracing
- consistency for privileged reads and writes

## Worker And Background Reliability Improvements

The notifications worker was hardened to behave more safely under concurrent
serverless execution in:

- `apps/portal-backend/lib/services/process-notifications.ts`
- `apps/portal-backend/lib/services/notification-error-classification.ts`

Improvements made:

- notification rows are now claimed atomically with a status/attempt/availability
  guard before processing
- contended claims are detected and counted instead of silently double-sending
- processing state now records `processing_started_at` and `processing_worker`
- failures are classified into coarse operator-useful buckets:
  - `database`
  - `provider`
  - `configuration`
  - `validation`
  - `unsupported`
  - `unknown`
- worker traces now distinguish:
  - successful delivery
  - claim contention
  - classified send failure

This keeps the Phase 1 secret protections intact while making downstream worker
failures easier to diagnose.

## Observability And Diagnostics Improvements

Phase 3 added a protected readiness surface:

- `apps/portal-backend/app/api/internal/readiness/route.ts`

This endpoint requires:

- `INTERNAL_API_SECRET`
- or a valid internal staff session

It reports only operator-safe readiness information such as:

- whether the configured app URL points at the portal deployment context
- whether durable abuse-control storage is available
- whether payment, notification, and Telegram prerequisites are configured

It does not expose secret values.

Phase 3 also made degraded durability explicit:

- durable limiter storage failures log a trace and fall back to the lightweight
  in-memory limiter
- worker failures emit classified operational traces

## Lint And Quality Expansion

Phase 2 introduced a scoped lint baseline.
Phase 3 expanded that baseline to cover the newly hardened perimeter:

- `app/api/leads`
- protected readiness and internal route updates under `app/api/internal`
- durable abuse helpers under `lib/http`
- worker reliability code under `lib/services`
- observability helpers used by the new paths

The build still skips full-repo linting intentionally, but CI and local
validation now cover a broader slice of the risk-heavy backend surface through
`npm run lint`.

## Validation Summary

Validated locally:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Added Phase 3 targeted coverage for:

- durable distributed limiter behavior
- durable limiter fallback behavior
- idempotent replay/conflict handling
- notification error classification
- protected durability/readiness status handling

## Known Remaining Risks

- a few lower-priority legacy internal routes still use the older staff guard
  pattern:
  - `app/api/internal/acquisition/route.ts`
  - `app/api/internal/email-preview/route.ts`
  - `app/api/internal/performance/route.ts`
- the durable limiter depends on the new Supabase migration being applied in
  every environment; if the schema is missing, the platform falls back to the
  in-memory limiter with warning traces
- the broader repo still carries legacy lint debt outside the backend-centered
  scoped baseline
- Phase 1 external/manual secret rotations remain separate operational work

## Recommended Phase 4

Phase 4 should stay operational and governance-focused:

- finish migrating the last legacy privileged routes to the shared helper model
- apply the new durable abuse-control migration in every environment and verify
  readiness from the protected diagnostics surface
- start paying down the remaining backend/service lint debt until build-time
  lint can be re-enabled safely
