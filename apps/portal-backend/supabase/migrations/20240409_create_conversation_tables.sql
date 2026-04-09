-- Tabela de sessões de conversação
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('instagram', 'whatsapp', 'site', 'portal')),
  external_user_id VARCHAR(255) NOT NULL,
  external_thread_id VARCHAR(255),
  lead_name VARCHAR(255),
  lead_stage VARCHAR(50) DEFAULT 'initial',
  case_area VARCHAR(50),
  current_intent VARCHAR(100),
  last_summary TEXT,
  handoff_to_human BOOLEAN DEFAULT FALSE,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance e idempotência
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_sessions_unique 
ON conversation_sessions (channel, external_user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity 
ON conversation_sessions (last_inbound_at DESC, last_outbound_at DESC);

-- Tabela de mensagens da conversação
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  external_message_id VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_created 
ON conversation_messages (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_external_id 
ON conversation_messages (external_message_id);

-- Tabela para controle de idempotência de webhooks
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('instagram', 'whatsapp')),
  external_event_id VARCHAR(255) NOT NULL,
  external_message_id VARCHAR(255),
  external_user_id VARCHAR(255),
  payload_hash VARCHAR(64),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único para idempotência
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_webhook_events_unique 
ON processed_webhook_events (channel, external_event_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at 
ON processed_webhook_events (processed_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_sessions_updated_at 
    BEFORE UPDATE ON conversation_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
