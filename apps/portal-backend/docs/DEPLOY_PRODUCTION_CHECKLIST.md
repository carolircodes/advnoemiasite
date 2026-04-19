# Checklist técnico — produção (apex + `portal.advnoemia.com.br`)

Use este guia quando o site institucional estiver em `https://advnoemia.com.br` e o portal Next.js em `https://portal.advnoemia.com.br`.

## 1. DNS e TLS

- [ ] `portal.advnoemia.com.br` aponta para o projeto Vercel `advnoemiaportal`
- [ ] certificado TLS válido no subdomínio do portal
- [ ] `advnoemia.com.br` e `www.advnoemia.com.br` continuam apontando para o projeto do site, não para o portal

## 2. Variáveis de ambiente do portal

Definir no projeto Vercel do portal, nunca no projeto do site:

- [ ] `NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br`
- [ ] `NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_SECRET_KEY`
- [ ] `INVITE_REDIRECT_URL=https://portal.advnoemia.com.br/auth/callback`
- [ ] `PASSWORD_RESET_REDIRECT_URL=https://portal.advnoemia.com.br/auth/callback`
- [ ] `CRON_SECRET`
- [ ] variáveis de e-mail e worker conforme `.env.example`

## 3. Supabase Auth

- [ ] `Site URL` coerente com `https://portal.advnoemia.com.br`
- [ ] `Redirect URLs` incluindo `/auth/callback`
- [ ] templates de invite e recovery apontando para o host do portal

## 4. Build do portal na Vercel

Projeto correto: `advnoemiaportal`

- [ ] Root Directory = `apps/portal-backend`
- [ ] Production Branch = `main`
- [ ] Framework Preset = `Next.js`
- [ ] Install Command = `npm install`
- [ ] Build Command = `npm run build`
- [ ] Output Directory = `.next`
- [ ] Ignored Build Step desabilitado ou vazio
- [ ] path filters incluindo `apps/portal-backend/**`

## 5. Cron compatível com Hobby

O cron versionado do portal está em `apps/portal-backend/vercel.json`.

- [ ] schedule atual = `0 12 * * *`
- [ ] rota acionada = `/api/cron/notifications`
- [ ] não existe cron subdiário ativo no dashboard da Vercel

Regra operacional:

- no plano Hobby, não usar cron mais de 1x por dia
- se a operação exigir frequência maior, promover `advnoemiaportal` para Pro antes de alterar o schedule

## 6. Verificações pós-deploy

- [ ] `GET https://portal.advnoemia.com.br/api/health` retorna `{ "ok": true }`
- [ ] `https://portal.advnoemia.com.br/portal/login` abre corretamente
- [ ] o shell interno mostra `Release do portal <sha>`
- [ ] o SHA exibido bate com o commit implantado no projeto `advnoemiaportal`
- [ ] triagem pública e login seguem funcionando

## 7. Se o site deployar e o portal não

Verificar nesta ordem:

1. o commit apareceu em `advnoemiaportal`
2. `Root Directory = apps/portal-backend`
3. não existe `Ignored Build Step`
4. os path filters incluem `apps/portal-backend/**`
5. não existe cron incompatível com Hobby bloqueando o projeto

Fonte complementar:

- [`../../../docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md`](../../../docs/DEPLOY_SURFACES_AND_VERCEL_MAPPING.md)
- [`../../../docs/VERCEL_PORTAL_PROJECT_OPERATIONS.md`](../../../docs/VERCEL_PORTAL_PROJECT_OPERATIONS.md)
