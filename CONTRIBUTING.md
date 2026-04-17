# Contributing

## Baseline local checks

Run these commands from the repository root before opening a PR:

```bash
npm run typecheck
npm run test
npm run build
```

## Secrets and generated artifacts

Never commit:

- real `.env` files or copied production secrets
- payment diagnostics, token snapshots, raw webhook payload dumps or temporary exports
- local logs, uploads, caches, browser automation artifacts or backups

If a new environment variable is required, document it in
`apps/portal-backend/.env.example` in the same change.

## Protected routes

When touching webhooks, admin APIs or internal routes:

- keep privileged checks server-side
- prefer centralized guards over inline comparisons
- fail closed when a production secret is missing
