# YouTube Omnichannel Activation

## Visao geral

O canal YouTube usa a mesma malha omnichannel do portal:

- taxonomia unica
- Inbox premium
- CRM comercial
- timeline da jornada
- dispatches auditaveis
- dashboard operacional

O rollout foi desenhado em tres fases:

1. `read_only`
2. `suggestion`
3. `active`

## Superficies tecnicas

- status e readiness: `GET /api/internal/youtube?action=status`
- inicio do OAuth: `GET /api/internal/youtube?action=oauthStart`
- callback OAuth: `/api/youtube/oauth/callback`
- ingestao interna:
  - `POST /api/internal/youtube` com `action=registerAsset`
  - `POST /api/internal/youtube` com `action=ingestComment`

## Variaveis de ambiente

### Obrigatorias para read_only

- `YOUTUBE_CHANNEL_ID`
- `YOUTUBE_MODE=read_only`
- `YOUTUBE_ENABLE_INGESTION=true`
- `YOUTUBE_ENABLE_COMMENT_SYNC=true`
- `YOUTUBE_ENABLE_COMMENT_READ_ONLY=true`
- uma credencial de leitura:
  - `YOUTUBE_API_KEY`
  - ou `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`

### Obrigatorias para suggestion

- tudo de `read_only`
- `YOUTUBE_MODE=suggestion`
- `YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE=true`
- `YOUTUBE_ENABLE_INBOX_ROUTING=true`
- `YOUTUBE_ENABLE_CRM_ROUTING=true`

### Obrigatorias para active

- tudo de `suggestion`
- `YOUTUBE_MODE=active`
- `YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY=true`
- `YOUTUBE_REPLY_ENABLED=true`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_OAUTH_STATE_SECRET` ou `INTERNAL_API_SECRET`

### Opcionais

- `YOUTUBE_WEBHOOK_CALLBACK_URL`
- `YOUTUBE_AUTO_REPLY_ENABLED`
- `YOUTUBE_ENABLE_HUMAN_REVIEW_DEFAULT`
- `YOUTUBE_COMMENT_COOLDOWN_MINUTES`
- `YOUTUBE_MAX_REPLIES_PER_AUTHOR_WINDOW`
- `YOUTUBE_MAX_REPLIES_PER_ASSET_WINDOW`
- aliases legados ainda aceitos:
  - `YOUTUBE_COMMENT_MAX_REPLIES_PER_WINDOW`
  - `YOUTUBE_COMMENT_AUTHOR_COOLDOWN_MINUTES`
  - `YOUTUBE_COMMENT_VIDEO_COOLDOWN_MINUTES`

### Nunca expor no client-side

- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_OAUTH_STATE_SECRET`
- `YOUTUBE_API_KEY` quando o projeto tratar essa chave como sensivel de provider

## Google Cloud e OAuth

### Passo 1: configurar projeto

1. Criar ou reutilizar o projeto no Google Cloud.
2. Ativar a YouTube Data API v3.
3. Configurar a tela de consentimento OAuth.
4. Criar credenciais do tipo Web Application.

### Passo 2: registrar redirect URI

Adicionar exatamente:

- local: `http://127.0.0.1:3000/api/youtube/oauth/callback`
- producao: `https://portal.advnoemia.com.br/api/youtube/oauth/callback`

### Passo 3: preencher envs

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_OAUTH_STATE_SECRET`

### Passo 4: iniciar autorizacao

Usar:

- `GET /api/internal/youtube?action=oauthStart`

A resposta inclui:

- `url`
- `state`
- `scopes`
- `readiness`

### Passo 5: concluir callback

O callback troca o `code` por token e mostra:

- se veio `refresh_token`
- scopes concedidos
- se o ambiente ja esta pronto para `active`

Se vier refresh token:

- registrar externamente no ambiente seguro em `YOUTUBE_REFRESH_TOKEN`

Se nao vier:

- refazer o fluxo com consentimento
- revisar se o app esta usando `access_type=offline`

## Modos operacionais

### Fase 1 - read_only

O que faz:

- registra video e Short
- registra comentario
- classifica comentario
- escreve timeline
- abre Inbox/CRM quando aplicavel
- alimenta dashboard
- nunca envia resposta externa

Sinais esperados:

- `YOUTUBE_ASSET_REGISTERED`
- `YOUTUBE_COMMENT_ROUTED`
- `youtube_comment_signal_captured`

Critério de entrada:

- readiness de `read_only` satisfeita

Critério de saida:

- comentarios chegam com taxonomia correta
- dashboard mostra o canal
- Inbox recebe oportunidades relevantes

Rollback:

- `YOUTUBE_ENABLE_COMMENT_SYNC=false`
- ou `YOUTUBE_ENABLE_INGESTION=false`

### Fase 2 - suggestion

O que faz:

- tudo do `read_only`
- gera draft de resposta
- aplica guardrails
- cria dispatch auditavel
- manda para revisao humana quando necessario

Sinais esperados:

- `youtube_comment_review_requested`
- `youtube_comment_reply_suggested`

Critério de entrada:

- operação já confia na classificação
- Inbox consegue revisar sugestões

Critério de saida:

- equipe consegue revisar e agir sobre comentários quentes
- não há ruído excessivo de duplicidade

Rollback:

- `YOUTUBE_MODE=read_only`
- `YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE=false`

### Fase 3 - active

O que faz:

- mantém a mesma classificação e guardrails
- libera dispatch de reply real quando o provider estiver pronto

Critério de entrada:

- readiness de `active` satisfeita
- refresh token valido
- cooldowns e limites revisados
- operação aprova o opt-in

Critério de saida:

- replies reais com logs claros
- sem duplicidade
- sem aumento anormal de revisão manual por falha

Rollback:

- `YOUTUBE_MODE=suggestion`
- `YOUTUBE_REPLY_ENABLED=false`
- `YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY=false`

## Guardrails e limites

- dedupe por `commentId`
- dedupe por `payload_hash`
- cooldown por autor
- cooldown por asset
- teto por janela
- revisão humana por padrão quando sensível
- bloqueio automático quando `active` não está pronto

## Leitura dos logs

Eventos principais:

- `YOUTUBE_ASSET_REGISTERED`
- `YOUTUBE_COMMENT_DUPLICATE_IGNORED`
- `YOUTUBE_COMMENT_ROUTED`
- `YOUTUBE_OAUTH_EXCHANGE_SUCCEEDED`
- `YOUTUBE_OAUTH_EXCHANGE_FAILED`

Eventos internos da thread:

- `youtube_comment_signal_captured`
- `youtube_comment_review_requested`
- `youtube_comment_reply_suggested`

## Checklists

### Checklist de deploy

1. Confirmar envs do modo alvo.
2. Rodar `npm run lint`.
3. Rodar `npm run typecheck`.
4. Rodar `npm run test`.
5. Rodar `npm run build`.
6. Rodar `npm run operations:verify`.
7. Confirmar `GET /api/internal/youtube?action=status`.

### Checklist de regressao

1. Validar Instagram inbound.
2. Validar Facebook/Messenger inbound.
3. Confirmar labels premium antigos.
4. Confirmar Inbox sem quebra de filtros.
5. Confirmar dashboard operacional carregando.

### Checklist pos-ativacao

1. Registrar um video.
2. Ingerir um comentario de video.
3. Ingerir um comentario de Short.
4. Confirmar thread `YouTube` no portal.
5. Confirmar dispatch em `automation_dispatches`.
6. Confirmar eventos em `conversation_events`.
7. Confirmar `product_events` e `social_acquisition`.

## Troubleshooting

- Se `status` apontar modo nao satisfeito:
  - revisar `modeReadiness.missing`
- Se `oauthStart` falhar:
  - revisar `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`
- Se o callback falhar no state:
  - revisar `YOUTUBE_OAUTH_STATE_SECRET` ou `INTERNAL_API_SECRET`
- Se `active` continuar bloqueado:
  - revisar `YOUTUBE_REFRESH_TOKEN`
- Se o canal nao aparecer no portal:
  - revisar `YOUTUBE_ENABLE_INBOX_ROUTING`
  - revisar `YOUTUBE_ENABLE_CRM_ROUTING`
- Se houver ruído:
  - revisar cooldowns e limites de janela
