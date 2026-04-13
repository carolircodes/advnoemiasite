# Schema Governance

## Fonte oficial de verdade

- A trilha oficial de banco do portal e da NoemIA e `supabase/migrations`.
- A versao operacional consolidada da Fase 6.5 e `phase-6.5-2026-04-13`.
- Arquivos `SCHEMA_*` manuais e trilhas paralelas antigas deixam de ser referencia operacional.

## Tabelas criticas

- `conversation_sessions`
- `processed_webhook_events`
- `noemia_triage_summaries`
- `follow_up_messages`
- `product_events`

## Regras

- Qualquer coluna nova precisa entrar primeiro em `supabase/migrations`.
- O codigo nao deve depender de fallback silencioso para drift estrutural.
- Compatibilidade degradada so pode ser mantida quando `NOEMIA_ALLOW_LEGACY_SCHEMA_FALLBACK=true`.
- A verificacao automatizada local e executada por `npm run validate:schema`.

## Politica operacional

- Em producao, a compatibilidade de schema e tratada como requisito de operacao.
- Se colunas criticas estiverem ausentes, webhooks e fluxos operacionais devem falhar de forma explicita em vez de mascarar drift.
