# Operational Observability Runbook

Este documento resume o padrao minimo de sinais operacionais adotado no portal.

## Campos minimos de log

Nos fluxos criticos, os eventos estruturados agora devem expor:

- `requestId`
- `correlationId`
- `flow`
- `event`
- `level`
- `outcome`
- `status`
- `channel`
- `provider`
- `errorCategory`
- `durationMs`

## Categorias operacionais de erro

- `configuration`: env, secret ou provider nao configurado
- `authentication`: token, assinatura ou credencial invalida
- `boundary`: acesso negado por regra de seguranca
- `validation`: payload ou query invalida
- `rate_limit`: limitador disparou
- `idempotency`: request repetida ou conflito de reprocessamento
- `provider`: dependencia externa falhou ou degradou
- `fallback`: sistema caiu para fallback ou perdeu protecao duravel
- `not_found`: recurso esperado nao foi localizado
- `internal`: bug ou falha interna nao categorizada

## Como ler um incidente rapido

### `payment/create`

- se `errorCategory=configuration`: revisar envs de Mercado Pago, Supabase admin e URL publica
- se `errorCategory=boundary`: chamada interna sem `INTERNAL_API_SECRET` ou sem sessao staff
- se `errorCategory=fallback`: protecao duravel indisponivel; tratar como indisponibilidade real em producao
- se `errorCategory=provider`: Mercado Pago ou telemetria externa degradados

### `payment/webhook`

- `PAYMENT_WEBHOOK_SIGNATURE_REJECTED`: problema de assinatura, segredo ou request nao confiavel
- `PAYMENT_WEBHOOK_*_PAYMENT_NOT_FOUND`: webhook chegou sem correlacao persistida suficiente
- `PAYMENT_WEBHOOK_*_COMMERCIAL_SYNC_DEGRADED`: pagamento reconciliou, mas CRM/fechamento nao sincronizou completamente

### `noemia/chat`

- `NOEMIA_CHAT_CORE_FALLBACK`: IA caiu para fallback seguro
- `NOEMIA_CHAT_SITE_SESSION_MISCONFIGURED`: segredo/cookie do chat nao esta configurado corretamente
- `NOEMIA_CHAT_HANDOFF_REQUESTED`: conversa do site ficou sensivel ou quente e exige olhar humano

### `notifications_cron` e `notifications_worker`

- `*_CONFIG_MISSING`: falha de ambiente; nao tratar como sucesso
- `*_PROCESSED` com `outcome=degraded`: fila rodou, mas houve falhas parciais

## Evidencia minima para incident response

Quando um fluxo falhar, capturar:

1. `requestId` ou `correlationId`
2. `flow`
3. `event`
4. `errorCategory`
5. `status`
6. se houve `fallback` ou `outcome=degraded`

## Regra operacional

- nao chamar um fluxo de "saudavel" quando ele estiver em fallback
- nao tratar falta de configuracao como sucesso silencioso
- em rotas publicas criticas, `fallback` duravel em producao e degradacao real, nao detalhe cosmetico
