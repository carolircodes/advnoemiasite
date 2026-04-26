# Database Security Audit - AdvNoemia / Imperio Juridico

## Escopo

Auditoria da Fase 2 focada em Supabase/Postgres, migrations, RLS, service role,
storage e isolamento de dados. Nenhuma migration foi aplicada em banco real.
Nenhum valor de secret foi lido ou exposto.

## Inventario de migrations

- Diretorio ativo: `apps/portal-backend/supabase/migrations`
- Total auditado apos a Fase 2: 52 migrations SQL.
- Migration nova: `20260426120000_phase2_database_security_rls.sql`.
- SQLs historicos sem timestamp canonico ainda presentes:
  - `add_response_sent_at_to_processed_webhook_events.sql`
  - `create_keyword_automation_events.sql`

Esses dois arquivos nao devem ser renomeados sem confirmar se ja foram aplicados
em algum ambiente. A reconciliacao deve ser feita por DBA/operador em janela
controlada.

## Tabelas criticas

### Cliente/RLS por propriedade

- `profiles`
- `clients`
- `cases`
- `documents`
- `document_requests`
- `appointments`
- `case_events`
- `notification_preferences`
- `notification_push_subscriptions`

Essas tabelas devem permitir leitura do proprio cliente quando aplicavel e
acesso de staff. O portal do cliente deve continuar filtrando por `profile_id`,
`client_id`, `visible_to_client` e `visibility`.

### Staff/backend only

- `noemia_leads`
- `noemia_lead_conversations`
- `noemia_triage_summaries`
- `conversation_sessions`
- `conversation_messages`
- `conversation_events`
- `conversation_notes`
- `client_channels`
- `client_pipeline`
- `acquisition_events`
- `payment_events`
- `notifications_outbox`
- `notification_interactions`
- `audit_logs`
- `telegram_channel_publications`

Essas tabelas podem conter conversas, IDs externos, classificacoes de IA,
observacoes internas, sinais comerciais e dados juridicos sensiveis. A Fase 2
adicionou RLS staff-only para as superficies que ainda nao tinham RLS explicito
no historico local.

### Service-role only

- `processed_webhook_events`
- `keyword_automation_events`
- `request_rate_limits`
- `idempotency_keys`

Essas tabelas sao ledgers operacionais. Usuario autenticado comum nao deve
consultar nem escrever diretamente. O backend usa service role para webhooks,
cron, rate limit e idempotencia.

## Storage/documentos

Bucket encontrado:

- `portal-case-documents`
- `public = false`
- limite declarado: 20 MB
- MIME types restritos a PDF, DOC/DOCX e imagens comuns

O codigo baixa arquivos via backend apos validar o acesso ao registro
`documents` com RLS. Ainda assim, antes do piloto, validar manualmente no
Supabase:

- bucket continua privado;
- nao ha policy ampla em `storage.objects`;
- paths seguem `clients/{clientId}/cases/{caseId}/documents/{documentId}/{file}`;
- download direto anonimo falha;
- download via rota do app passa somente para cliente dono ou staff.

## Checklist antes do piloto

1. Confirmar que todas as migrations ate `20260426120000_phase2_database_security_rls.sql` foram aplicadas no ambiente alvo.
2. Rodar SQL read-only no Supabase para conferir RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'clients',
    'cases',
    'documents',
    'conversation_sessions',
    'conversation_messages',
    'client_channels',
    'client_pipeline',
    'payments',
    'payment_events',
    'notifications_outbox',
    'processed_webhook_events',
    'request_rate_limits',
    'idempotency_keys'
  )
order by tablename;
```

3. Conferir policies:

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

4. Validar com contas reais de teste:
   - cliente A nao acessa documentos/casos do cliente B;
   - cliente nao acessa `conversation_messages`, `client_pipeline` ou `noemia_leads`;
   - staff acessa painel/inbox/CRM;
   - rotas cron/webhook funcionam somente com service role/secret;
   - service role nao aparece em codigo client-side.

5. Validar storage:
   - bucket privado;
   - URL direta sem assinatura falha;
   - rota `/api/documents/[documentId]` respeita RLS do registro `documents`.

## Riscos residuais

- Validacao real de RLS depende do Supabase alvo; o scanner local prova apenas
  que as migrations do repositorio cobrem as tabelas criticas.
- Existem migrations historicas sem prefixo timestamp; nao renomear sem
  reconciliacao com `supabase_migrations.schema_migrations`.
- Logs legados de alguns servicos ainda devem ser revisitados em fase propria.
- Retencao/anonymization LGPD ainda precisa de politica funcional de produto e
  rotinas operacionais.
