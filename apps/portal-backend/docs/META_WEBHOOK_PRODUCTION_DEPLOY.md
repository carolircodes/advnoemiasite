# Meta Webhook Production Deploy

Use este guia quando o webhook Meta em `portal.advnoemia.com.br` aparentar rodar uma logica antiga ou quando Messenger e Instagram divergirem em producao.

## Projeto correto

- Portal real: `apps/portal-backend`
- Dominio do portal: `portal.advnoemia.com.br`
- Projeto Vercel do portal: `advnoemiaportal`
- Projeto Vercel do site/apex: `advnoemiasite`

O projeto `advnoemiasite` serve o site/apex e nao deve ser usado como prova do webhook do portal.

## Evidencia confirmada em 2026-04-20

- `portal.advnoemia.com.br` aponta para o projeto `advnoemiaportal`
- ultimo deploy production observado no portal: commit `4539db4`
- HEAD local atual do repositorio durante esta auditoria: `1084a99`

Se os logs de producao ainda mostrarem apenas `attemptedSources: ["META_APP_SECRET","INSTAGRAM_APP_SECRET"]`, o portal provavelmente ainda esta servindo o deploy anterior ao suporte explicito de `FACEBOOK_APP_SECRET`.

## O que o codigo novo precisa mostrar

No webhook `POST /api/meta/webhook`, os logs novos incluem:

- `signatureResolutionVersion`
- `deploymentCommitSha`
- `deploymentId`
- `objectHint`
- `attemptedSources`
- `matchedSecretSource`
- `facebookAppSecretConfigured`

Esses campos existem para diferenciar deploy antigo de deploy novo sem expor segredos.

## Prova de deploy correto no Vercel

No dashboard da Vercel:

1. Abrir o projeto `advnoemiaportal`
2. Conferir `Production Deployment`
3. Verificar o commit SHA do deploy
4. Confirmar que o build mostra rotas do portal, incluindo `/api/meta/webhook`
5. Abrir os runtime logs do portal e procurar `signatureResolutionVersion`

Sinais de deploy correto:

- o commit exibido no deploy bate com o commit esperado no GitHub
- os logs do webhook mostram `signatureResolutionVersion=meta-webhook-2026-04-20-facebook-secret-priority`
- os logs mostram `deploymentCommitSha` coerente com o deploy
- eventos `object=page` mostram `attemptedSources` com `FACEBOOK_APP_SECRET`

Sinais de deploy errado ou antigo:

- o projeto aberto e `advnoemiasite` em vez de `advnoemiaportal`
- o commit do deploy e anterior ao commit com a correcao
- os logs nao possuem `signatureResolutionVersion`
- `attemptedSources` ainda nao inclui `FACEBOOK_APP_SECRET` para `object=page`

## Ordem esperada por objeto

- `object=page`: `FACEBOOK_APP_SECRET`, `META_APP_SECRET`, `INSTAGRAM_APP_SECRET`, `META_INSTAGRAM_APP_SECRET`
- `object=instagram`: `INSTAGRAM_APP_SECRET`, `META_APP_SECRET`, `META_INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`
- objeto nao identificado: `META_APP_SECRET`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`, `META_INSTAGRAM_APP_SECRET`

## Como diferenciar codigo vs configuracao externa

E problema de deploy/codigo quando:

- o portal ainda nao esta no commit novo
- os logs nao mostram `signatureResolutionVersion`
- `attemptedSources` nao reflete a nova ordem

E problema de configuracao externa da Meta quando:

- o portal ja esta no commit novo
- os logs mostram `signatureResolutionVersion`
- `objectHint` e `page`
- `attemptedSources` inclui `FACEBOOK_APP_SECRET`
- `facebookAppSecretConfigured` esta `true`
- mesmo assim a falha continua em `signature_mismatch`

Nessa situacao, o proximo passo e conferir no Meta Developers qual App Secret realmente assina os eventos do Messenger/Facebook e comparar com `FACEBOOK_APP_SECRET` do projeto `advnoemiaportal`.
