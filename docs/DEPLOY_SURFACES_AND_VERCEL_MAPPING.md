# Mapeamento de Superficies e Deploy Vercel

## Superficies oficiais

- Site principal: raiz do repositorio (`index.html`, paginas estaticas e assets)
- Portal operacional: `apps/portal-backend` (Next.js)

## Superficies legadas que nao sao source of truth

- `app/api` na raiz existe apenas como legado e compatibilidade historica
- webhooks e APIs canonicas vivem em `apps/portal-backend/app/api`
- `docs/debug/*` e relatorios antigos ajudam investigacao, mas nao definem deploy nem runtime atual

## Projetos Vercel oficiais

- Projeto `advnoemiasite`
  - dominio principal: `advnoemia.com.br`
  - dominios adicionais: `www.advnoemia.com.br`, `api.advnoemia.com.br`
  - funcao esperada: publicar o site institucional da raiz do repositorio

- Projeto `advnoemiaportal`
  - dominio principal: `portal.advnoemia.com.br`
  - funcao esperada: publicar o Next.js de `apps/portal-backend`

## Diagnostico confirmado em 2026-04-19

Os commits recentes do frontend do portal foram implantados no projeto errado.

Evidencia observada na Vercel:

- `advnoemiasite` recebeu os deploys de:
  - `2a3e897` em `2026-04-18 19:50`
  - `8ba6595` em `2026-04-19 01:30`
  - `afa65b9` em `2026-04-19 12:27`
- `advnoemiaportal` parou em:
  - `2a3e897` em `2026-04-18 19:50`

Conclusao: o portal nao esta deixando de refletir mudancas por erro de frontend ou de build local. O problema esta no vinculo de deploy do projeto `advnoemiaportal`, que deixou de acompanhar os commits mais recentes enquanto o projeto `advnoemiasite` continuou publicando tudo.

## Configuracao correta esperada na Vercel

### Projeto `advnoemiaportal`

- Root Directory: `apps/portal-backend`
- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next`
- Production Branch: `main`
- Ignored Build Step: vazio ou desabilitado
- Monorepo path filters: precisam incluir `apps/portal-backend/**`
- Cron compativel com Hobby: no maximo 1x por dia

### Projeto `advnoemiasite`

- Root Directory: `.`
- Framework Preset: `Other` ou a configuracao estatica atualmente usada pelo projeto
- `app/api` da raiz nao deve receber novas features
- Ele nao deve ser a fonte de validacao do frontend do portal

## Prova visual do deploy do portal

O shell interno do portal agora exibe um selo discreto `Release do portal <sha>` no topo da interface.

Origem do valor:

- `NEXT_PUBLIC_PORTAL_RELEASE_LABEL`, se definido manualmente
- senao `VERCEL_GIT_COMMIT_SHA` truncado para 7 caracteres durante o build
- fallback local: `local`

Validacao operacional:

1. fazer deploy do projeto `advnoemiaportal`
2. abrir `portal.advnoemia.com.br`
3. confirmar no topo do portal o selo `Release do portal`
4. verificar se o SHA exibido bate com o commit publicado

## Politica de cron do portal

O cron do portal fica em `apps/portal-backend/vercel.json` e agora esta em frequencia diaria compativel com o plano Hobby.

- schedule atual: `0 12 * * *`
- rota acionada: `/api/cron/notifications`
- protecao esperada: `Authorization: Bearer <CRON_SECRET>`

Se a operacao voltar a exigir processamento subdiario, a acao correta nao e recolocar `*/5 * * * *` no repositorio. A acao correta e promover o projeto `advnoemiaportal` para Pro e so entao aumentar a cadencia.

## Como evitar novos desvios

1. validar qualquer ajuste de frontend do portal em `apps/portal-backend`
2. confirmar que o preview ou production deploy saiu em `advnoemiaportal`
3. nao usar `advnoemia.com.br` como prova de deploy do portal
4. sempre comparar commit SHA do deploy com o selo interno do portal
