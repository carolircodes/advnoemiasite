# Portal Backend

Base real do portal juridico com Supabase Auth, cadastro interno, convite por e-mail e area autenticada para equipe e cliente.

O fluxo local validado para este projeto e:

- subir o Supabase local
- aplicar a migration inicial
- bootstrap da advogada
- login interno
- cadastro de cliente
- envio de convite para Mailpit
- primeiro acesso do cliente
- login do cliente
- registro de atualizacao real do caso
- visualizacao do historico pelo cliente

Nao e necessario criar usuario manualmente no Supabase Studio nem ajustar role manualmente.

## Estrutura principal

- `app/`: rotas e telas do portal
- `lib/auth/`: guards e resolucao de perfil
- `lib/config/env.ts`: padronizacao das variaveis de ambiente
- `lib/services/create-client.ts`: cadastro interno do cliente e convite
- `lib/services/register-event.ts`: atualizacoes reais do caso e fila de notificacoes
- `lib/services/dashboard.ts`: agregacao do painel interno e da area do cliente
- `lib/supabase/`: clientes browser, server, admin e middleware
- `scripts/bootstrap-admin.mjs`: bootstrap idempotente da advogada
- `supabase/config.toml`: configuracao local do Supabase Auth e Mailpit
- `supabase/migrations/20260403_initial_portal.sql`: schema inicial
- `supabase/templates/`: templates locais de invite e recovery

## Pre-requisitos

- Node.js 20+
- npm
- Docker Desktop em execucao

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` nos mesmos comandos.

## Padrao final de ambiente

Use estas variaveis em `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=COLE_A_CHAVE_PUBLICA_LOCAL_DO_SUPABASE
SUPABASE_SECRET_KEY=COLE_A_CHAVE_SECRETA_LOCAL_DO_SUPABASE
INVITE_REDIRECT_URL=http://127.0.0.1:3000/auth/callback
PASSWORD_RESET_REDIRECT_URL=http://127.0.0.1:3000/auth/callback
RESEND_API_KEY=
EMAIL_FROM=Noemia Paixao Advocacia <no-reply@advnoemia.local>
PORTAL_ADMIN_EMAIL=advogada@advnoemia.local
PORTAL_ADMIN_FULL_NAME=Noemia Paixao
PORTAL_ADMIN_TEMP_PASSWORD=TroqueEstaSenha123
```

Use o valor `Publishable` mostrado pelo `supabase start` em `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Use o valor `Secret` mostrado pelo `supabase start` em `SUPABASE_SECRET_KEY`.

O projeto ainda aceita os aliases antigos `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, mas o padrao documentado e o definitivo.

## Setup local

### 1. Instalar dependencias

```powershell
npm install
```

### 2. Criar `.env.local`

Copie `.env.example` para `.env.local` e preencha as chaves locais do Supabase.

### 3. Subir o Supabase local

```powershell
npm run supabase:start
```

Servicos locais relevantes:

- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`

### 4. Resetar o banco local

```powershell
npm run supabase:db:reset
```

Esse comando reaplica `20260403_initial_portal.sql`.

### 5. Executar o bootstrap da advogada

```powershell
npm run bootstrap:admin
```

O bootstrap:

- cria ou atualiza a usuaria da advogada no Auth
- alinha senha e metadata
- sincroniza `profiles`
- sincroniza `staff_members`
- valida o login com a chave publica local

### 6. Rodar o app

```powershell
npm run dev
```

Abra sempre usando o mesmo host configurado em `NEXT_PUBLIC_APP_URL`.

Padrao recomendado:

- `http://127.0.0.1:3000/auth/login`
- `http://127.0.0.1:3000/internal/advogada`

## Convite local e Mailpit

O convite do cliente usa `supabase.auth.admin.inviteUserByEmail`.

No ambiente local atual:

- o envio vai para a inbox local do Mailpit
- o Mailpit fica em `http://127.0.0.1:54324`
- o SMTP interno do Supabase local precisa apontar para `inbucket:1025`
- o callback de invite e recovery precisa apontar para `/auth/callback`

Configuracao local relevante em `supabase/config.toml`:

- `enable_signup = true`
- `enable_confirmations = false`
- `[auth.email.smtp].host = "inbucket"`
- `[auth.email.smtp].port = 1025`
- redirects incluindo `http://127.0.0.1:3000/auth/callback` e `http://localhost:3000/auth/callback`

## Fluxo local validado

### Advogada

1. Rode `npm run bootstrap:admin`.
2. Acesse `/auth/login`.
3. Entre com `PORTAL_ADMIN_EMAIL` e `PORTAL_ADMIN_TEMP_PASSWORD`.
4. Confirme que o redirecionamento vai para `/internal/advogada`.

### Cadastro interno e convite

1. No painel da advogada, preencha o formulario `Cadastrar cliente`.
2. Envie o formulario.
3. Confirme que o cliente foi criado em:
   - `profiles`
   - `clients`
   - `cases`
   - `case_events`
   - `notifications_outbox`
4. Abra o Mailpit em `http://127.0.0.1:54324`.
5. Confirme que o convite chegou na inbox local.

### Primeiro acesso do cliente

1. Abra o e-mail de convite no Mailpit.
2. Clique no link do convite.
3. O callback entra por `/auth/callback`.
4. O cliente e redirecionado para `/auth/primeiro-acesso`.
5. Defina a senha inicial.
6. O cliente e redirecionado para `/cliente`.

### Login do cliente

1. Abra uma aba anonima.
2. Acesse `/auth/login`.
3. Entre com o e-mail do cliente e a senha definida no primeiro acesso.
4. Confirme que `/cliente` abre normalmente.

### Acompanhamento real do caso

1. Entre como advogada em `/internal/advogada`.
2. No card `Registrar atualizacao do caso`, escolha o caso e preencha:
   - tipo de atualizacao
   - data da atualizacao
   - titulo
   - descricao
   - visibilidade para o cliente
3. Se quiser preparar a notificacao futura, mantenha marcada a opcao de fila de e-mail.
4. Envie o formulario.
5. Confirme que um novo registro foi criado em `case_events`.
6. Se a atualizacao estiver visivel e com notificacao habilitada, confirme o novo item em `notifications_outbox`.
7. Abra a area do cliente em `/cliente`.
8. Confirme que a atualizacao aparece no historico em ordem da mais recente para a mais antiga.

## Diagnostico rapido de invite

Se o painel mostrar erro no convite:

1. Confirme que `npm run supabase:start` esta com Mailpit local ativo.
2. Confirme em `supabase/config.toml`:
   - `host = "inbucket"`
   - `port = 1025`
3. Confirme que `INVITE_REDIRECT_URL` aponta para `/auth/callback`.
4. Confirme que o app e o callback usam o mesmo host base configurado no `.env.local`.
5. Veja o Mailpit em `http://127.0.0.1:54324`.
6. Se necessario, consulte os logs do container `supabase_auth_portal-backend`.

## Parar o ambiente

```powershell
npm run supabase:stop
```
