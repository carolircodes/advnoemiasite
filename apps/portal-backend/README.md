# Portal Backend

Base real do portal juridico com Supabase Auth, cadastro interno, convite por e-mail e area autenticada para equipe e cliente.

Arquitetura do produto, inventário (o que existe / o que falta) e plano por etapas: [`docs/PORTAL_PRODUCT.md`](docs/PORTAL_PRODUCT.md).

Checklist de deploy (apex + `portal.advnoemia.com.br`): [`docs/DEPLOY_PRODUCTION_CHECKLIST.md`](docs/DEPLOY_PRODUCTION_CHECKLIST.md).

O fluxo local validado para este projeto e:

- home publica com CTA para triagem e acesso do cliente
- triagem publica persistida na base
- triagens recebidas no painel interno
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
- processamento real da `notifications_outbox` por worker protegido por secret
- rotas internas e areas autenticadas protegidas por sessao, role e RLS
- eventos principais de conversao registrados em `product_events`

Nao e necessario criar usuario manualmente no Supabase Studio nem ajustar role manualmente.

## Estrutura principal

- `app/`: rotas e telas do portal
- `app/triagem/page.tsx`: triagem publica guiada em etapas
- `app/api/public/triage/route.ts`: recebimento persistido da triagem
- `app/api/public/events/route.ts`: eventos principais de conversao
- `lib/auth/`: guards e resolucao de perfil
- `lib/auth/access-control.ts`: matriz central de acesso, `next` seguro e redirects
- `lib/config/env.ts`: padronizacao das variaveis de ambiente
- `lib/portal/`: URLs canónicas (portal vs site público), mapa de rotas e referência de tabelas
- `app/api/health/route.ts`: health check leve (fora do middleware Supabase)
- `lib/services/create-client.ts`: cadastro interno do cliente e convite
- `lib/services/manage-documents.ts`: registro e solicitacao de documentos do caso
- `app/api/documents/[documentId]/route.ts`: acesso autenticado e seguro aos arquivos do storage
- `lib/services/manage-appointments.ts`: compromissos, prazos e proximos passos do caso
- `supabase/migrations/20260408_appointment_lifecycle.sql`: historico persistido da agenda
- `supabase/migrations/20260409_document_upload_storage.sql`: bucket privado e metadata de upload
- `supabase/migrations/20260410_visibility_rls_hardening.sql`: isolamento por visibilidade em agenda, atualizacoes e solicitacoes
- `supabase/migrations/20260411_public_intake_and_product_events.sql`: triagem publica e eventos de conversao
- `lib/services/register-event.ts`: atualizacoes reais do caso e fila de notificacoes
- `lib/services/process-notifications.ts`: worker real para processar a `notifications_outbox`
- `lib/services/public-intake.ts`: triagem publica, pipeline inicial e eventos de produto
- `lib/notifications/email-templates.ts`: padrao de mensagens do portal
- `app/api/worker/notifications/process/route.ts`: endpoint seguro para rodar a fila
- `scripts/process-notifications.mjs`: gatilho local do worker
- `lib/services/dashboard.ts`: agregacao do painel interno e da area do cliente
- `lib/services/intelligence.ts`: funil, leitura de eventos, uso do portal e sugestoes operacionais
- `app/internal/advogada/inteligencia/page.tsx`: visualizacao simples de BI do produto
- `app/noemia/page.tsx`: experiencia inicial da assistente em modo visitante e cliente
- `app/api/noemia/chat/route.ts`: backend da Noemia com registro de eventos de uso
- `lib/supabase/`: clientes browser, server, admin e middleware
- `scripts/bootstrap-admin.mjs`: bootstrap idempotente da advogada
- `supabase/config.toml`: configuracao local do Supabase Auth e Mailpit
- `supabase/migrations/20260403_initial_portal.sql`: schema inicial
- `supabase/migrations/20260412_intelligence_automation_and_noemia.sql`: estrutura adicional desta etapa
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
NOTIFICATIONS_PROVIDER=smtp
NOTIFICATIONS_WORKER_SECRET=troque-este-segredo-do-worker
NOTIFICATIONS_SMTP_HOST=127.0.0.1
NOTIFICATIONS_SMTP_PORT=54325
NOTIFICATIONS_SMTP_USER=
NOTIFICATIONS_SMTP_PASS=
NOTIFICATIONS_SMTP_SECURE=false
NOTIFICATIONS_REPLY_TO=atendimento@advnoemia.local
RESEND_API_KEY=
EMAIL_FROM=Noemia Paixao Advocacia <no-reply@advnoemia.local>
OPENAI_API_KEY=
OPENAI_MODEL=
PORTAL_ADMIN_EMAIL=advogada@advnoemia.local
PORTAL_ADMIN_FULL_NAME=Noemia Paixao
PORTAL_ADMIN_TEMP_PASSWORD=TroqueEstaSenha123
```

Use o valor `Publishable` mostrado pelo `supabase start` em `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Use o valor `Secret` mostrado pelo `supabase start` em `SUPABASE_SECRET_KEY`.

O projeto ainda aceita os aliases antigos `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, mas o padrao documentado e o definitivo.

Para envio real de notificacoes do portal:

- use `NOTIFICATIONS_PROVIDER=smtp` no ambiente local para falar com o Inbucket exposto em `127.0.0.1:54325`
- use `NOTIFICATIONS_PROVIDER=resend` em ambiente externo quando quiser enviar pela API da Resend
- defina `NOTIFICATIONS_WORKER_SECRET` antes de expor a rota do worker

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

Esse comando reaplica todas as migrations locais, incluindo triagem publica, eventos de produto, automacoes e a base da Noemia.

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

- `http://127.0.0.1:3000/portal/login`
- `http://127.0.0.1:3000/internal/advogada`

## Convite local e Mailpit

O convite do cliente usa `supabase.auth.admin.inviteUserByEmail`.

No ambiente local atual:

- o envio vai para a inbox local do Mailpit
- o Mailpit fica em `http://127.0.0.1:54324`
- o SMTP interno do Supabase local precisa apontar para `inbucket:1025`
- o SMTP externo para o worker do portal fica exposto em `127.0.0.1:54325`
- o callback de invite e recovery precisa apontar para `/auth/callback`

Configuracao local relevante em `supabase/config.toml`:

- `enable_signup = true`
- `enable_confirmations = false`
- `[auth.email.smtp].host = "inbucket"`
- `[auth.email.smtp].port = 1025`
- `[inbucket].smtp_port = 54325`
- redirects incluindo `http://127.0.0.1:3000/auth/callback` e `http://localhost:3000/auth/callback`

## Controle de acesso validado

- `/internal/advogada` e `/api/internal/*` exigem sessao autenticada com role `advogada` ou `admin`
- `/cliente` exige sessao autenticada com role `cliente`
- `/documentos` e `/agenda` exigem sessao autenticada e respeitam o role do usuario
- `/api/documents/[documentId]` exige sessao valida e reaplica a autorizacao do portal antes de abrir qualquer arquivo
- clientes sem `first_login_completed_at` sao redirecionados para `/auth/primeiro-acesso`
- leituras autenticadas do app passam por RLS real, sem `service_role` nas telas do portal
- clientes autenticados so leem `appointments`, `case_events` e `document_requests` quando o item tambem estiver marcado como visivel ao cliente
- mutacoes sensiveis ficam concentradas no backend com checagem adicional de actor autorizado
- sessoes autenticadas comuns nao recebem permissao SQL direta de escrita nas tabelas do schema `public`

## Fila real de notificacoes

Eventos relevantes continuam alimentando `notifications_outbox`. Agora o portal tambem possui um worker real para processar essa fila.

### Ambiente local

1. Confirme o bloco `[inbucket]` em `supabase/config.toml` com `smtp_port = 54325`.
2. Se voce acabou de alterar esse arquivo, reinicie o Supabase local.
3. Defina no `.env.local`:
   - `NOTIFICATIONS_PROVIDER=smtp`
   - `NOTIFICATIONS_WORKER_SECRET=...`
   - `NOTIFICATIONS_SMTP_HOST=127.0.0.1`
   - `NOTIFICATIONS_SMTP_PORT=54325`
4. Rode `npm run dev`.
5. Gere um evento que alimente `notifications_outbox`.
6. Rode `npm run notifications:process`.
7. Confira o resultado no terminal e a inbox local em `http://127.0.0.1:54324`.

### Fluxo do worker

- `POST /api/worker/notifications/process`
- autenticacao por `x-worker-secret` ou `Authorization: Bearer ...`

### Readiness protegida

- `GET /api/internal/readiness`
- acesso por `x-internal-api-secret` ou sessao staff autenticada
- o relatorio diferencia `healthy`, `degraded`, `missing_configuration`, `fallback` e `hard_failure`
- a secao `abuseProtection` informa se a migracao duravel foi aplicada, se o limiter esta em modo duravel ou `memory-fallback` e quais fluxos criticos estao duravelmente protegidos
- se a migracao `20260418120000_phase3_durable_abuse_controls.sql` nao estiver aplicada no ambiente, a readiness e os warnings de runtime passam a sinalizar esse desvio explicitamente
- o bloco `operator` agora resume `alerts`, `urgentActions` e um `quickstart` operacional protegido para pos-deploy

### Verificacao operacional rapida

Antes de promover ou encerrar um deploy backend, execute:

```powershell
npm run operations:verify
```

Esse comando resume:

- estado agregado do backend
- convergencia por subsistema critico
- expectativa da protecao duravel
- blockers vs warnings
- se o deploy esta liberado no perfil atual

Modos de enforcement:

- `npm run operations:verify`: modo local, preserva conveniencia de desenvolvimento e evidencia gaps sem bloquear tudo
- `npm run operations:verify:ci`: modo repo-safe para CI, valida governanca sem depender de runtime administrativo real
- `npm run operations:verify:release`: modo mais estrito para promocao production-like, bloqueando runtime duravel nao provado ou fallback critico
- `npm run operations:evidence:release`: gera evidence local em arquivo para anexar ao workflow de liberacao

Artifacts de release gerados:

- `backend-operations-report.json`
- `backend-operations-summary.txt`
- `backend-release-evidence.md`
- `backend-release-summary.json`
- `backend-release-summary.md`
- `handoff/handoff-manifest.json`
- `handoff/release-channel-summary.json`
- `handoff/release-channel-summary.md`
- `handoff/incident-escalation-summary.json`
- `handoff/incident-escalation-summary.md`

Use `handoff/release-channel-summary.md` como resumo pronto para o canal externo de release,
`handoff/incident-escalation-summary.md` como texto curto para escalonamento manual,
e `handoff/handoff-manifest.json` como indice schema-versioned para automacao simples ou
checklists operacionais.

O relatorio protegido em `GET /api/internal/readiness` agora tambem inclui `operator.releaseSafety`, com:

- `enforcementLevel`
- `deployAllowed`
- `blockers`
- `warnings`

Checklist detalhado:

- [`docs/BACKEND_OPERATOR_CHECKLIST.md`](docs/BACKEND_OPERATOR_CHECKLIST.md)
- [`docs/BACKEND_RELEASE_RUNBOOK.md`](docs/BACKEND_RELEASE_RUNBOOK.md)

### Consolidacao final da Fase 10

Esta etapa passou a fechar o core operacional em quatro frentes praticas:

- observabilidade de request para rotas publicas e analiticas criticas com `x-request-id`, `x-correlation-id` e `server-timing`
- taxonomia central de eventos de aquisicao em `lib/analytics/funnel-events.ts`
- analytics operacional consolidado em `/api/analytics/acquisition` e `/internal/analytics`
- biblioteca editorial real em subpasta `app/artigos/*`, com sitemap, robots, canonical e schema de artigo

Smoke local rapido da Fase 10:

```powershell
npm run smoke:phase10
```

Esse smoke valida:

- catalogo editorial em subpasta
- extracao de conteudo dos artigos
- taxonomia central de eventos do funil

Superficies novas ou consolidadas desta fase:

- `GET /artigos`
- `GET /artigos/[slug]`
- `GET /robots.txt`
- `GET /sitemap.xml`
- `GET /api/analytics/acquisition`

Tracking consolidado do funil:

- page views relevantes
- visualizacao de conteudo estrategico
- clique em CTA de atendimento
- clique em CTA de triagem
- clique de WhatsApp/canal
- triagem iniciada
- triagem enviada
- lead criado
- lead qualificado
- agendamento iniciado e concluido

### Camada de growth da Fase 11

Esta etapa colocou growth, CRO e RevOps por cima da consolidacao anterior sem recriar o core:

- score e temperatura de lead persistidos no intake
- CTA contextual com experimentacao leve por sessao
- hubs tematicos em `app/artigos/tema/[topic]/page.tsx`
- dashboard interno com score, prontidao e variantes
- painel operacional com score, lifecycle e SLA sugerido

Smoke local rapido da Fase 11:

```powershell
npm run smoke:phase11
```

Esse smoke valida:

- hubs editoriais por tema
- heuristica de lead score
- atribuicao deterministica de experimento
- eventos de experimentacao centralizados

Todos esses eventos passam a compartilhar nomenclatura, payload normalizado, origem/medium/campaign/topic/contentId e mascaramento de chaves sensiveis.

O worker de notificacoes:

- processa itens `pending` e `failed` disponiveis no horario atual
- envia por SMTP ou Resend, conforme `NOTIFICATIONS_PROVIDER`
- marca como `sent`, `failed` ou `skipped`

Observacao: registros `client-invite` continuam sendo tratados como rastreio do onboarding, porque o convite principal segue no fluxo nativo do Supabase Auth.

## Camada inteligente desta etapa

Esta etapa adiciona leitura real do funil, automacoes operacionais baseadas em evento e a primeira camada de IA do produto.

### Inteligencia de negocio

- abra `/internal/advogada/inteligencia` para visualizar:
  - funil `visita -> CTA -> triagem iniciada -> triagem enviada -> cliente criado -> login`
  - taxa de conversao e abandono da triagem
  - uso do portal com eventos reais
  - eventos recentes e breakdown de `product_events`
- o painel principal da advogada em `/internal/advogada` agora tambem traz:
  - radar inteligente dos ultimos 30 dias
  - sugestoes orientadas por dados
  - priorizacao operacional sem precisar sair do fluxo principal

### Automacoes operacionais

- `triagem enviada` gera notificacao clara para a advogada
- `triagem urgente` gera destaque automatico adicional
- `cliente sem primeiro acesso` entra em lembrete automatico
- `documento solicitado e nao enviado` entra em lembrete automatico
- `compromissos proximos` entram em notificacao automatica
- o processamento acontece por:
  - evento imediato no envio da triagem
  - `npm run notifications:process` para rodar o worker protegido da outbox

### Noemia

- configure `OPENAI_API_KEY` no `.env.local`
- opcionalmente defina `OPENAI_MODEL`
- abra `/noemia`
- comportamento atual:
  - visitante: explica triagem, portal e proximos passos
  - cliente autenticado: usa o contexto do proprio portal para explicar status, documentos e agenda
- os eventos `noemia_opened` e `noemia_message_sent` entram em `product_events`

### Telemetria desta etapa

Os eventos abaixo passam a alimentar a leitura inteligente do produto:

- `site_visit_started`
- `cta_start_triage_clicked`
- `cta_client_portal_clicked`
- `cta_noemia_clicked`
- `triage_started`
- `triage_submitted`
- `client_created`
- `portal_access_completed`
- `client_portal_viewed`
- `client_documents_viewed`
- `client_agenda_viewed`
- `client_document_previewed`
- `client_document_downloaded`
- `noemia_opened`
- `noemia_message_sent`

## Fluxo local validado

### Jornada publica e triagem

1. Abra `/`.
2. Clique em `Iniciar atendimento`.
3. Preencha a triagem em `/triagem`.
4. Confirme no banco:
   - novo registro em `intake_requests`
   - novo registro em `product_events` com `event_key = triage_submitted`
5. Entre como advogada em `/internal/advogada`.
6. Confirme que a triagem aparece em `Triagens recebidas`.
7. Atualize o status da triagem para organizar o retorno interno.

### Advogada

1. Rode `npm run bootstrap:admin`.
2. Acesse `/portal/login`.
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
2. Acesse `/portal/login`.
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
2. Confirme que todas as rotas redirecionam para `/portal/login`.
3. Acesse `/api/internal/clients` sem login.
4. Confirme retorno `401`.
5. Entre como advogada.
6. Confirme acesso a `/internal/advogada`.
7. Confirme que a advogada nao abre `/cliente` e e redirecionada para a area interna.
8. Entre como cliente.
9. Confirme acesso apenas a `/cliente`, `/documentos` e `/agenda`.
10. Confirme que o cliente nao abre `/internal/advogada` e recebe bloqueio em `/api/internal/*`.
11. Cadastre dois clientes diferentes e confirme que um nao visualiza dados do outro nas telas nem nas consultas autenticadas do Supabase.

### Eventos principais de conversao

Os eventos de conversao e uso passam a ser registrados em `product_events`:

- `cta_start_triage_clicked`
- `cta_client_portal_clicked`
- `cta_noemia_clicked`
- `site_visit_started`
- `triage_started`
- `triage_submitted`
- `client_created`
- `portal_access_completed`
- `client_portal_viewed`
- `client_documents_viewed`
- `client_agenda_viewed`
- `client_document_previewed`
- `client_document_downloaded`
- `noemia_opened`
- `noemia_message_sent`

### Checklist desta etapa

1. Acesse `/` e confirme `site_visit_started`.
2. Clique em `Iniciar atendimento` e confirme `cta_start_triage_clicked`.
3. Abra `/triagem`, avance a primeira etapa e confirme `triage_started`.
4. Envie a triagem e confirme:
   - novo registro em `intake_requests`
   - novo `triage_submitted` em `product_events`
   - notificacao interna com template `triage-submitted`
   - template `triage-urgent` quando a urgencia for `urgente`
5. No painel interno, cadastre o cliente a partir da triagem e confirme:
   - `client_created` em `product_events`
   - `clients.source_intake_request_id` preenchido
6. Conclua o primeiro acesso do cliente e confirme:
   - `portal_access_completed`
   - `profiles.first_login_completed_at`
7. Entre como cliente e abra:
   - `/cliente` para `client_portal_viewed`
   - `/documentos` para `client_documents_viewed`
   - `/agenda` para `client_agenda_viewed`
8. Visualize e baixe um documento e confirme:
   - `client_document_previewed`
   - `client_document_downloaded`
9. Rode `npm run notifications:process` e confirme:
   - `automation_dispatches` preenchida
   - `notifications_outbox` com itens `sent`, `failed` ou `skipped`
10. Abra `/internal/advogada/inteligencia` e confirme que o funil e o uso do portal refletem os eventos acima.
11. Configure `OPENAI_API_KEY`, abra `/noemia` e confirme:
   - resposta da assistente em modo visitante
   - resposta em modo cliente autenticado
   - `noemia_message_sent` em `product_events`

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
