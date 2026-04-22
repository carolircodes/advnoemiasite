# Operacao do Projeto Vercel do Portal

Este documento e a fonte de verdade para o projeto Vercel `advnoemiaportal`.

Para o mapa completo de superficies e ownership do monorepo, ver [`ARCHITECTURE_SURFACES.md`](ARCHITECTURE_SURFACES.md).

## Projeto correto

- Projeto Vercel: `advnoemiaportal`
- Dominio esperado: `portal.advnoemia.com.br`
- App correta: `apps/portal-backend`

## Configuracao manual esperada no dashboard

### Settings > General

- Production Branch: `main`
- Root Directory: `apps/portal-backend`

### Settings > Build and Deployment

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next`
- Ignored Build Step: vazio ou desabilitado

### Settings > Git

- Repositorio conectado: `carolircodes/advnoemiasite`
- Path filters do portal: incluir `apps/portal-backend/**`

### Domains

- `portal.advnoemia.com.br` deve apontar para `advnoemiaportal`

### Cron Jobs

- rota: `/api/cron/notifications`
- schedule compativel com Hobby: `0 12 * * *`

Regra operacional:

- no plano Hobby, nao usar cron subdiario
- se a operacao exigir multiplas execucoes ao dia, promover o projeto para Pro antes de alterar o cron

## Validacao do release do portal

Depois de cada deploy:

1. abrir `portal.advnoemia.com.br`
2. entrar no shell interno do portal
3. confirmar o selo `Release do portal <sha>`
4. comparar o SHA com o commit implantado no projeto `advnoemiaportal`

## Troubleshooting rapido

### O site deploya, mas o portal nao

Verificar nesta ordem:

1. se o commit apareceu no projeto `advnoemiaportal`
2. se `Root Directory` esta em `apps/portal-backend`
3. se existe `Ignored Build Step`
4. se os path filters incluem `apps/portal-backend/**`
5. se ha cron incompativel com o plano Hobby

### O portal falha antes do build

Verificar primeiro:

1. cron incompativel no dashboard
2. cron incompativel em `apps/portal-backend/vercel.json`
3. `Framework Preset` ou `Root Directory` incorretos

### O deploy passou, mas a interface parece antiga

1. abrir `portal.advnoemia.com.br`
2. conferir o selo `Release do portal`
3. se o SHA nao bater, o deploy validado foi o projeto errado
