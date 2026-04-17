# Phase 1 Hardening Closeout

## Final scope

Phase 1 was limited to:

- security and access-control hardening
- artifact and repository hygiene
- CI and governance baseline
- docs and config closeout

No Phase 2 expansion is included here.

## What Phase 1 already completed

The main Phase 1 implementation already landed in git history in commit
`47cd55d` (`novo ciclo de fases. fase 1`).

Key changes already committed there:

- centralized route secret validation
- Telegram webhook secret enforcement
- premium subscription webhook secret enforcement
- cron and worker route hardening
- internal payment route restrictions
- public payment payload reduction
- removal of tracked Mercado Pago diagnostic JSON files
- `.gitignore` hardening
- CI workflow with typecheck, test and build
- `CONTRIBUTING.md`, `SECURITY.md`, PR template and `CODEOWNERS`
- safer `apps/portal-backend/.env.example`

## What was verified during closeout

### Git history

- Verified that the Phase 1 implementation is already committed in `47cd55d`.
- Verified that `HEAD` still contains the Phase 1 files and behavior.
- Verified that the current working tree was clean before this closeout pass.

### Sensitive history

- Verified that the Mercado Pago diagnostic files were historically tracked.
- Confirmed their removal happened in `47cd55d`.
- Confirmed those historical files were payment-related artifacts, not harmless placeholders.
- Did not print any sensitive values during the closeout document itself.

### Security behavior

- Added automated closeout tests for the centralized secret helper and the
  public payment payload shaping.
- Verified fail-closed logic in code paths for:
  - Telegram webhook
  - subscription recurrence webhook
  - notifications cron
  - notifications worker
  - internal service secret access
  - restricted public payment payload

### CI and governance

- Re-validated `npm run typecheck`, `npm run test` and `npm run build`.
- Confirmed the GitHub Actions workflow uses the root install path and the real repo scripts.
- Confirmed the PR template, `CODEOWNERS`, `CONTRIBUTING.md` and `SECURITY.md`
  are present and useful.

## Sensitive artifact history assessment

Historically tracked files:

- `apps/portal-backend/mp-card-token.json`
- `apps/portal-backend/mp-payment-diagnostic.json`
- `apps/portal-backend/mp-payment.json`
- `apps/portal-backend/mp-test-user.json`

Assessment:

- These files were not generic placeholders.
- They were Mercado Pago diagnostic artifacts tied to payment testing.
- Based on filename and historical structure, they included payment-flow data such as:
  - tokenized checkout diagnostics
  - test card data
  - external references
  - test payer identifiers
- From current evidence, I could not prove that long-lived production secrets were stored inside
  those JSON files.
- I also could not prove that real customer data was stored there; what was visible strongly
  resembled test-mode artifacts.

Risk decision:

- Recommended action: `rotate secrets + accept history`

Why this recommendation:

- The artifacts were sensitive enough that rotation is appropriate.
- The current evidence points more to payment diagnostics and test tokens than to stable platform
  credentials.
- A full history rewrite is not the default recommendation here because the known evidence does not
  clearly show long-lived production secrets or confirmed real-customer records.

Minimum operational response:

- rotate any Mercado Pago credentials still associated with the environment used during those tests
- invalidate or replace any still-active test users or test tokens if the workspace keeps them alive
- keep the files removed from current history going forward

## Route verification status

### Automated verification added

Covered by automated tests:

- centralized secret helper denies missing secret outside local dev
- centralized secret helper denies wrong secret
- centralized secret helper accepts correct header secret
- centralized secret helper accepts correct query secret
- localhost fallback is restricted to local non-production mode
- internal service secret helper only allows the configured secret
- public payment payload excludes internal metadata leakage

### Manual verification still used

The current test harness does not cleanly mock the full Next.js route stack plus Supabase/session
internals for every hardened endpoint without introducing disproportionate new tooling. Because of
that, route-level verification for some endpoints remains documented manual work.

Manual verification steps:

1. Telegram webhook
   - unset `TELEGRAM_WEBHOOK_SECRET` and call the deployed route from a non-local host
   - expect `503`
   - set a wrong secret in `x-telegram-webhook-secret`
   - expect `401`
   - set the correct secret
   - expect the request to proceed past the guard and fail only on payload/business handling if the
     payload is invalid

2. Premium subscription webhook
   - unset `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET` in staging/production
   - expect `503`
   - send wrong secret
   - expect `401`
   - send correct secret via header or query param
   - expect guard pass, with later validation deciding `400` or success

3. Notifications cron
   - with `CRON_SECRET` missing on localhost dev, call `GET /api/cron/notifications`
   - expect local fallback behavior only on localhost
   - in staging/production with `CRON_SECRET` missing, expect `503`
   - with wrong bearer token, expect `401`
   - with correct bearer token, expect normal route behavior

4. Notifications worker
   - unset `NOTIFICATIONS_WORKER_SECRET`
   - expect `503`
   - send wrong `x-worker-secret`
   - expect `401`
   - send correct secret
   - expect normal processing path

5. Internal Noemia payment route
   - call without session or `INTERNAL_API_SECRET`
   - expect denial
   - call with valid `INTERNAL_API_SECRET`
   - expect the route to continue into input/business validation

6. Public payment status route
   - call `GET /api/payment/create?payment_id=...`
   - verify response includes only public-safe fields
   - call `GET /api/payment/create?lead_id=...` without internal auth
   - expect denial

## Environment and deployment checklist

### Required base envs

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### Phase 1 protected-route envs

- `TELEGRAM_WEBHOOK_SECRET`
- `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET`
- `CRON_SECRET`
- `NOTIFICATIONS_WORKER_SECRET`
- `INTERNAL_API_SECRET`

### Notification envs

For Resend:

- `NOTIFICATIONS_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NOTIFICATIONS_REPLY_TO`

For SMTP:

- `NOTIFICATIONS_PROVIDER=smtp`
- `NOTIFICATIONS_SMTP_HOST`
- `NOTIFICATIONS_SMTP_PORT`
- `NOTIFICATIONS_SMTP_USER` when required
- `NOTIFICATIONS_SMTP_PASS` when required
- `NOTIFICATIONS_SMTP_SECURE` when required
- `EMAIL_FROM`

### Payment envs still required for payment flow

- `MERCADO_PAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_APP_URL`

### Deployment closeout checklist

- provision all Phase 1 protected-route secrets in staging
- provision all Phase 1 protected-route secrets in production
- rotate Mercado Pago credentials linked to the historical diagnostic artifacts
- verify that no local `.env` file was committed
- run:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

## CI and governance closeout

### What is already good enough for Phase 1

- CI install path is correct from repo root using `npm ci`
- CI runs:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- PR template exists and is directly useful
- `CODEOWNERS` is syntactically valid
- `CONTRIBUTING.md` and `SECURITY.md` provide real guidance

### What cannot be enforced from inside the repo

GitHub branch protection still requires manual repository settings.

Recommended GitHub settings for `main`:

1. Require a pull request before merging
2. Require status checks to pass before merging
3. Add required check:
   - `portal-baseline`
4. Require branches to be up to date before merging
5. Restrict force pushes
6. Restrict branch deletion
7. Optionally require review approval if the team workflow supports it

## Root audit files decision

The root-level audit files are currently tracked in git, not untracked or ignored.

Tracked files:

- `AUDITORIA_GERAL.md`
- `INVENTARIO_SISTEMA.md`
- `PROBLEMAS_PRIORIZADOS.md`
- `LACUNAS_ESTRATEGICAS.md`
- `ROADMAP_SUGERIDO.md`
- `RESUMO_EXECUTIVO.json`

Decision:

- Keep them intentionally versioned for now.
- Do not move or delete them during Phase 1 closeout.

Reason:

- They were committed together with the main Phase 1 hardening commit.
- Moving them now would create scope drift and churn without improving production hardening.
- A future documentation reorganization can move them under `docs/` if desired, but that is not
  necessary to close Phase 1.

## Lint baseline decision

Lint was intentionally not added in this closeout.

Reason:

- The repository does not already expose a stable lint path.
- Adding lint now would likely create broad unrelated churn and expand scope beyond strict
  Phase 1 closeout.

Decision:

- defer lint baseline to Phase 2

## Final verdict

`Phase 1 closed with manual follow-up`

Why:

- The repository-side hardening is committed and validated.
- CI/governance files are present and usable.
- The remaining required actions are operational, not code changes:
  - secret rotation
  - environment provisioning
  - GitHub branch protection configuration
