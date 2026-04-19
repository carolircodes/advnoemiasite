# Configuração de Deploy do Portal

## Arquitetura correta

- `advnoemia.com.br` e `www.advnoemia.com.br`: site institucional publicado pelo projeto Vercel `advnoemiasite`
- `portal.advnoemia.com.br`: portal operacional publicado pelo projeto Vercel `advnoemiaportal`

## Mapeamento correto do repositório

- site principal: raiz do repositório
- portal: `apps/portal-backend`

## Configuração correta na Vercel

### Projeto `advnoemiaportal`

- Root Directory: `apps/portal-backend`
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Production Branch: `main`

### Projeto `advnoemiasite`

- Root Directory: `.`
- Deve continuar responsável apenas pelo site principal e pelos ativos da raiz

## Checklist de correção no dashboard da Vercel

No projeto `advnoemiaportal`, revisar:

1. `Settings > General`
   - confirmar `Root Directory = apps/portal-backend`
   - confirmar `Production Branch = main`
2. `Settings > Build and Deployment`
   - confirmar `Framework Preset = Next.js`
   - confirmar `Build Command = npm run build`
   - confirmar `Output Directory = .next`
   - remover qualquer `Ignored Build Step` que ignore commits do portal
3. `Settings > Git`
   - confirmar que o projeto continua conectado ao repositório `carolircodes/advnoemiasite`
   - revisar filtros de monorepo/path filters para incluir `apps/portal-backend/**`
4. `Domains`
   - confirmar `portal.advnoemia.com.br` ligado ao projeto `advnoemiaportal`

## Validação visual do deploy

O portal passou a exibir no topo um selo discreto `Release do portal <sha>`.

Esse valor usa:

- `NEXT_PUBLIC_PORTAL_RELEASE_LABEL`, se definido manualmente
- ou o `VERCEL_GIT_COMMIT_SHA` truncado no build

Após o deploy:

1. abrir `portal.advnoemia.com.br`
2. localizar o selo `Release do portal`
3. confirmar que o SHA exibido corresponde ao commit implantado

## Fonte de verdade

Para operação diária, usar:

- [`docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md`](../DEPLOY_SURFACES_AND_VERCEL_MAPPING.md)
