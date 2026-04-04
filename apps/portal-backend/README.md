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
- gestao real de documentos do caso
- upload real de arquivos do caso em storage privado
- solicitacoes documentais visiveis no portal
- agenda real de compromissos e proximos passos
- compromissos visiveis ao cliente em `/agenda`
- edicao, reagendamento e cancelamento com historico persistido da agenda
- rotas internas e areas autenticadas protegidas por sessao, role e RLS

Nao e necessario criar usuario manualmente no Supabase Studio nem ajustar role manualmente.

## Estrutura principal

- `app/`: rotas e telas do portal
- `lib/auth/`: guards e resolucao de perfil
- `lib/auth/access-control.ts`: matriz central de acesso, `next` seguro e redirects
- `lib/config/env.ts`: padronizacao das variaveis de ambiente
- `lib/services/create-client.ts`: cadastro interno do cliente e convite
- `lib/services/manage-documents.ts`: registro e solicitacao de documentos do caso
- `app/api/documents/[documentId]/route.ts`: acesso autenticado e seguro aos arquivos do storage
- `lib/services/manage-appointments.ts`: compromissos, prazos e proximos passos do caso
- `supabase/migrations/20260408_appointment_lifecycle.sql`: historico persistido da agenda
- `supabase/migrations/20260409_document_upload_storage.sql`: bucket privado e metadata de upload
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

## Controle de acesso validado

- `/internal/advogada` e `/api/internal/*` exigem sessao autenticada com role `advogada` ou `admin`
- `/cliente` exige sessao autenticada com role `cliente`
- `/documentos` e `/agenda` exigem sessao autenticada e respeitam o role do usuario
- `/api/documents/[documentId]` exige sessao valida e reaplica a autorizacao do portal antes de abrir qualquer arquivo
- clientes sem `first_login_completed_at` sao redirecionados para `/auth/primeiro-acesso`
- leituras autenticadas do app passam por RLS real, sem `service_role` nas telas do portal
- mutacoes sensiveis ficam concentradas no backend com checagem adicional de actor autorizado
- sessoes autenticadas comuns nao recebem permissao SQL direta de escrita nas tabelas do schema `public`

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

### Gestao de documentos do caso

1. Entre como advogada em `/documentos`.
2. No card `Registrar documento do caso`, escolha o caso e envie:
   - arquivo real em PDF, imagem ou documento
   - tipo
   - descricao curta
   - status
   - data
   - visibilidade para o cliente
3. Confirme que:
   - o arquivo foi enviado para o bucket privado `portal-case-documents`
   - o registro foi criado em `documents` com `storage_path`, `mime_type` e `file_size_bytes`
4. Se o documento for visivel e a notificacao estiver habilitada, confirme o novo item em `notifications_outbox`.
5. No card `Solicitar documento ao cliente`, abra uma nova solicitacao com orientacoes e prazo.
6. Confirme que:
   - o documento foi criado em `documents`
   - a solicitacao foi criada em `document_requests`
   - eventos visiveis foram registrados em `case_events`
   - a fila foi alimentada em `notifications_outbox` quando cabivel
7. Entre como cliente e abra `/documentos`.
8. Confirme as tres visoes:
   - `Documentos disponiveis`
   - `Documentos pendentes`
   - `Solicitacoes abertas`
9. Use `Visualizar arquivo` ou `Baixar arquivo` e confirme que:
   - o cliente acessa apenas arquivos visiveis do proprio caso
   - acessos sem sessao ou de outro cliente nao conseguem abrir o arquivo

### Agenda do caso

1. Entre como advogada em `/agenda`.
2. No card `Registrar compromisso ou proximo passo`, escolha o caso e preencha:
   - titulo
   - tipo de compromisso
   - descricao curta
   - data e hora
   - status
   - visibilidade para o cliente
3. Envie o formulario.
4. Confirme que:
   - o compromisso foi criado em `appointments`
   - uma trilha foi criada em `appointment_history`
   - um evento visivel foi criado em `case_events` quando aplicavel
   - a fila foi alimentada em `notifications_outbox` quando a notificacao estiver habilitada
5. No bloco `Editar, reagendar ou cancelar`, altere o mesmo compromisso:
   - mude titulo, tipo, descricao, data/hora, status ou visibilidade
   - use `Salvar alteracoes` para edicao ou reagendamento
   - use `Cancelar compromisso` para cancelamento
6. Confirme que:
   - novas linhas foram criadas em `appointment_history`
   - mudancas visiveis geraram novos eventos em `case_events`
   - reagendamento e cancelamento podem gerar novos itens em `notifications_outbox`
7. Entre como cliente e abra `/agenda`.
8. Confirme as duas visoes:
   - `Proximos compromissos`
   - `Historico recente`

### Checklist de seguranca local

1. Acesse `/internal/advogada`, `/cliente`, `/documentos` e `/agenda` sem login.
2. Confirme que todas as rotas redirecionam para `/auth/login`.
3. Acesse `/api/internal/clients` sem login.
4. Confirme retorno `401`.
5. Entre como advogada.
6. Confirme acesso a `/internal/advogada`.
7. Confirme que a advogada nao abre `/cliente` e e redirecionada para a area interna.
8. Entre como cliente.
9. Confirme acesso apenas a `/cliente`, `/documentos` e `/agenda`.
10. Confirme que o cliente nao abre `/internal/advogada` e recebe bloqueio em `/api/internal/*`.
11. Cadastre dois clientes diferentes e confirme que um nao visualiza dados do outro nas telas nem nas consultas autenticadas do Supabase.

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
