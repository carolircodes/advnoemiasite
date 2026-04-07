# Checklist técnico — produção (apex + `portal.advnoemia.com.br`)

Use este guia quando o **site institucional** estiver em `https://advnoemia.com.br` (e opcionalmente `https://www.advnoemia.com.br`) e o **portal Next.js** em `https://portal.advnoemia.com.br`.

---

## 1. DNS e TLS

- [ ] Registo `A` / `CNAME` de `portal.advnoemia.com.br` aponta para a hospedagem do Next (Cloudflare Pages, Vercel, Fly.io, etc.).
- [ ] Certificado TLS válido no subdomínio do portal.
- [ ] (Opcional) Redirecionar `www.advnoemia.com.br` → `advnoemia.com.br` ou o inverso, de forma consistente.

## 2. Variáveis de ambiente (portal / Next)

Definir no painel do deploy do **portal** (não no site estático):

- [ ] `NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br` (sem barra final).
- [ ] `NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br` (URL canónica do marketing; usada em links “Site institucional” e na lista CORS).
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (ou alias documentados no `.env.example`).
- [ ] `INVITE_REDIRECT_URL=https://portal.advnoemia.com.br/auth/callback` (ou equivalente alinhado ao projeto).
- [ ] `PASSWORD_RESET_REDIRECT_URL=https://portal.advnoemia.com.br/auth/callback`.
- [ ] Demais variáveis de e-mail/worker conforme `apps/portal-backend/.env.example`.

Opcional:

- [ ] `CORS_ALLOWED_ORIGINS` — origens extra para `POST`/`OPTIONS` em `/api/public/triage` e `/api/public/events` (pré-visualizações, staging).

## 3. Supabase (Auth)

No dashboard do projeto Supabase:

- [ ] **Site URL** coerente com o portal (ex.: `https://portal.advnoemia.com.br`).
- [ ] **Redirect URLs** incluem:
  - `https://portal.advnoemia.com.br/auth/callback`
  - `https://portal.advnoemia.com.br/auth/**` (ou paths exatos de reset/primeiro acesso que o projeto usar).
- [ ] Templates de convite/recovery apontam para o mesmo host do portal.

## 4. CORS (site estático → portal)

O apex chama `https://portal.advnoemia.com.br/api/public/triage` e `.../events`.

- [ ] Confirmar que `NEXT_PUBLIC_PUBLIC_SITE_URL` coincide com o `Origin` do browser (ex.: `https://advnoemia.com.br`; incluir `www` se for usado).
- [ ] Se usar domínio de preview (Pages.dev), adicionar em `CORS_ALLOWED_ORIGINS`.

Implementação: `lib/http/cors-public.ts` + `OPTIONS`/`POST` em `app/api/public/triage` e `app/api/public/events`.

## 5. Site estático (apex)

- [ ] Ficheiro `_redirects` na raiz do deploy estático com redirecionamentos para o host do portal (já versionado no repositório).
- [ ] Links de “Área do cliente” e rodapé usam URLs absolutas `https://portal.advnoemia.com.br/...` (não `/portal/login` no mesmo host).
- [ ] `assets/js/contact-capture.js` usa `getPortalApiOrigin()` (produção → portal; `localhost` → mesma origem para dev).
- [ ] Não existem ficheiros HTML em `/portal/*` no deploy estático que substituam rotas da app.

## 6. Verificações pós-deploy

- [ ] `GET https://portal.advnoemia.com.br/api/health` → JSON `{ "ok": true, ... }`.
- [ ] `GET https://portal.advnoemia.com.br/portal/login` → formulário de login.
- [ ] A partir do site no apex: submeter triagem de teste e ver registo em `intake_requests` (ou resposta 201 da API).
- [ ] Login de cliente/advogada em staging antes de produção.
- [ ] Cookies de sessão: domínio `portal.advnoemia.com.br` (não esperar cookie de sessão no apex).

## 7. Cookies e privacidade

- [ ] Política de cookies / avisos se usar analytics no marketing que falem com o portal (se aplicável).

---

Documentação de produto e arquitetura: [`PORTAL_PRODUCT.md`](PORTAL_PRODUCT.md).
