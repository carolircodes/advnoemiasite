# Backend Release Runbook

Use este runbook quando o backend do portal entrar em deploy, promocao ou incidente de convergencia.

## Pre-deploy

- Confirmar que o alvo e o projeto/backend do portal, nao o apex de marketing.
- Para incidentes de webhook Meta, abrir tambem `docs/META_WEBHOOK_PRODUCTION_DEPLOY.md`.
- Para operacao recorrente do Facebook Messenger, abrir tambem `docs/FACEBOOK_MESSENGER_OPERATIONS.md`.
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
- `handoff/handoff-manifest.json`
- `handoff/release-channel-summary.json`
- `handoff/release-channel-summary.md`
- `handoff/incident-escalation-summary.json`
- `handoff/incident-escalation-summary.md`

Use esses arquivos como prova repo-side da decisao de release.
Use `backend-release-summary.md` como o resumo curto para release manager, `backend-release-evidence.md` como o detalhe operacional, `handoff/release-channel-summary.md` como texto pronto para o canal externo de release e `handoff/incident-escalation-summary.md` como resumo curto para escalonamento manual.

## Post-deploy

- Consultar `GET /api/internal/readiness` com `x-internal-api-secret` ou sessao staff.
- Confirmar `operator.releaseSafety.deployAllowed = true`.
- Confirmar `abuseProtection.details.runtime.mode = durable` quando a prova duravel for exigida.
- Confirmar ausencia de blockers em `operator.releaseSafety.blockers`.
- Revisar `operator.urgentActions` e `operator.alerts`.
- Se houver blocker ou `action_required`, atualizar o handoff externo com o artifact mais recente, nao apenas com observacao verbal.

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

Quando isso acontecer, use `handoff/incident-escalation-summary.md` como o corpo curto do escalonamento e anexe `backend-release-evidence.md` apenas se o destinatario realmente precisar do detalhe tecnico completo.

## Secret rotation revalidation

- `INTERNAL_API_SECRET`, `NOTIFICATIONS_WORKER_SECRET`, `CRON_SECRET`
  Verificar readiness protegida, worker protegido, rejeicao do secret anterior e ausencia de blocker de perimeter no handoff atualizado.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`
  Verificar `GET /api/payment/webhook` com acesso protegido, ausencia de `payments_signature_not_enforced` e prova listada em `proofRequired`.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  Verificar `telegram.status = healthy`, sucesso do webhook protegido e mensagem de teste sem falha de credencial.
- `META_VERIFY_TOKEN`, `META_APP_SECRET`, `FACEBOOK_APP_SECRET`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`
  Verificar callback GET da Meta, novo evento de `object=instagram` e `object=page` com `META_SIGNATURE_VALIDATED`, confirmar qual `matchedSecretSource` validou, revisar `signatureResolutionVersion`, conferir `attemptedSources` e garantir que o projeto Vercel analisado e `advnoemiaportal`.

## External/manual proof still required

- confirmar a migracao `20260418120000_phase3_durable_abuse_controls.sql` no ambiente real
- confirmar as tabelas `request_rate_limits` e `idempotency_keys`
- confirmar a funcao `claim_rate_limit_bucket`
- reexecutar readiness protegida ate o runtime sair de `memory-fallback`
- validar segredos apos qualquer rotacao manual/external
- encaminhar o handoff final para o canal real de release/incidente continua externo ao repo, mas agora deve usar os artifacts em `handoff/`

## Phase 12 release gate

- revisar `docs/PHASE12_OMNICHANNEL_OPERATIONS.md`
- confirmar flags:
  - `CHANNEL_ENABLE_PHASE12_JOURNEY_ORCHESTRATION`
  - `CHANNEL_ENABLE_PHASE12_EXECUTIVE_DASHBOARD`
  - `CHANNEL_ENABLE_PHASE12_EXTERNAL_DISPATCH_PREPARATION`
- abrir `/internal/advogada/inteligencia` e confirmar os blocos omnichannel
- abrir `/internal/advogada/clientes/[id]` e confirmar a linha omnichannel da jornada
- validar que o intake continua gravando `routingDecision` e `journeyTaxonomy` em `intake_requests.metadata`

## YouTube release gate

- revisar `docs/YOUTUBE_OPERATIONS.md`
- confirmar:
  - `YOUTUBE_ENABLE_INGESTION`
  - `YOUTUBE_ENABLE_COMMENT_SYNC`
  - modo escolhido entre read only, suggestion e active reply
- validar `GET /api/internal/youtube?action=status`
- validar `GET /api/internal/youtube?action=oauthStart` quando o canal estiver indo para active
- validar `POST /api/internal/youtube` com `registerAsset`
- validar `POST /api/internal/youtube` com `ingestComment` para video e Short
- confirmar no portal que a thread entra como `YouTube`
- confirmar `automation_dispatches`, `conversation_events` e `product_events` do comentario
