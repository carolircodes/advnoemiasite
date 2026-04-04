drop policy if exists "document_requests_select_own_or_staff" on public.document_requests;
create policy "document_requests_select_own_or_staff"
on public.document_requests
for select
using (
  public.is_staff() or (
    visible_to_client = true and exists (
      select 1
      from public.cases
      join public.clients on public.clients.id = public.cases.client_id
      where public.cases.id = public.document_requests.case_id
        and public.clients.profile_id = auth.uid()
    )
  )
);

drop policy if exists "appointments_select_own_or_staff" on public.appointments;
create policy "appointments_select_own_or_staff"
on public.appointments
for select
using (
  public.is_staff() or (
    visible_to_client = true and exists (
      select 1
      from public.clients
      where public.clients.id = public.appointments.client_id
        and public.clients.profile_id = auth.uid()
    )
  )
);

drop policy if exists "case_events_select_own_or_staff" on public.case_events;
create policy "case_events_select_own_or_staff"
on public.case_events
for select
using (
  public.is_staff() or (
    visible_to_client = true and exists (
      select 1
      from public.clients
      where public.clients.id = public.case_events.client_id
        and public.clients.profile_id = auth.uid()
    )
  )
);
