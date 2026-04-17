# Phase 1 Hardening Report

## Scope completed

This phase focused only on production foundation hardening:

- security and access-control consistency on sensitive routes
- repository hygiene for sensitive and generated artifacts
- CI and lightweight engineering governance
- targeted debt containment needed to support the above

## Implemented changes

### Security and access control

- Centralized secret-based route protection in
  `apps/portal-backend/lib/http/route-secret.ts`.
- Hardened Telegram webhook to require `TELEGRAM_WEBHOOK_SECRET`, with localhost-only
  fallback when the secret is intentionally absent in development.
- Hardened premium subscription webhook to fail closed when
  `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET` is not configured outside local development.
- Hardened notification cron and worker routes to use centralized secret validation.
- Locked `/api/noemia/payment` behind either internal staff auth or `INTERNAL_API_SECRET`.
- Restricted `/api/payment/create` lead-based lookups so `lead_id` now requires internal
  access, while public payment status checks remain available for return flows.
- Reduced public payment payload exposure to only the fields needed by return pages.

### Repository and artifact hygiene

- Removed tracked Mercado Pago diagnostic/token JSON artifacts.
- Expanded `.gitignore` to block payment diagnostics, dumps, backups, temp folders and uploads.
- Rewrote `apps/portal-backend/.env.example` as a safer template with the new required secrets
  documented explicitly.

### CI and governance baseline

- Added root workspace scripts for `typecheck` and `test`.
- Added portal scripts for `typecheck` and `test`.
- Added `apps/portal-backend/tests/run.ts` so the existing test suite can run reliably in CI.
- Added GitHub Actions CI for install, typecheck, test and build.
- Added lightweight governance files:
  - `.github/pull_request_template.md`
  - `.github/CODEOWNERS`
  - `CONTRIBUTING.md`
  - `SECURITY.md`

## Validation performed

Commands executed from repository root:

```bash
npm run typecheck
npm run test
npm run build
```

Results:

- `npm run typecheck`: passed
- `npm run test`: passed (21 tests)
- `npm run build`: passed

## Risks reduced now

- Unauthenticated Telegram webhook execution
- Fail-open subscription webhook behavior when secret was missing
- Duplicated and inconsistent secret checks across worker/cron routes
- Public lead-based payment lookups using privileged database access
- Tracked payment diagnostics and token snapshots inside version control
- Missing CI baseline for core build and validation checks

## Remaining high-priority risks

- Public payment creation (`POST /api/payment/create`) still depends on input trust and should
  be revisited in a later phase if external abuse pressure increases.
- Internal authorization still mixes session-based and service-secret access patterns across
  the codebase; broader normalization belongs in Phase 2.
- There is still no lint baseline in the repository.
- Existing untracked audit artifacts at repository root should be reviewed intentionally before
  any commit.
