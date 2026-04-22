# Payment Workflow Source Of Truth

## Estados canônicos

- `technical_state`: conta a etapa técnica do registro (`checkout_created`, `webhook_validated`, `reconciled`, `webhook_ignored`, `superseded`).
- `financial_state`: conta a verdade financeira do pagamento (`pending`, `approved`, `failed`, `expired`, `cancelled`, `refunded`, `charged_back`).
- `client_pipeline.payment_state`: continua sendo a projeção comercial simplificada usada pelo cockpit (`link_sent`, `pending`, `approved`, `failed`, `expired`).

## Regras de operação

- Checkout criado nao equivale a pagamento aprovado.
- O webhook nao pode regredir um pagamento conciliado. `pending` depois de `approved` vira `webhook_ignored`.
- Side effects comerciais so podem acontecer uma vez por transicao financeira material. A chave canônica fica em `payment_events.transition_key`.
- Apenas um pagamento deve ficar `active_for_lead = true` por lead. Novo checkout supersede pendencias anteriores.

## Origem da cobrança

Cada registro em `public.payments` passa a carregar:

- `origin_type`
- `origin_source`
- `origin_actor_id`
- `origin_context`

Isso responde melhor quem abriu a cobrança, por qual fluxo e em qual contexto operacional.

## Reconciliação

- `payment/create` registra `checkout_created` e grava contexto/origem.
- `payment/webhook` reconcilia para `financial_state` canônico.
- `payment_events` guarda a trilha auditável das transições aplicadas.
- `commercial_effect_applied_at` e `commercial_effect_key` mostram quando o side effect comercial foi realmente executado.
