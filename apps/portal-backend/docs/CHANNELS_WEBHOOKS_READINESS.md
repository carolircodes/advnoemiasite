# Channels And Webhooks Readiness

Fase 3 endurece os canais core para piloto controlado sem acionar providers reais. Nenhum item abaixo substitui a validacao manual nos dashboards de Meta, WhatsApp, Telegram, Mercado Pago e Vercel.

## Rotas Core

| Rota | Canal | Tipo | Guarda obrigatoria |
| --- | --- | --- | --- |
| `/api/meta/webhook` | Instagram, Facebook, Messenger | webhook publico/provider callback | GET por `META_VERIFY_TOKEN`; POST por `X-Hub-Signature-256` e `META_WEBHOOK_ENFORCE_SIGNATURE=true` em producao |
| `/api/whatsapp/webhook` | WhatsApp Cloud API | webhook publico/provider callback | GET por `WHATSAPP_VERIFY_TOKEN`; POST por `X-Hub-Signature-256` e `WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE=true` em producao |
| `/api/telegram/webhook` | Telegram | webhook publico/provider callback | `x-telegram-bot-api-secret-token` ou `x-telegram-webhook-secret`; fallback sem secret apenas em localhost/dev |
| `/api/payment/webhook` | Mercado Pago | webhook publico/provider callback | `x-signature`, `x-request-id`, `MERCADO_PAGO_WEBHOOK_SECRET` e `MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE=true` |
| `/api/cron/notifications` | Notificacoes | cron | `CRON_SECRET`; fallback sem secret apenas em localhost/dev |
| `/api/worker/notifications/process` | Notificacoes | worker interno | `NOTIFICATIONS_WORKER_SECRET` ou acesso staff/rota protegido |
| `/api/internal/readiness` | Operacao | health/readiness interno | `INTERNAL_API_SECRET` ou sessao staff |

## Variaveis Por Canal

Meta/Instagram/Facebook:
- `META_VERIFY_TOKEN`
- `META_APP_SECRET` ou `INSTAGRAM_APP_SECRET` ou `FACEBOOK_APP_SECRET`
- `META_WEBHOOK_ENFORCE_SIGNATURE=true`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN` ou `INSTAGRAM_PAGE_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ID` para envio via endpoint `/{page-id}/messages`
- `INSTAGRAM_ENABLE_PUBLIC_COMMENT_REPLY=true` somente quando resposta publica estiver aprovada
- `INSTAGRAM_ENABLE_COMMENT_AUTO_DM=true` somente depois de validar permissoes Meta para continuidade privada

WhatsApp:
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET` ou `META_APP_SECRET`
- `WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE=true`
- `WHATSAPP_ACCESS_TOKEN` ou `META_WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID` ou `META_WHATSAPP_PHONE_NUMBER_ID`

Telegram:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

Mercado Pago:
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE=true`

Notificacoes:
- `CRON_SECRET`
- `NOTIFICATIONS_WORKER_SECRET`
- `NOTIFICATIONS_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY` quando provider for `resend`
- `NOTIFICATIONS_SMTP_HOST` e `NOTIFICATIONS_SMTP_PORT` quando provider for SMTP

## Testes Sem Mensagem Real

Use somente payloads locais/fakes:
- `npm test` valida helpers de assinatura Meta, WhatsApp e Mercado Pago.
- `npm test --workspace portal-backend` inclui simulacao local de comentario Instagram com `negativacao`, `Negativacao!`, `quero saber sobre negativacao`, `nome sujo` e `banco negativou meu nome`.
- `npm run operations:verify:json --workspace portal-backend` mostra `channelReadiness.details.channels`.
- Para Meta/WhatsApp, gerar HMAC local com o app secret fake e corpo JSON fake.
- Para Mercado Pago, gerar assinatura local sobre `id:{dataId};request-id:{requestId};ts:{timestamp};`.
- Para Telegram, enviar somente payload local com secret fake em ambiente dev/local.

Nao use payloads com dados reais de cliente. Nao use access tokens reais em testes locais.

## Instagram Palavra-Chave Negativacao

Fluxo esperado:
1. Comentario chega em `/api/meta/webhook` com `object=instagram`, `entry[].changes[].field=comments`.
2. O parser extrai `comment_id`, `from.id`, `from.username`, `text/message` e `media.id` ou `post_id`.
3. O matcher normaliza lowercase, trim, acentos e pontuacao irrelevante.
4. O matcher reconhece `negativacao`, `negativacao indevida`, `nome sujo`, `serasa`, `spc`, `banco negativou` e `negativou meu nome`.
5. O router cria contexto de lead/conversa, registra evento operacional e prepara resposta segura.
6. Se outbound real nao estiver configurado, o caso deve ficar como `manual_followup_required`/`outbound_blocked_missing_config`, com sugestao de resposta manual no inbox/CRM.

Comentario publico, private reply e DM:
- Comentario publico usa `/{comment-id}/comments` e aparece na thread publica.
- Private reply/DM usa `/{page-id}/messages` e depende de permissao Meta, janela e elegibilidade do usuario/comentario.
- O projeto nao deve assumir que todo comentario permite DM automatica; quando `INSTAGRAM_ENABLE_COMMENT_AUTO_DM` estiver desligado ou a permissao faltar, registrar follow-up manual em vez de falhar em silencio.

Checklist de producao para a palavra-chave:
- Confirmar no painel Meta que o app esta inscrito em comentarios do Instagram conectado.
- Confirmar que o webhook usa a URL publica correta `/api/meta/webhook`.
- Confirmar assinatura `X-Hub-Signature-256` com `META_WEBHOOK_ENFORCE_SIGNATURE=true`.
- Confirmar access token e page id sem expor valores em logs.
- Testar primeiro com payload fake local e depois com comentario controlado em post de teste.
- Manter auto-DM desligado ate validar permissao de mensagens, politica da Meta e revisao juridica do texto.

## Piloto Vs Producao

Piloto controlado exige:
- Assinaturas/secret habilitados e testados localmente.
- Provider configurado no dashboard com URL de ambiente correto.
- Automacao de resposta limitada e com handoff humano.
- Logs sem raw payload, token, cookie, telefone completo, e-mail completo ou mensagem completa.
- Evidencia manual de rejeicao quando assinatura/secret esta ausente ou invalido.

Producao exige, alem do piloto:
- Evidencia de webhook real controlado por canal.
- Deduplicacao duravel validada no banco alvo.
- Observabilidade e alertas de assinatura invalida, payload invalido, provider indisponivel e erro interno.
- Revisao juridica/compliance dos fluxos automaticos antes de ampliar respostas.

## O Que Fica Desligado

YouTube e TikTok ficam como futuro/not ready nesta fase. Nao ativar automacao, comentarios, DMs, publicacao ou coleta ativa desses canais ate a fase propria de integracoes.

## Riscos Residuais

- A prova de assinatura real depende dos dashboards dos providers.
- A deduplicacao duravel depende das migrations aplicadas e validadas no Supabase alvo.
- Outbound real deve permanecer limitado a piloto enquanto Fase 4 nao fechar NoemIA, compliance juridico, tom comercial e revisao humana.
