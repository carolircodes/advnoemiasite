# AdvNoemia Monorepo

Entrypoint oficial do portal operacional: `apps/portal-backend`.

Superfícies reais deste repositório:

- `apps/portal-backend`: portal interno e aplicação Next.js do subdomínio `portal.advnoemia.com.br`
- raiz do repositório: site institucional estático e arquivos legados do domínio principal `advnoemia.com.br`

Comandos oficiais na raiz:

- `npm run dev`
- `npm run build`
- `npm run start`

Esses scripts delegam explicitamente para o workspace `portal-backend` para reduzir ambiguidade de build e deploy.

Regras operacionais:

- deploy do portal: projeto Vercel `advnoemiaportal`, com Root Directory `apps/portal-backend`
- deploy do site principal: projeto Vercel `advnoemiasite`, apontado para a raiz estática do repositório
- commits de frontend do portal devem ser validados em `portal.advnoemia.com.br`, nunca apenas em `advnoemia.com.br`

Guia de mapeamento e validação de deploy: [`docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md`](docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md).
