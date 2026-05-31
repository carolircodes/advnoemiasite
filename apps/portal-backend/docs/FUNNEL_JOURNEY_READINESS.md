# Funnel Journey Readiness

## Mapa Do Funil

Entradas:
- site, home, areas juridicas, artigos e CTAs;
- pagina de triagem e chat NoemIA;
- Instagram/Facebook/Messenger, WhatsApp e Telegram;
- links de campanha, CTA de consulta, CTA de pagamento e portal do cliente.

Camadas internas:
- NoemIA e guardrails;
- lead, conversa, mensagem e eventos;
- inbox operacional e CRM;
- consulta/agendamento;
- pagamento e webhook;
- portal do cliente;
- notificacoes e tracking.

Saidas:
- resposta automatica segura ou handoff;
- `manual_followup_required`;
- item no inbox;
- consulta oferecida/agendada;
- pagamento pendente/aprovado;
- portal atualizado;
- notificacao enfileirada, bloqueada ou marcada para checagem manual.

## Estados Canonicos

Lead:
`new`, `triaged`, `qualified`, `needs_human_review`, `awaiting_contact`, `consultation_offered`, `consultation_scheduled`, `payment_pending`, `converted`, `lost`, `archived`.

Conversa:
`open`, `ai_assisted`, `manual_followup_required`, `waiting_human`, `waiting_client`, `resolved`, `escalated`, `closed`.

Consulta:
`not_offered`, `offered`, `accepted`, `scheduled`, `rescheduled`, `canceled`, `completed`, `no_show`.

Pagamento:
`not_created`, `pending`, `approved`, `rejected`, `canceled`, `refunded`, `failed`, `expired`.

Portal:
`not_created`, `invite_pending`, `ready`, `active`, `needs_manual_setup`.

Notificacao:
`not_needed`, `queued`, `provider_missing`, `manual_check_required`, `sent`, `failed`.

## Validacao Local Sem Provider Real

Use `tests/phase5-funnel-journey.test.ts` para simular:
- site com beneficio negado no INSS;
- comentario Instagram com `negativacao`;
- WhatsApp com desconto indevido;
- familia/pensao/guarda;
- consulta com pagamento mockado aprovado;
- provider ausente.

Esses testes nao enviam mensagem, nao cobram pagamento e nao chamam APIs externas.

## Checklist Antes Do Piloto

- `npm test` sem falhas;
- `operations:verify` exibindo `funnelReadiness`;
- Meta/WhatsApp com assinatura enforced antes de evento real;
- Mercado Pago configurado e webhook validado antes de pagamento real;
- notificacoes com provider real ou fallback manual claro;
- banco/RLS/storage validados manualmente no ambiente alvo;
- primeiro piloto com poucos leads e revisao humana.

