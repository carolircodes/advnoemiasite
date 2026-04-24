# Data Foundation Canonical

## Objetivo

Este documento resume a camada transacional oficial do portal e da NoemIA depois do endurecimento de fundacao de dados. Ele existe para reduzir drift entre banco, backend e produto.

## Source of truth por dominio

| Dominio | Entidade / tabela | Source of truth | Observacao |
| --- | --- | --- | --- |
| Identidade interna | `profiles`, `staff_members` | `profiles.role` + `staff_members` | Controle de acesso e ownership interno. |
| Cliente canonico | `clients` | `clients` | Pessoa canonica do produto. Merge e identidade multicanal vivem aqui. |
| Canal do cliente | `client_channels` | `client_channels` | Vinculo canonico entre cliente e identidades externas por canal. |
| Funil comercial | `client_pipeline` | `client_pipeline` | Ownership, follow-up, conversao e fechamento por cliente canonico. |
| Conversa operacional | `conversation_sessions`, `conversation_messages`, `conversation_events`, `conversation_notes` | `conversation_sessions` + historicos adjacentes | Thread operacional da inbox e memoria auditavel de interacao. |
| Triage NoemIA | `noemia_triage_summaries` | `noemia_triage_summaries` | Projecao de triagem/IA usada para operacao e leitura comercial. |
| Captacao NoemIA | `noemia_leads`, `noemia_lead_conversations` | `noemia_leads` | Camada sensivel de lead antes da consolidacao em cliente canonico. |
| Aquisicao | `acquisition_events`, `product_events`, `intake_requests` | `acquisition_events` para atribuicao interna; `product_events` para telemetria do produto | Nao misturar tracking publico cru com camada sensivel de lead. |
| Pagamentos | `payments`, `payment_events` | `payments.financial_state` + `payments.technical_state`; `payment_events` para trilha | `payments.status` e compatibilidade externa, nao semantica canonica. |
| Follow-up assistido | `follow_up_messages`, `follow_up_responses` | `follow_up_messages` para dispatch; `client_pipeline.follow_up_*` para estado operacional | Mensagem enviada nao deve redefinir sozinha a semantica do pipeline. |
| Agenda comercial | `appointments`, `appointment_history` | `appointments` + `appointment_history` | `client_pipeline` guarda projection de fechamento, nao substitui agenda. |
| Documentos e casos | `cases`, `documents`, `document_requests`, `case_events` | tabelas do dominio juridico | Mantidas separadas da camada comercial/NoemIA. |

## Entidades centrais e ambiguidades

### `clients`
- Representa a pessoa canonica do produto.
- Nao deve ser usado como substituto de `noemia_leads`.
- Merge canonico deve apontar para `merged_into_client_id`.

### `client_pipeline`
- Representa o trilho comercial por cliente canonico.
- `stage` e um resumo do funil.
- `consultation_readiness`, `conversion_stage`, `consultation_offer_state`, `scheduling_state`, `payment_state` e `closing_state` sao projections especializadas.
- `follow_up_status` e a linguagem canonica compartilhada com a inbox: `none | pending | due | overdue | resolved | converted`.
- `follow_up_state` pode guardar granularidade adicional sem contradizer `follow_up_status`.

### `conversation_sessions`
- Representa a thread operacional por canal e identidade externa.
- `thread_status` controla a fila.
- `waiting_for` controla a expectativa operacional.
- `client_id` e `client_channel_id` ligam a thread ao cliente canonico.

### `noemia_leads`
- Representa lead sensivel da camada NoemIA.
- `status` e legado amplo; nao expandir.
- `lead_status` deve carregar semantica de funil do lead.
- `operational_status` deve carregar semantica de fila/tratamento.
- `payment_status` e apenas resumo observado; o source of truth financeiro esta em `payments`.

### `payments`
- Cada linha representa uma tentativa de checkout/cobranca.
- `financial_state` e a narrativa financeira canonica.
- `technical_state` e a narrativa tecnica canonica.
- `active_for_lead` indica qual tentativa ainda dirige o produto.
- `payment_events` preserva idempotencia e historico de transicao.

## Estados canonicos importantes

### Follow-up
- `follow_up_status`: `none | pending | due | overdue | resolved | converted`
- `resolved`: follow-up encerrado sem conversao final.
- `converted`: follow-up culminou em consulta/avanco material do funil.

### Pagamento
- `payments.financial_state`: `pending | approved | failed | expired | cancelled | refunded | charged_back`
- `payments.technical_state`: `checkout_created | webhook_received | webhook_validated | reconciled | webhook_ignored | superseded`
- `client_pipeline.payment_state`: projection comercial de fechamento, nunca substitui `payments.financial_state`.

### Conversa / inbox
- `thread_status`: `new | unread | waiting_human | waiting_client | ai_active | handoff | closed | archived`
- `handoff_state`: `none | requested | active | resolved`

## Governanca de acesso

- `request_rate_limits`, `idempotency_keys`, `processed_webhook_events` e `keyword_automation_events` devem ser backend-only.
- `noemia_leads`, `noemia_lead_conversations`, `acquisition_events`, `payments` e `payment_events` sao superfícies sensiveis; acesso direto do cliente autenticado comum nao deve ser requisito de produto.
- Para superfícies internas, privilegiar backend/server-side com `service_role` e manter o cliente autenticado restrito ao minimo necessario.

## Estrategia de evolucao

- Nao expandir `status` legados quando ja existir coluna especializada.
- Novas projections comerciais devem nascer em `client_pipeline`, nunca espalhadas em `clients` ou `noemia_leads`.
- Novos efeitos de pagamento devem registrar transicao em `payment_events`.
- Sempre preferir historico append-only (`*_events`, `*_history`, mensagens/notas) antes de sobrescrever narrativa operacional.
