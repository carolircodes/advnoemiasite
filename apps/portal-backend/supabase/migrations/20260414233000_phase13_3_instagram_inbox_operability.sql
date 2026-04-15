create index if not exists idx_conversation_sessions_channel_operational_queue
  on public.conversation_sessions (channel, thread_status, waiting_for, priority, updated_at desc);

create index if not exists idx_conversation_messages_session_type_created
  on public.conversation_messages (session_id, message_type, created_at desc);

create index if not exists idx_processed_webhook_events_channel_user_processed
  on public.processed_webhook_events (channel, external_user_id, processed_at desc);

comment on index idx_conversation_sessions_channel_operational_queue is
  'Suporte de leitura premium para filas multicanal com Instagram e WhatsApp na mesma inbox.';

comment on index idx_conversation_messages_session_type_created is
  'Ajuda a separar DMs, comentarios publicos e outros tipos de mensagem na leitura cronologica da thread.';

comment on index idx_processed_webhook_events_channel_user_processed is
  'Melhora a rastreabilidade de eventos por canal e usuario externo na segunda onda multicanal.';
