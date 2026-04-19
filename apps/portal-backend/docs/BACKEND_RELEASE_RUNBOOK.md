# Backend Release Runbook

Use este runbook quando o backend do portal entrar em deploy, promocao ou incidente de convergencia.

## Pre-deploy

- Confirmar que o alvo e o projeto/backend do portal, nao o apex de marketing.
- Executar `npm run operations:verify:release` no workspace do backend.
- Tratar qualquer `release_blocker` como impeditivo real de promocao.
- Se houver `action_required`, registrar a decisao conscientemente antes do deploy.

## Evidence artifact

Gerar um pacote local de evidence quando a liberacao exigir rastreabilidade:

```powershell
npm run operations:evidence:release
```

Arquivos esperados em `apps/portal-backend/.artifacts/operations/release`:

- `backend-operations-report.json`
- `backend-operations-summary.txt`
- `backend-release-evidence.md`
- `backend-release-summary.json`
- `backend-release-summary.md`

Use esses arquivos como prova repo-side da decisao de release.
Use `backend-release-summary.md` como o resumo curto para release manager e `backend-release-evidence.md` como o detalhe operacional.

## Post-deploy

- Consultar `GET /api/internal/readiness` com `x-internal-api-secret` ou sessao staff.
- Confirmar `operator.releaseSafety.deployAllowed = true`.
- Confirmar `abuseProtection.details.runtime.mode = durable` quando a prova duravel for exigida.
- Confirmar ausencia de blockers em `operator.releaseSafety.blockers`.
- Revisar `operator.urgentActions` e `operator.alerts`.

## Release blockers

- `deployment_host_misaligned`
- `payments_signature_not_enforced` em perfil production
- `durable_runtime_fallback_active`
- `durable_runtime_verification_unavailable` quando a promocao exige prova runtime real
- qualquer `hard_failure`
- qualquer lacuna obrigatoria em `environmentCompleteness`

## Warnings aceitaveis apenas com consciencia

- `telegram_missing` quando o canal nao faz parte da liberacao
- degradacoes planejadas sem impacto em rotas criticas
- gaps que aparecem como `warning` no report e nao afetam o fluxo liberado

## Immediate escalation

- readiness protegida com `fallback` ou `hard_failure`
- worker com `staleProcessing` ou `terminalFailures`
- pagamento sem enforcement de assinatura
- qualquer ambiente production-like sem prova duravel quando a release depende disso

## Secret rotation revalidation

- `INTERNAL_API_SECRET`, `NOTIFICATIONS_WORKER_SECRET`, `CRON_SECRET`
  Verificar readiness protegida, worker protegido e rejeicao do secret anterior.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`
  Verificar `GET /api/payment/webhook` com acesso protegido e ausencia de `payments_signature_not_enforced`.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  Verificar `telegram.status = healthy` e sucesso do webhook protegido.
- `META_VERIFY_TOKEN`, `META_APP_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`
  Verificar callback GET da Meta, novo evento com `META_WEBHOOK_INBOUND_ACCEPTED` e envio outbound sem erro de token.

## External/manual proof still required

- confirmar a migracao `20260418120000_phase3_durable_abuse_controls.sql` no ambiente real
- confirmar as tabelas `request_rate_limits` e `idempotency_keys`
- confirmar a funcao `claim_rate_limit_bucket`
- reexecutar readiness protegida ate o runtime sair de `memory-fallback`
- validar segredos apos qualquer rotacao manual/external
