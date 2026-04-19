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
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next`
- Production Branch: `main`
- Cron versionado: `0 12 * * *` em `/api/cron/notifications`

### Projeto `advnoemiasite`

- Root Directory: `.`
- deve continuar responsável apenas pelo site principal e pelos ativos da raiz

## Checklist de correção no dashboard da Vercel

No projeto `advnoemiaportal`, revisar:

1. `Settings > General`
   - confirmar `Root Directory = apps/portal-backend`
   - confirmar `Production Branch = main`
2. `Settings > Build and Deployment`
   - confirmar `Framework Preset = Next.js`
   - confirmar `Install Command = npm install`
   - confirmar `Build Command = npm run build`
   - confirmar `Output Directory = .next`
   - remover qualquer `Ignored Build Step` que ignore commits do portal
3. `Settings > Git`
   - confirmar que o projeto continua conectado ao repositório `carolircodes/advnoemiasite`
   - revisar path filters para incluir `apps/portal-backend/**`
4. `Domains`
   - confirmar `portal.advnoemia.com.br` ligado ao projeto `advnoemiaportal`
5. `Settings > Cron Jobs`
   - confirmar que o cron ativo respeita a política Hobby de 1 execução por dia
   - se existir schedule subdiário antigo no dashboard, alinhar para `0 12 * * *`

## Validação visual do deploy

O portal exibe no topo um selo discreto `Release do portal <sha>`.

Após o deploy:

1. abrir `portal.advnoemia.com.br`
2. localizar o selo `Release do portal`
3. confirmar que o SHA exibido corresponde ao commit implantado

## Se o site estiver deployando e o portal não

1. verificar se o commit apareceu em `advnoemiaportal`
2. se o commit só apareceu em `advnoemiasite`, revisar imediatamente:
   - `Root Directory`
   - `Ignored Build Step`
   - path filters do projeto `advnoemiaportal`
3. se o deploy do portal falhar antes do build, conferir primeiro o cron incompatível com Hobby

## Fonte de verdade

- [`../DEPLOY_SURFACES_AND_VERCEL_MAPPING.md`](../DEPLOY_SURFACES_AND_VERCEL_MAPPING.md)
- [`../VERCEL_PORTAL_PROJECT_OPERATIONS.md`](../VERCEL_PORTAL_PROJECT_OPERATIONS.md)
