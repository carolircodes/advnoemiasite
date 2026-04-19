# Operação do Projeto Vercel do Portal

Este documento é a fonte de verdade para o projeto Vercel `advnoemiaportal`.

## Projeto correto

- Projeto Vercel: `advnoemiaportal`
- Domínio esperado: `portal.advnoemia.com.br`
- App correta: `apps/portal-backend`

## Configuração manual esperada no dashboard

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

- Repositório conectado: `carolircodes/advnoemiasite`
- Path filters do portal: incluir `apps/portal-backend/**`

### Domains

- `portal.advnoemia.com.br` deve apontar para `advnoemiaportal`

### Cron Jobs

- rota: `/api/cron/notifications`
- schedule compatível com Hobby: `0 12 * * *`

Regra operacional:

- no plano Hobby, não usar cron subdiário
- se a operação exigir múltiplas execuções ao dia, promover o projeto para Pro antes de alterar o cron

## Validação do release do portal

Depois de cada deploy:

1. abrir `portal.advnoemia.com.br`
2. entrar no shell interno do portal
3. confirmar o selo `Release do portal <sha>`
4. comparar o SHA com o commit implantado no projeto `advnoemiaportal`

## Troubleshooting rápido

### O site deploya, mas o portal não

Verificar nesta ordem:

1. se o commit apareceu no projeto `advnoemiaportal`
2. se `Root Directory` está em `apps/portal-backend`
3. se existe `Ignored Build Step`
4. se os path filters incluem `apps/portal-backend/**`
5. se há cron incompatível com o plano Hobby

### O portal falha antes do build

Verificar primeiro:

1. cron incompatível no dashboard
2. cron incompatível em `apps/portal-backend/vercel.json`
3. `Framework Preset` ou `Root Directory` incorretos

### O deploy passou, mas a interface parece antiga

1. abrir `portal.advnoemia.com.br`
2. conferir o selo `Release do portal`
3. se o SHA não bater, o deploy validado foi o projeto errado
