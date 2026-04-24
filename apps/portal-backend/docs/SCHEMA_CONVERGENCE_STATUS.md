# Schema Convergence Status

Status de referencia operacional para manter codigo, migrations e banco remoto alinhados.

## Canonico hoje

- `supabase/migrations` continua sendo a source of truth de schema.
- `public.payments.financial_state` e `public.payments.technical_state` sao os estados canonicos do trilho financeiro.
- `public.payment_events` e a trilha auditavel/idempotente obrigatoria para transicoes financeiras.
- `public.case_events.visible_to_client`, `public.documents.status`, `public.appointments.title` e as colunas novas de `public.appointment_history` fazem parte do schema esperado pelo produto.

## Estado remoto comprovado em 2026-04-24

- A hotfix `20260424183000_phase6_schema_convergence_hotfix.sql` foi aplicada no banco remoto.
- `npm run validate:schema` ficou verde no remoto apos a aplicacao.
- As 7 frentes de drift critico (`case_events`, `documents`, `appointments`, `appointment_history`, `payments`, `payment_events`, `intake_requests`) convergiram fisicamente no banco.

## Fallbacks criticos ja removidos

- `revenue-intelligence` nao aceita mais `payments.status` como source of truth financeiro.
- `payment-workflow` agora resolve estado persistido a partir de `financial_state`.
- `api/noemia/payment` devolve `financial_state` canonico em vez de reciclar `status`.
- `conversation-inbox` passou a classificar pendencia e aprovacao com `financial_state`.

## Compatibilidade transitoria ainda ativa

- Dashboard interno continua com fallback explicito para `case_events`, `documents`, `appointments`, `appointment_history` e shape legado de `conversation_sessions`.
- `client-workspace` continua com fallback explicito para `case_events.visible_to_client`, `documents.status` e `appointments.title`.
- `conversation-persistence` e `triage-persistence` seguem como compatibilidade historica controlada por flag, fora do escopo do drift critico ja convergido.

## Guardrails mantidos

- `npm run validate:schema` segue cobrindo `case_events`, `documents`, `appointments`, `appointment_history` e trilho financeiro.
- O source of truth oficial nao exige `intake_requests.contact_channel`, porque essa coluna nao existe nas migrations canonicas.
- `api/payment/create` e `api/payment/webhook` mantem preflight de compatibilidade do schema e falham de forma diagnostica se surgir novo drift no trilho financeiro.

## Pendencia operacional aberta

- A hotfix remota foi aplicada por SQL direto, entao o banco convergiu fisicamente sem avancar o ledger em `supabase_migrations.schema_migrations`.
- Antes de considerar o processo totalmente governado, a equipe precisa registrar formalmente essa aplicacao no fluxo oficial de migrations sem reaplicar a SQL em um banco ja convergido.

## Proxima etapa segura

1. Revalidar `/internal/advogada` com sessao autenticada real.
2. Revalidar `/cliente` com sessao autenticada real.
3. So depois disso remover fallbacks de `dashboard` e `client-workspace`.
4. Tratar `conversation-persistence` e `triage-persistence` como fase propria de legado historico.
