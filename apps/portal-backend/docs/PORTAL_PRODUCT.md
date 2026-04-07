# Portal como produto (Next.js + Supabase)

Este documento consolida a arquitetura recomendada, o inventário do que já existe no repositório e um plano de implementação por etapas. O código de referência da “base” do portal está em `lib/portal/` e `app/api/health/`.

---

## 1. Arquitetura recomendada

### Separação lógica (hoje vs ideal)

| Camada | Hoje (`apps/portal-backend`) | Ideal |
|--------|------------------------------|--------|
| Marketing | Rotas `/`, `/triagem`, `/noemia` no mesmo Next | Site estático em `advnoemia.com.br` **ou** app Next dedicado só marketing |
| Portal | Mesmo Next: `/portal/login`, `/cliente`, `/internal/advogada`, APIs | App Next **só portal** em `portal.advnoemia.com.br` (ou path `/app` por trás de CDN) |
| API pública | `/api/public/*` no Next | Pode permanecer no portal ou ir para Edge/worker compartilhado |
| Dados | Supabase Postgres + Auth + Storage + RLS | Igual; **uma** instância Supabase por ambiente |

### Autenticação e sessão

- **Supabase Auth** (e-mail/senha, convite, reset) com cookies via `@supabase/ssr`.
- **Middleware** (`middleware.ts` → `lib/supabase/middleware.ts`) atualiza a sessão e protege prefixos definidos em `lib/auth/access-control.ts` (`/internal`, `/cliente`, `/documentos`, `/agenda`, `/api/internal`).
- **Perfis** na tabela `profiles` (papel `admin` | `advogada` | `cliente`) alinhados ao `auth.users`.

### Banco de dados

- Migrations versionadas em `supabase/migrations/` (de `20260403_initial_portal.sql` até inteligência/automação).
- **RLS** e hardening em migrations posteriores (`20260407`, `20260410`, etc.).
- Referência de tabelas e tipos espelho em `lib/portal/database-tables.ts` (não substitui o SQL).

### Proteção de rotas

- Fonte de verdade: `isProtectedPortalPath` e `canAccessPortalPath` em `lib/auth/access-control.ts`.
- Mapa legível para evolução: `lib/portal/route-manifest.ts`.

---

## 2. O que já existe vs o que falta

### Autenticação

| Item | Status |
|------|--------|
| Login e-mail/senha (`/portal/login` → `auth/login`) | Existe |
| Callback OAuth/magic link (`/auth/callback`) | Existe |
| Primeiro acesso cliente (`/auth/primeiro-acesso`) | Existe |
| Esqueci senha / atualizar senha | Existe |
| Middleware + redirect para login | Existe |
| MFA / SSO corporativo | Falta (se necessário) |
| Auditoria de logins | Parcial (`audit_logs` + eventos pontuais) |

### Banco de dados

| Item | Status |
|------|--------|
| Schema núcleo (profiles, clients, cases, documents, appointments, case_events) | Existe |
| Triagem pública (`intake_requests`) e eventos de produto (`product_events`) | Existe |
| Storage para documentos | Existe (migrations dedicadas) |
| RLS e políticas | Existe (evoluir com novos módulos) |
| Backups, replicação, PITR | Operação Supabase / falta definir em produção |

### Dashboard da advogada (`/internal/advogada`)

| Item | Status |
|------|--------|
| Visão geral operacional, triagens, clientes, casos | Existe (UI extensa) |
| CRUD casos / clientes (server actions) | Existe |
| Inteligência / Noemia | Existe (módulo dedicado) |
| Relatórios exportáveis, permissões granulares por equipe | Falta / parcial |
| Testes E2E | Falta |

### Dashboard do cliente (`/cliente`)

| Item | Status |
|------|--------|
| Painel com resumo de caso, documentos, agenda | Existe |
| Fluxo primeiro acesso | Existe |
| Notificações in-app | Parcial (e-mail via outbox) |

### Agenda (`/agenda`)

| Item | Status |
|------|--------|
| Listagem/compromissos ligados a casos | Existe |
| Histórico de alterações (`appointment_history`) | Existe (migration) |
| Calendário externo (Google/Outlook) | Falta |

### Documentos (`/documentos`)

| Item | Status |
|------|--------|
| Listagem, upload, pedidos de documento | Existe |
| API download assinado (`/api/documents/[id]`) | Existe |
| Antivírus / DLP | Falta (se exigido) |

### Casos (`/internal/advogada/casos`, detalhe `[id]`)

| Item | Status |
|------|--------|
| Lista, novo caso, detalhe, eventos | Existe |
| Vínculo processual (número CNJ, andamentos automatizados) | Falta |
| Kanban / filas por time | Falta |

---

## 3. Separação site público vs portal

**Recomendação prática:**

1. **Curto prazo:** manter um único deploy Next **desde que** o CDN não sirva HTML estático nas mesmas rotas do portal (evitar conflito com `/portal/login`).
2. **Médio prazo:** publicar o marketing como **artefato estático** (repo raiz ou outro repositório) em `https://advnoemia.com.br` e o **portal apenas** como app Next em `https://portal.advnoemia.com.br`.
3. Variáveis:
   - `NEXT_PUBLIC_APP_URL` = URL canónica do **portal** (Next).
   - `NEXT_PUBLIC_PUBLIC_SITE_URL` = URL do **site institucional** (opcional), usada para links “Voltar ao site” quando os domínios forem diferentes.

Código: `lib/portal/app-urls.ts`.

---

## 4. Subdomínio `portal.advnoemia.com.br`?

**Sim, recomendado** para produção quando o marketing for estático no apex:

- Cookies de sessão ficam naturalmente escopados ao subdomínio do portal.
- Menos risco de colisão de rotas com ficheiros estáticos na raiz.
- Facilita políticas de segurança (CSP, cache) diferentes.

Configure no Supabase Auth as **Redirect URLs** para incluir `https://portal.advnoemia.com.br/auth/callback` (e equivalentes de reset/invite).

---

## 5. Plano técnico por etapas (ordem sugerida)

1. **Deploy confiável do Next** — um ambiente de staging com `NEXT_PUBLIC_APP_URL` igual à URL real; health check `GET /api/health`.
2. **Supabase** — `supabase db push` / migrations aplicadas; chaves e RLS validados.
3. **Separar tráfego** — DNS: `portal.` → hospedagem Next; apex → estático; remover HTML estático de portal do repositório do site público.
4. **Auth em produção** — convites, templates de e-mail, URLs de redirect alinhadas ao domínio do portal.
5. **Observabilidade** — logs de middleware, erros de API, fila `notifications_outbox`.
6. **Produto** — fechar lacunas (relatórios, integrações de calendário, processo judicial) conforme prioridade de negócio.

---

## 6. Base já preparada no código

- `lib/portal/app-urls.ts` — origem do portal + site público opcional.
- `lib/portal/route-manifest.ts` — mapa de rotas para evolução e documentação.
- `lib/portal/database-tables.ts` — tabelas e tipos de referência.
- `app/api/health/route.ts` — health check sem passar pelo fluxo Supabase do middleware.
- `middleware.ts` — exclusão de `api/health` do matcher.
- `NEXT_PUBLIC_PUBLIC_SITE_URL` em `lib/config/env.ts` + `.env.example`.

Próximo passo natural: usar `getPublicMarketingSiteOrigin()` nos layouts do portal para o link “Site institucional” quando a variável estiver definida.

---

## 7. Separação apex / portal (implementado no repositório)

- Removidos os HTML estáticos em `portal/*.html` que redirecionavam para `/cliente`, `/documentos`, etc. (evitava colisão e loops).
- `_redirects` no site estático envia rotas legadas do portal para `https://portal.advnoemia.com.br/...`.
- Links no marketing usam URL absoluta do portal; `contact-capture.js` envia triagem/eventos para o host do portal em produção.
- APIs públicas do Next respondem com CORS controlado (`lib/http/cors-public.ts`) para o `Origin` do site institucional.

Checklist de deploy: [`DEPLOY_PRODUCTION_CHECKLIST.md`](DEPLOY_PRODUCTION_CHECKLIST.md).
