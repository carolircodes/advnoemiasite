# Schema Convergence Status

Status de referencia operacional para reduzir drift entre codigo, migrations e banco real.

## Canonico hoje

- `supabase/migrations` continua sendo a source of truth de schema.
- `public.payments.financial_state` e `public.payments.technical_state` sao os estados canonicos do trilho financeiro.
- `public.payment_events` e a trilha auditavel/idempotente obrigatoria para transicoes financeiras.
- `public.case_events.visible_to_client`, `public.documents.status`, `public.appointments.title` e colunas do `public.appointment_history` fazem parte do schema esperado pelo produto.

## Drift confirmado no banco remoto em 2026-04-24

- `payments`: faltam `external_reference`, `financial_state`, `technical_state`, `origin_type`, `active_for_lead`, `last_reconciled_at`, `commercial_effect_applied_at`.
- `payment_events`: tabela nao convergida no runtime remoto.
- `intake_requests`: faltam `preferred_contact_channel`, `lead_score`, `lead_temperature`, `lifecycle_stage`, `last_activity_at`.
- `case_events`: falta `visible_to_client`.
- `documents`: faltam `status`, `document_date`, `mime_type`, `file_size_bytes`.
- `appointments`: faltam `title`, `appointment_type`.
- `appointment_history`: faltam colunas novas do lifecycle (`case_id`, `client_id`, `change_type`, `title`, `appointment_type`, `status`, `visible_to_client`, `starts_at`).

## Compatibilidade transitória ainda ativa

- Dashboard interno continua com fallback explicito para `case_events`, `documents`, `appointments`, `appointment_history` e shape legado de `conversation_sessions`.
- `client-workspace` agora tambem tem fallback explicito para `case_events.visible_to_client`, `documents.status` e `appointments.title`.
- `revenue-intelligence` continua aceitando `payments.status` quando `financial_state` ainda nao convergiu.
- `conversation-persistence` e `triage-persistence` ainda toleram drift legado controlado por flag.

## Guardrails adicionados

- `npm run validate:schema` agora vigia tambem `case_events`, `documents`, `appointments` e `appointment_history`.
- O source of truth oficial nao exige mais `intake_requests.contact_channel`, porque essa coluna nao existe nas migrations canonicas.
- `api/payment/create` e `api/payment/webhook` fazem preflight de compatibilidade do schema e falham de forma diagnostica antes de produzir efeitos externos quando o trilho financeiro ainda nao convergiu.
- A migration `20260424183000_phase6_schema_convergence_hotfix.sql` e a rota segura para convergir ambientes historicos parcialmente aplicados.

## Proximo passo para zerar o drift relevante

1. Aplicar a migration `20260424183000_phase6_schema_convergence_hotfix.sql` no banco real.
2. Rodar `npm run validate:schema` contra o mesmo ambiente.
3. Revalidar `/internal/advogada`, `/cliente`, `POST /api/payment/create` e `POST /api/payment/webhook`.
4. So depois disso remover fallbacks de dashboard/cliente/pagamentos que hoje existem apenas para schema legado.
