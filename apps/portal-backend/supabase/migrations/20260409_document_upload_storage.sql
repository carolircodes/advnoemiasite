insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'portal-case-documents',
  'portal-case-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.documents
add column if not exists mime_type text;

alter table public.documents
add column if not exists file_size_bytes bigint;

create index if not exists documents_case_visibility_date_idx
on public.documents(case_id, visibility, document_date desc);
