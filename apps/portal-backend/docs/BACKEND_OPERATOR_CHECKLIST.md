# Backend Operator Checklist

Use este checklist sempre que o backend do portal for promovido, reconfigurado ou investigado em um ambiente relevante.

## 1. Confirmar contexto do deploy

- O backend endurecido vive em `apps/portal-backend`.
- O host esperado e o host do portal, nao o apex editorial/marketing.
- Confirme `NEXT_PUBLIC_APP_URL` apontando para o host canonico correto do portal antes de validar qualquer callback, readiness ou pagamento.

## 2. Confirmar secrets e guardas internos

- `INTERNAL_API_SECRET`
- `NOTIFICATIONS_WORKER_SECRET`
- `CRON_SECRET`

Sinais de desvio:

- `perimeter.status = missing_configuration`
- rotas internas protegidas inacessiveis por secret
- worker de notificacoes nao aceitando a credencial esperada

## 3. Verificar convergencia operacional rapidamente

Execute no workspace:

```powershell
npm run operations:verify
```

Esse comando resume:

- status agregado do backend
- estado de convergencia por subsistema
- nivel de enforcement
- blockers vs warnings
- se a protecao duravel esta ativa, em fallback ou ainda nao provada

Modos uteis:

- `npm run operations:verify`: leitura local/operacional sem bloquear tudo por padrao
- `npm run operations:verify:ci`: gate repo-safe para CI, sem depender de runtime administrativo real
- `npm run operations:verify:release`: gate mais estrito para promocao production-like
- `npm run operations:evidence:release`: gera artifacts locais de release evidence

## 4. Conferir readiness protegida

Endpoint:

- `GET /api/internal/readiness`

Acesso:

- `x-internal-api-secret`
- ou sessao staff autenticada

Verifique:

- `status`
- `sections`
- `operator.alerts`
- `operator.urgentActions`
- `operator.releaseSafety`

Leitura operacional:

- `healthy`: backend coerente e pronto
- `degraded`: funcional, mas exige revisao planejada
- `missing_configuration`: ambiente incompleto
- `fallback`: comportamento seguro ativo, mas sem convergencia plena
- `hard_failure`: tratar como incidente operacional

Leitura de release-safety:

- `release_blocker`: nao promover
- `action_required`: deploy pode seguir em contextos nao finais, mas exige correcao consciente
- `warning`: aceitavel no contexto atual, ainda assim deve ser observado

## 5. Confirmar protecao duravel

O ambiente deve provar os tres pontos abaixo:

- migracao `20260418120000_phase3_durable_abuse_controls.sql` aplicada
- tabelas `request_rate_limits` e `idempotency_keys` disponiveis
- funcao `claim_rate_limit_bucket` disponivel

Sinais de problema:

- `abuseProtection.status = fallback`
- `abuseProtection.details.runtime.mode = memory-fallback`
- `durableExpectations.status != healthy`

Resposta esperada:

- aplicar ou reconciliar a migracao
- revalidar readiness protegida
- confirmar cobertura dos flows criticos em `abuseProtection.details.flows`
- em promocao final, tratar `durable_runtime_fallback_active` ou `durable_runtime_verification_unavailable` como blocker

## 6. Confirmar pagamentos

Verifique:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE=true`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Sinais de desvio:

- `payments.status = missing_configuration`
- `payments.code = payments_signature_not_enforced`

Governanca:

- em `production`, `payments_signature_not_enforced` passa a ser blocker de release
- em `ci` ou verificacao local continua aparecendo como warning/action-required, sem fingir que o runtime real foi provado

## 6.1 Evidence de release

Quando a liberacao exigir prova rastreavel:

```powershell
npm run operations:evidence:release
```

Revise os arquivos gerados em `apps/portal-backend/.artifacts/operations/release`:

- `backend-operations-report.json`
- `backend-operations-summary.txt`
- `backend-release-evidence.md`
- `backend-release-summary.json`
- `backend-release-summary.md`

Se o artifact listar `manualFollowUps`, trate-os como follow-up real e nao como nota decorativa.
Use `backend-release-summary.md` para o resumo executivo da liberacao e `backend-release-evidence.md` para o detalhe tecnico.

## 7. Confirmar notificacoes e worker

Verifique:

- `NOTIFICATIONS_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY` quando `resend`
- SMTP configurado quando `smtp`
- `NOTIFICATIONS_WORKER_SECRET`
- `CRON_SECRET`

Na readiness protegida, revisar:

- `notifications.status`
- `notifications.details.queue`
- `notifications.details.retryPolicy`

Escalar quando:

- houver `staleProcessing`
- houver `terminalFailures`
- a fila mostrar degradacao repetida apos deploy

## 8. Confirmar Telegram

Verifique:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

Sinais de desvio:

- `telegram.status = missing_configuration`
- falha de webhook ou secret ausente

## 9. O que exige acao urgente

- qualquer `hard_failure`
- qualquer `fallback` no subsistema de protecao duravel
- segredos internos ausentes no perimetro
- webhook de pagamento sem enforcement de assinatura
- worker com itens presos ou falhas terminais persistentes
- qualquer item listado em `operator.releaseSafety.blockers`

## 10. Follow-up manual que continua fora do codigo

- rotacoes externas/manuais de secrets herdadas do fechamento anterior
- aplicacao da migracao duravel em qualquer ambiente ainda nao convergido
- integracao do checklist com observabilidade externa ou alertas, se desejado em fase futura
- prova administrativa real da convergencia duravel enquanto o runtime ainda nao puder ser provado so por CI

## 11. Revalidacao apos rotacao de secrets

- `INTERNAL_API_SECRET`, `NOTIFICATIONS_WORKER_SECRET`, `CRON_SECRET`
  Confirmar acesso com o novo secret e falha com o secret anterior.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`
  Confirmar webhook protegido e ausencia de blocker de assinatura.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  Confirmar readiness saudavel e webhook protegido funcional.
- `META_VERIFY_TOKEN`, `META_APP_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`
  Confirmar verificacao GET da Meta, evento inbound real e envio outbound sem falha de credencial.
