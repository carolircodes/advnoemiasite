begin;

revoke all on table public.noemia_leads from authenticated;
revoke all on table public.noemia_lead_conversations from authenticated;
revoke all on table public.acquisition_events from authenticated;

alter table public.noemia_leads enable row level security;
alter table public.noemia_lead_conversations enable row level security;
alter table public.acquisition_events enable row level security;

drop policy if exists "noemia_leads_staff_only" on public.noemia_leads;
create policy "noemia_leads_staff_only"
on public.noemia_leads
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "noemia_lead_conversations_staff_only" on public.noemia_lead_conversations;
create policy "noemia_lead_conversations_staff_only"
on public.noemia_lead_conversations
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "acquisition_events_staff_only" on public.acquisition_events;
create policy "acquisition_events_staff_only"
on public.acquisition_events
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

comment on table public.noemia_leads is
  'Backend and staff-only lead layer da NoemIA. Sessoes autenticadas comuns nao devem acessar diretamente.';

comment on table public.noemia_lead_conversations is
  'Historico sensivel de conversas da NoemIA. Acesso direto reservado a backend privilegiado e staff autenticado.';

comment on table public.acquisition_events is
  'Eventos de aquisicao internos para analytics e reconciliacao. Tracking publico deve usar endpoints dedicados e sanitizados.';

commit;
