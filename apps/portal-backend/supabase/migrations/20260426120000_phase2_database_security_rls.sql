begin;

-- Fase 2: hardening defensivo da camada de dados.
-- Esta migration nao concede acesso novo a clientes. Ela fecha tabelas
-- operacionais que nasceram em fases anteriores sem RLS explicito e mantém
-- filas/idempotencia/webhooks como service-role only.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'public.client_channels',
    'public.client_pipeline',
    'public.conversation_events',
    'public.conversation_messages',
    'public.conversation_notes',
    'public.conversation_sessions',
    'public.noemia_triage_summaries',
    'public.telegram_channel_publications'
  ] loop
    if to_regclass(table_name) is not null then
      execute format('alter table %s enable row level security', table_name);
      execute format('revoke all on table %s from anon', table_name);
      execute format('grant select on table %s to authenticated', table_name);
      execute format('drop policy if exists %I on %s', 'phase2_staff_only', table_name);
      execute format(
        'create policy %I on %s for all to authenticated using (public.is_staff()) with check (public.is_staff())',
        'phase2_staff_only',
        table_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'public.idempotency_keys',
    'public.keyword_automation_events',
    'public.processed_webhook_events',
    'public.request_rate_limits'
  ] loop
    if to_regclass(table_name) is not null then
      execute format('alter table %s enable row level security', table_name);
      execute format('revoke all on table %s from anon', table_name);
      execute format('revoke all on table %s from authenticated', table_name);
      execute format('grant select, insert, update, delete on table %s to service_role', table_name);
    end if;
  end loop;
end $$;

comment on table public.client_channels is
  'Identidades multicanal por cliente canonico. Acesso direto restrito a staff autenticado e backend privilegiado.';

comment on table public.client_pipeline is
  'Pipeline comercial/operacional interno. Nao deve ser exposto diretamente ao cliente.';

comment on table public.conversation_sessions is
  'Threads multicanal sensiveis. Leitura direta restrita a staff/backend; visitantes usam endpoints dedicados com sessao assinada.';

comment on table public.conversation_messages is
  'Mensagens multicanal sensiveis. Leitura direta restrita a staff/backend; payloads nao devem ser expostos por RLS ampla.';

comment on table public.conversation_events is
  'Trilha operacional de conversas, ownership e handoff. Acesso direto restrito a staff/backend.';

comment on table public.conversation_notes is
  'Notas internas por conversa, incluindo contexto sensivel. Acesso direto restrito a staff/backend.';

comment on table public.noemia_triage_summaries is
  'Resumo sensivel de triagem da IA. Acesso direto restrito a staff/backend.';

comment on table public.telegram_channel_publications is
  'Fila editorial/operacional de publicacoes Telegram. Acesso direto restrito a staff/backend.';

comment on table public.processed_webhook_events is
  'Ledger idempotente de webhooks. Service-role only; usuarios autenticados nao devem consultar ou escrever.';

comment on table public.keyword_automation_events is
  'Ledger interno de automacao de palavras-chave. Service-role only por conter IDs externos e sinais de aquisicao.';

comment on table public.request_rate_limits is
  'Buckets duraveis de rate limit. Service-role only.';

comment on table public.idempotency_keys is
  'Chaves duraveis de idempotencia. Service-role only.';

commit;
