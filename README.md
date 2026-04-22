# AdvNoemia Monorepo

Entrypoint oficial do portal operacional: `apps/portal-backend`.

Superficies reais deste repositorio:

- `apps/portal-backend`: portal interno e aplicacao Next.js do subdominio `portal.advnoemia.com.br`
- raiz do repositorio: site institucional estatico e arquivos legados do dominio principal `advnoemia.com.br`
- `app/` na raiz: compatibilidade historica apenas; nao e runtime canonico nem lugar para novas APIs

Comandos oficiais na raiz:

- `npm run dev`
- `npm run build`
- `npm run start`

Esses scripts delegam explicitamente para o workspace `portal-backend` para reduzir ambiguidade de build e deploy.

Regras operacionais:

- deploy do portal: projeto Vercel `advnoemiaportal`, com Root Directory `apps/portal-backend`
- deploy do site principal: projeto Vercel `advnoemiasite`, apontado para a raiz estatica do repositorio
- commits de frontend do portal devem ser validados em `portal.advnoemia.com.br`, nunca apenas em `advnoemia.com.br`

Guia de mapeamento e validacao de deploy: [`docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md`](docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md).
Source of truth arquitetural: [`docs/ARCHITECTURE_SURFACES.md`](docs/ARCHITECTURE_SURFACES.md).
