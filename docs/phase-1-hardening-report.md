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

## April 17, 2026 operational follow-up

### Vercel project and domain mapping

- The repo deploys to two Vercel production projects under the same team:
  - `advnoemiasite`
    - domains: `advnoemia.com.br`, `www.advnoemia.com.br`, `api.advnoemia.com.br`
    - role: public marketing site / static host
  - `advnoemiaportal`
    - domain: `portal.advnoemia.com.br`
    - role: Next.js portal backend that serves the hardened API routes
- The hardened routes verified below belong to `advnoemiaportal`, not the apex/www site.
- Direct probes confirmed that `https://www.advnoemia.com.br/api/telegram/webhook` and
  `https://www.advnoemia.com.br/api/cron/notifications` return Vercel `NOT_FOUND`.
- Direct probes confirmed that `https://portal.advnoemia.com.br/api/telegram/webhook`,
  `https://portal.advnoemia.com.br/api/payment/webhook` and
  `https://portal.advnoemia.com.br/api/cron/notifications` resolve on the live portal deployment.

### Route ownership and expected public paths

- `apps/portal-backend/app/api/telegram/webhook/route.ts`
  - public path: `/api/telegram/webhook`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/worker/notifications/process/route.ts`
  - public path: `/api/worker/notifications/process`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/cron/notifications/route.ts`
  - public path: `/api/cron/notifications`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/payment/create/route.ts`
  - public path: `/api/payment/create`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/payment/webhook/route.ts`
  - public path: `/api/payment/webhook`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/noemia/payment/route.ts`
  - public path: `/api/noemia/payment`
  - public host: `https://portal.advnoemia.com.br`
- `apps/portal-backend/app/api/ecosystem/subscription/webhook/route.ts`
  - public path: `/api/ecosystem/subscription/webhook`
  - public host: `https://portal.advnoemia.com.br`

### Environment matrix by hardened route

- Telegram webhook
  - route: `POST /api/telegram/webhook`
  - required: `TELEGRAM_WEBHOOK_SECRET`
  - supporting integration env: `TELEGRAM_BOT_TOKEN`
  - live finding: route existed on `portal.advnoemia.com.br`; unauthenticated POST returned `401`, so the secret is configured in the portal production project
- Premium subscription webhook
  - route: `POST /api/ecosystem/subscription/webhook`
  - required: `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET`
  - live finding: code reads its own dedicated env name; it is not an alias for `MERCADO_PAGO_WEBHOOK_SECRET`
  - production status on April 18, 2026: missing in the live portal project at the time of validation (`503 Defina ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET para proteger esta rota.`)
- Notifications cron
  - route: `GET /api/cron/notifications`
  - required: `CRON_SECRET`
  - supporting notification env: `EMAIL_FROM` plus either `RESEND_API_KEY` or SMTP variables
  - live finding: unauthenticated GET on `portal.advnoemia.com.br` returned `401`, so the route is deployed and protected in production
- Notifications worker
  - route: `POST /api/worker/notifications/process`
  - required: `NOTIFICATIONS_WORKER_SECRET`
- Internal payment / internal service routes
  - route family: internal routes guarded by `hasInternalServiceSecretAccess()`
  - required: `INTERNAL_API_SECRET`
- Mercado Pago checkout/webhook
  - routes: `/api/payment/create`, `/api/payment/webhook`
  - required: `MERCADO_PAGO_ACCESS_TOKEN`
  - required for signature validation: `MERCADO_PAGO_WEBHOOK_SECRET`
  - supporting: `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_APP_URL`
  - webhook diagnostics on production confirmed:
    - access token configured
    - webhook secret configured
    - Supabase base/admin env configured
    - site URL configured
- Shared base envs still required by the portal:
  - `NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br`
  - `NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### Telegram repair status

- Root cause 1: Telegram was registered against `https://advnoemia.com.br/api/telegram/webhook`, which redirects to `www` and then lands on a project that does not contain the webhook route.
- Root cause 2: the route only trusted `x-telegram-webhook-secret`, but Telegram sends
  `X-Telegram-Bot-Api-Secret-Token` when `secret_token` is configured via Bot API.
- The route now accepts both header names, preserving manual probes while matching Telegram's real delivery behavior.
- Telegram Bot API follow-up on April 18, 2026:
  - previous `getWebhookInfo` showed:
    - URL on the wrong apex host
    - `last_error_message = Wrong response from the webhook: 307 Temporary Redirect`
  - after repair, the webhook was re-registered to:
    - `https://portal.advnoemia.com.br/api/telegram/webhook`
- Operational note:
  - the currently configured production `TELEGRAM_WEBHOOK_SECRET` still matched the exposed local value at the time of validation, because an authenticated manual probe using the local secret passed the guard on the deployed route
  - treat that secret as compromised and rotate it in Vercel after the fixed deployment is live
  - the currently configured Telegram bot token also remains active enough to answer `getWebhookInfo`, so treat bot token rotation as still required through BotFather

### Mercado Pago closeout

- `MERCADO_PAGO_ACCESS_TOKEN` and `MERCADO_PAGO_WEBHOOK_SECRET` are both actively used by code.
- `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET` is a separate recurring-subscription secret, not an alias of the Mercado Pago webhook secret.
- No git history rewrite was performed.
- Rotation remains required for Mercado Pago credentials historically associated with the removed diagnostic artifacts.

### Remaining manual actions outside the repo

- rotate `TELEGRAM_BOT_TOKEN` in BotFather, then update the new token in Vercel for the portal project
- rotate `TELEGRAM_WEBHOOK_SECRET` in the portal project and re-run `setWebhook` with the new secret
- provision `ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET` in the portal project for production (and preview if the webhook is exercised there)
- rotate Mercado Pago credentials/tokens tied to the historical diagnostic artifacts
- confirm GitHub branch protection settings on `main`

## Final verdict

`Phase 1 closed with manual follow-up`

Why:

- The repository-side hardening is committed and validated.
- The production topology is now mapped precisely.
- The remaining risk after this follow-up is operational secret rotation and final deployment of the Telegram header compatibility fix.
