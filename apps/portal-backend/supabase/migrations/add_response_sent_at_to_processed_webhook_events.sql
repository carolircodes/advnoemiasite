-- Adicionar campo response_sent_at à tabela processed_webhook_events
ALTER TABLE processed_webhook_events 
ADD COLUMN IF NOT EXISTS response_sent_at TIMESTAMP WITH TIME ZONE;

-- Adicionar comentário
COMMENT ON COLUMN processed_webhook_events.response_sent_at IS 'Timestamp quando a resposta foi enviada ao usuário';
