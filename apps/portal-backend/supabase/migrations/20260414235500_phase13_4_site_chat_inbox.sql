create index if not exists conversation_sessions_site_operational_idx
  on conversation_sessions (channel, thread_status, waiting_for, last_message_at desc)
  where channel = 'site';

create index if not exists conversation_messages_site_chat_idx
  on conversation_messages (session_id, created_at desc)
  where message_type = 'site_chat';

create index if not exists product_events_site_session_idx
  on product_events (session_id, page_path, created_at desc);
