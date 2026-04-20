# Facebook Messenger Operations

Use este guia quando o canal `Facebook Messenger` estiver em rollout, incident response, validacao pos-deploy ou operacao recorrente.

## Escopo do canal

- Webhook unico: `/api/meta/webhook`
- `object=page`: Facebook Messenger e comentarios da pagina
- `object=instagram`: Instagram Direct e comentarios do Instagram
- Projeto Vercel do portal: `advnoemiaportal`
- Dominio esperado do portal: `portal.advnoemia.com.br`

## Variaveis de ambiente criticas

- `META_VERIFY_TOKEN`
  Usado apenas no `GET` de verificacao inicial do webhook.
- `FACEBOOK_APP_SECRET`
  Secret explicito para assinar e validar eventos `object=page`.
- `META_APP_SECRET`
  Secret compartilhado/retrocompativel do app Meta.
- `INSTAGRAM_APP_SECRET`
  Compatibilidade legada para o fluxo do Instagram.
- `FACEBOOK_PAGE_ACCESS_TOKEN`
  Token de envio outbound do Facebook Messenger.
- `FACEBOOK_PAGE_ID`
  Identificador da pagina usado nas chamadas Graph.

## Ordem real de validacao da assinatura

### `object=page`

1. `FACEBOOK_APP_SECRET`
2. `META_APP_SECRET`
3. `INSTAGRAM_APP_SECRET`
4. `META_INSTAGRAM_APP_SECRET`

### `object=instagram`

1. `INSTAGRAM_APP_SECRET`
2. `META_APP_SECRET`
3. `META_INSTAGRAM_APP_SECRET`
4. `FACEBOOK_APP_SECRET`

### fallback generico

1. `META_APP_SECRET`
2. `INSTAGRAM_APP_SECRET`
3. `FACEBOOK_APP_SECRET`
4. `META_INSTAGRAM_APP_SECRET`

## O que deve aparecer nos logs quando estiver saudavel

- `META_SIGNATURE_VALIDATED`
- `objectHint: "page"`
- `attemptedSources` contendo `FACEBOOK_APP_SECRET`
- `matchedSecretSource: "FACEBOOK_APP_SECRET"` quando o segredo explicito for o correto
- `META_WEBHOOK_INBOUND_ACCEPTED`
- `CHANNEL_ROUTER_START`
- `TRIAGE_REPORT_SAVED`
- `PANEL_STATE_UPDATED`
- `CHANNEL_ROUTER_COMPLETED`
- `META_SEND_SUCCESS` para o outbound

## Como ler duplicate events sem confundir com incidente

### sinais saudaveis

- `EVENT_IGNORED_DUPLICATE`
  O `externalEventId` ja foi marcado como processado.
- `EVENT_IGNORED_DUPLICATE_MESSAGE`
  O Meta reenviou o mesmo `externalMessageId` e o hash de payload confirma retry do mesmo evento.

### o que isso protege

- evita resposta duplicada da Noemia
- evita triagem duplicada no mesmo retry
- evita `PANEL_STATE_UPDATED` redundante
- evita trilha duplicada no Inbox e na timeline

## Checklist de teste inbound

1. Enviar uma mensagem real para a pagina no Messenger.
2. Confirmar `META_SIGNATURE_VALIDATED` com `objectHint: "page"`.
3. Confirmar `META_WEBHOOK_INBOUND_ACCEPTED`.
4. Confirmar `CHANNEL_ROUTER_COMPLETED` com `replySent: true`.
5. Confirmar que a thread aparece no Inbox com label `Facebook Messenger`.
6. Confirmar que a timeline do cliente mostra `Facebook Messenger` ou `Comentario do Facebook convertido em Messenger`, conforme a origem.

## Checklist de teste outbound

1. Responder a thread pelo Inbox interno.
2. Confirmar `META_SEND_SUCCESS`.
3. Confirmar que a mensagem humana entra como `sendStatus: sent`.
4. Confirmar que o preview da thread foi atualizado sem duplicidade.

## Checklist pos-deploy

1. Confirmar que o projeto aberto na Vercel e `advnoemiaportal`.
2. Confirmar que os logs mostram `signatureResolutionVersion`.
3. Confirmar que `attemptedSources` inclui `FACEBOOK_APP_SECRET` para `object=page`.
4. Confirmar um evento real de `object=instagram` sem regressao.
5. Confirmar um evento real de `object=page` com resposta enviada.
6. Confirmar que o Inbox mostra `Facebook Messenger` e nao tokens crus como `facebook_dm`.

## Troubleshooting rapido

### assinatura falhando

- `signature_header_missing`
  O header `X-Hub-Signature-256` nao chegou.
- `signature_header_malformed`
  O formato do header veio invalido.
- `app_secret_missing`
  Nenhum secret candidato estava disponivel no ambiente.
- `signature_mismatch`
  O raw body foi lido, mas o HMAC nao bateu com nenhum candidato.

### deploy aparentemente antigo

Se os logs nao mostrarem `signatureResolutionVersion` ou `FACEBOOK_APP_SECRET` em `attemptedSources`, o portal provavelmente ainda esta num deploy antigo.

### outbound falhando

- validar `FACEBOOK_PAGE_ACCESS_TOKEN`
- validar `FACEBOOK_PAGE_ID`
- revisar `META_SEND_FAILURE` ou erro do Graph

## Regressao Instagram vs Messenger

Depois de qualquer ajuste no canal `page`:

1. validar `object=instagram` com `META_SIGNATURE_VALIDATED`
2. validar que `matchedSecretSource` continua aceitavel para Instagram
3. validar resposta real no Direct do Instagram
4. validar que o Inbox continua nomeando Instagram como `Instagram Direct`
