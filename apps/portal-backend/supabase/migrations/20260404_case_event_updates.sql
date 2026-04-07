alter table public.case_events
add column if not exists visible_to_client boolean not null default false;

update public.case_events
set visible_to_client = coalesce(nullif(btrim(public_summary), ''), '') <> ''
where visible_to_client = false;

create index if not exists case_events_client_visible_idx
on public.case_events(client_id, visible_to_client, occurred_at desc);

drop policy if exists "case_events_select_own_or_staff" on public.case_events;
create policy "case_events_select_own_or_staff"
on public.case_events
for select
using (
  public.is_staff() or (
    visible_to_client and exists (
      select 1
      from public.clients
      where public.clients.id = public.case_events.client_id
        and public.clients.profile_id = auth.uid()
    )
  )
);
