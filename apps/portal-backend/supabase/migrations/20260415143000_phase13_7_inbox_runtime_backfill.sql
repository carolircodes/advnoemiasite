update public.conversation_sessions
set
  last_message_at = coalesce(last_message_at, last_inbound_at, last_outbound_at, updated_at, created_at),
  last_message_preview = coalesce(
    nullif(last_message_preview, ''),
    nullif(left(last_summary, 240), ''),
    'Sem mensagem registrada ainda.'
  ),
  last_message_direction = coalesce(
    last_message_direction,
    case
      when last_outbound_at is not null
        and (last_inbound_at is null or last_outbound_at >= last_inbound_at) then 'outbound'
      when last_inbound_at is not null then 'inbound'
      else null
    end
  ),
  thread_status = case
    when thread_status = 'new' and coalesce(handoff_to_human, false) then 'waiting_human'
    when thread_status = 'new' and last_outbound_at is not null then 'waiting_client'
    when thread_status = 'new' and last_inbound_at is not null then 'ai_active'
    else thread_status
  end,
  waiting_for = case
    when coalesce(handoff_to_human, false) then 'human'
    when last_outbound_at is not null
      and (last_inbound_at is null or last_outbound_at >= last_inbound_at) then 'client'
    when last_inbound_at is not null then 'ai'
    else waiting_for
  end,
  owner_mode = case
    when coalesce(handoff_to_human, false) then 'human'
    else owner_mode
  end,
  unread_count = coalesce(unread_count, 0),
  updated_at = updated_at
where
  last_message_at is null
  or last_message_preview is null
  or last_message_direction is null
  or thread_status = 'new'
  or waiting_for = 'human';

update public.conversation_messages
set
  sender_type = case
    when role = 'assistant' then 'ai'
    when role = 'system' then 'system'
    else sender_type
  end,
  message_type = case
    when coalesce(metadata_json ->> 'responseSurface', '') = 'site_chat' then 'site_chat'
    when coalesce(metadata_json ->> 'responseSurface', '') = 'telegram_private' then 'telegram_private'
    when coalesce(metadata_json ->> 'responseSurface', '') = 'telegram_group' then 'telegram_group_signal'
    when coalesce(metadata_json ->> 'responseSurface', '') = 'public_comment' then 'public_comment'
    else coalesce(nullif(message_type, ''), 'text')
  end,
  received_at = coalesce(received_at, created_at),
  read_at = case
    when is_read = true and read_at is null then created_at
    else read_at
  end,
  failed_at = case
    when send_status = 'failed' and failed_at is null then created_at
    else failed_at
  end
where
  received_at is null
  or (is_read = true and read_at is null)
  or (send_status = 'failed' and failed_at is null)
  or message_type = 'text'
  or (sender_type = 'contact' and role in ('assistant', 'system'));
