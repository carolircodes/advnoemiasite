do $$
begin
  create type public.appointment_type as enum (
    'reuniao',
    'retorno',
    'prazo',
    'audiencia',
    'ligacao'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.appointments
add column if not exists title text not null default 'Compromisso do caso';

alter table public.appointments
add column if not exists appointment_type public.appointment_type not null default 'reuniao';

alter table public.appointments
add column if not exists visible_to_client boolean not null default true;

create index if not exists appointments_client_visible_idx
on public.appointments(client_id, visible_to_client, starts_at asc);

create index if not exists appointments_case_starts_idx
on public.appointments(case_id, starts_at asc);

drop policy if exists "appointments_select_own_or_staff" on public.appointments;
create policy "appointments_select_own_or_staff"
on public.appointments
for select
using (
  public.is_staff() or (
    visible_to_client and exists (
      select 1
      from public.clients
      where public.clients.id = public.appointments.client_id
        and public.clients.profile_id = auth.uid()
    )
  )
);
