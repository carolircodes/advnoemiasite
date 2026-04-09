-- Migration: Create follow_up_messages table
-- Fase 5.5 - Registro de mensagens de follow-up

CREATE TABLE IF NOT EXISTS follow_up_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES client_pipeline(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'site', 'portal')),
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
        'reengagement',
        'post_contact_followup', 
        'consultation_invite',
        'proposal_reminder',
        'contract_nudge',
        'inactive_reengagement',
        'custom'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'scheduled', 
        'sent',
        'delivered',
        'read',
        'replied',
        'failed',
        'cancelled',
        'no_response'
    )),
    content TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    replied_at TIMESTAMP WITH TIME ZONE NULL,
    error_message TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_client_id 
ON follow_up_messages(client_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_pipeline_id 
ON follow_up_messages(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_status 
ON follow_up_messages(status);

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_scheduled_for 
ON follow_up_messages(scheduled_for) 
WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_channel_status 
ON follow_up_messages(channel, status);

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_priority 
ON follow_up_messages(status, scheduled_for, created_at);

-- Índice composto para consultas de elegibilidade
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_eligibility 
ON follow_up_messages(client_id, status, scheduled_for) 
WHERE status IN ('draft', 'scheduled', 'sent', 'delivered');

-- Trigger para updated_at
CREATE TRIGGER update_follow_up_messages_updated_at
    BEFORE UPDATE ON follow_up_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE follow_up_messages IS 'Mensagens de follow-up para leads e clientes';
COMMENT ON COLUMN follow_up_messages.message_type IS 'Tipo de mensagem: reengagement, consultation_invite, proposal_reminder, etc';
COMMENT ON COLUMN follow_up_messages.status IS 'Status: draft, scheduled, sent, delivered, read, replied, failed, cancelled, no_response';
COMMENT ON COLUMN follow_up_messages.scheduled_for IS 'Quando a mensagem deve ser enviada';
COMMENT ON COLUMN follow_up_messages.content IS 'Conteúdo da mensagem formatada';
COMMENT ON COLUMN follow_up_messages.metadata IS 'Dados adicionais como contexto usado na geração';

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 20241209_create_follow_up_messages: follow_up_messages table created';
    RAISE NOTICE 'Table includes: client_id, pipeline_id, channel, message_type, status, content, timestamps';
    RAISE NOTICE 'Indexes created for: client_id, pipeline_id, status, scheduled_for, priority queries';
    RAISE NOTICE 'Trigger: update_follow_up_messages_updated_at';
END $$;
