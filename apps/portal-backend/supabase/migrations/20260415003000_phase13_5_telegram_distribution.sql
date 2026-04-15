create table if not exists telegram_channel_publications (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null,
  channel_username text not null,
  publication_type text not null default 'channel_post',
  title text null,
  body text not null,
  editorial_source text null,
  topic text null,
  cta_label text null,
  cta_url text null,
  related_content_id text null,
  signal_type text null,
  status text not null default 'draft',
  provider_message_id text null,
  provider_status text null,
  error_message text null,
  posted_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_by_name text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists telegram_channel_publications_status_idx
  on telegram_channel_publications (status, created_at desc);

create index if not exists telegram_channel_publications_signal_idx
  on telegram_channel_publications (signal_type, created_at desc);

create index if not exists telegram_channel_publications_topic_idx
  on telegram_channel_publications (topic, created_at desc);
