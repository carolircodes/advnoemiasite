# Legacy `app/` Root

Este diretorio nao e a aplicacao Next.js canonica do projeto.

## O que ele e

- sentinelas de compatibilidade historica da raiz
- lembrete explicito de que o runtime vivo mora em `apps/portal-backend`

## O que ele nao e

- nao e source of truth de rotas
- nao e lugar para criar novos webhooks
- nao e lugar para criar novas APIs do portal

## Regra

Se a mudanca afeta portal, backend, integracoes, pagamentos, NoemIA ou operacao, use:

- `apps/portal-backend/app`
- `apps/portal-backend/lib`
- `apps/portal-backend/components`

Os arquivos em `app/api` na raiz devem permanecer apenas como compatibilidade legado ou ser removidos quando deixarem de ser necessarios.
