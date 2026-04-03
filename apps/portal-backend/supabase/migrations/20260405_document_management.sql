do $$
begin
  create type public.document_status as enum ('recebido', 'pendente', 'solicitado', 'revisado');
exception
  when duplicate_object then null;
end $$;

alter table public.documents
alter column storage_path drop not null;

alter table public.documents
add column if not exists description text;

alter table public.documents
add column if not exists status public.document_status not null default 'recebido';

alter table public.documents
add column if not exists document_date timestamptz not null default timezone('utc', now());

alter table public.document_requests
add column if not exists visible_to_client boolean not null default true;

create index if not exists documents_case_status_idx
on public.documents(case_id, status, document_date desc);

create index if not exists document_requests_case_status_idx
on public.document_requests(case_id, status, created_at desc);

drop policy if exists "document_requests_select_own_or_staff" on public.document_requests;
create policy "document_requests_select_own_or_staff"
on public.document_requests
for select
using (
  public.is_staff() or (
    visible_to_client and exists (
      select 1
      from public.cases
      join public.clients on public.clients.id = public.cases.client_id
      where public.cases.id = public.document_requests.case_id
        and public.clients.profile_id = auth.uid()
    )
  )
);
