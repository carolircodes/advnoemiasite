# Portal Backend

Base real do portal juridico, separada do site estatico atual para manter o fluxo publicado enquanto a autenticacao e o backend passam a funcionar de verdade.

## O que ja esta implementado

- autenticacao real com Supabase Auth
- login com e-mail + senha
- convite de primeiro acesso criado pela advogada
- definicao de senha no primeiro acesso
- recuperacao de senha por e-mail
- perfis separados para `advogada/admin` e `cliente`
- persistencia real de clientes, casos, eventos, fila de notificacoes e auditoria
- painel interno funcional para cadastrar cliente e registrar evento
- area do cliente conectada a dados reais

## Estrutura

- `app/`: rotas e telas do portal real
- `lib/auth/`: guards de acesso e resolucao de perfil
- `lib/supabase/`: clientes SSR, browser, admin e middleware
- `lib/services/`: regras de negocio de cadastro, eventos e dashboards
- `lib/notifications/`: fila `notifications_outbox`
- `scripts/bootstrap-admin.mjs`: cria a advogada inicial
- `supabase/config.toml`: configuracao local do Supabase
- `supabase/templates/`: templates locais de convite e recuperacao
- `supabase/migrations/20260403_initial_portal.sql`: schema inicial

## Pre-requisitos locais

- Node.js 20+
- npm
- Docker Desktop em execucao

## 1. Instalar dependencias

No terminal, dentro de [apps/portal-backend](C:\Users\Carolina Rosa\Documents\GitHub\advnoemiasite\apps\portal-backend):

```powershell
npm install
```

## 2. Subir o Supabase local

Ainda em [apps/portal-backend](C:\Users\Carolina Rosa\Documents\GitHub\advnoemiasite\apps\portal-backend):

```powershell
npm run supabase:start
```

Depois confira o status:

```powershell
npm run supabase:status
```

O Supabase local vai expor:

- API URL local
- `anon key`
- `service_role key`
- painel Studio
- caixa de e-mail local do Auth

## 3. Criar `.env.local`

Copie [.env.example](C:\Users\Carolina Rosa\Documents\GitHub\advnoemiasite\apps\portal-backend\.env.example) para `.env.local`.

Exemplo:

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLE_A_CHAVE_ANON_LOCAL_DO_SUPABASE
SUPABASE_SERVICE_ROLE_KEY=COLE_A_CHAVE_SERVICE_ROLE_LOCAL_DO_SUPABASE
INVITE_REDIRECT_URL=http://127.0.0.1:3000/auth/callback
PASSWORD_RESET_REDIRECT_URL=http://127.0.0.1:3000/auth/callback
RESEND_API_KEY=
EMAIL_FROM=Noemia Paixao Advocacia <portal@advnoemia.local>
PORTAL_ADMIN_EMAIL=advogada@advnoemia.local
PORTAL_ADMIN_FULL_NAME=Noemia Paixao
PORTAL_ADMIN_TEMP_PASSWORD=TroqueEstaSenha123
```

Use as chaves que o `supabase start` e o `supabase status` exibirem no seu terminal.

## 4. Aplicar a migration

Com o Supabase local rodando, aplique as migrations do projeto:

```powershell
npm run supabase:db:reset
```

Esse comando recria o banco local e aplica automaticamente [20260403_initial_portal.sql](C:\Users\Carolina Rosa\Documents\GitHub\advnoemiasite\apps\portal-backend\supabase\migrations\20260403_initial_portal.sql).

## 5. Criar a advogada interna

```powershell
npm run bootstrap:admin
```

Esse passo cria:

- usuaria da advogada no Auth
- perfil interno em `profiles`
- vinculo interno em `staff_members`

## 6. Rodar a aplicacao

```powershell
npm run dev
```

Abra:

- [http://127.0.0.1:3000/auth/login](http://127.0.0.1:3000/auth/login)
- [http://127.0.0.1:3000/internal/advogada](http://127.0.0.1:3000/internal/advogada)

## 7. Teste exato do fluxo completo

### Fluxo da advogada

1. Entre em `/auth/login`.
2. Faça login com:
   - e-mail: o valor de `PORTAL_ADMIN_EMAIL`
   - senha: o valor de `PORTAL_ADMIN_TEMP_PASSWORD`
3. Voce sera redirecionada para `/internal/advogada`.
4. Cadastre um cliente com:
   - nome completo
   - e-mail
   - CPF
   - telefone
   - area do caso
   - observacoes
   - status
5. Ao enviar, confirme no banco:
   - nova linha em `profiles`
   - nova linha em `clients`
   - novo caso em `cases`
   - novo evento em `case_events`
   - item em `notifications_outbox`

### Fluxo de convite do cliente

1. Abra a caixa de e-mail local do Supabase mostrada pelo `supabase start`.
2. Localize o e-mail de convite.
3. Clique no link.
4. O link entra por `/auth/callback`.
5. O callback valida o `token_hash` e redireciona para `/auth/primeiro-acesso`.
6. Defina a senha do cliente.
7. O cliente e redirecionado para `/cliente`.

### Fluxo de login do cliente

1. Em uma janela anonima ou outro perfil do navegador, abra `/auth/login`.
2. Entre com:
   - e-mail do cliente cadastrado
   - senha definida no primeiro acesso
3. O cliente entra em `/cliente`.

### Fluxo de recuperacao de senha

1. Abra `/auth/esqueci-senha`.
2. Informe o e-mail do cliente.
3. Localize o e-mail de recuperacao na caixa de e-mail local do Supabase.
4. Clique no link.
5. O callback valida o `token_hash` e envia para `/auth/atualizar-senha`.
6. Defina a nova senha.
7. Faça login novamente com a senha atualizada.

### Fluxo de historico do portal

1. Volte para `/internal/advogada`.
2. Em `Registrar evento do portal`, escolha um caso criado.
3. Registre um evento.
4. Confira:
   - novo registro em `case_events`
   - novo item em `notifications_outbox` quando `shouldNotifyClient` estiver ativo
   - evento aparecendo no painel interno
   - evento aparecendo em `/cliente`

## Como parar ou resetar o ambiente local

Parar os containers locais:

```powershell
npm run supabase:stop
```

Resetar o banco local:

```powershell
npm run supabase:db:reset
```

Depois do reset, rode novamente o bootstrap da advogada.

## E-mail local e producao

### Local

No ambiente local, o proprio Supabase entrega os e-mails de Auth na caixa de e-mail local exibida pelo `supabase start`. Isso cobre:

- convite de primeiro acesso
- recuperacao de senha

### Producao

Para producao, o envio continua passando pelo Supabase Auth, mas voce precisa configurar um provedor SMTP no projeto remoto do Supabase. Exemplo:

- Resend via SMTP
- SMTP proprio do seu dominio

Essa configuracao e externa ao codigo da aplicacao.
