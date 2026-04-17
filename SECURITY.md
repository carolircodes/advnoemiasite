# Security Notes

## Scope

This repository contains internal portal flows, webhook handlers and payment-related
routes. Treat secrets and generated artifacts as sensitive by default.

## Reporting

Report security issues privately to the repository owner before opening a public issue
or pull request.

## Contributor hygiene

- Do not commit real tokens, `.env` files, dumps, logs or checkout diagnostics.
- Keep service-role credentials server-only.
- Use centralized route guards for internal APIs, workers and webhooks.
- Prefer fail-closed behavior when a production secret is required.
