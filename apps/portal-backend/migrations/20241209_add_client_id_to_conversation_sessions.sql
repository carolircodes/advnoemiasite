-- Migration: Add client_id to conversation_sessions
-- Fase 1.2 - Adaptar conversation_sessions para vincular com clients
-- Objetivo: Conectar sessões existentes com a nova base de identidade unificada

-- Adicionar coluna client_id (nullable para não quebrar dados existentes)
ALTER TABLE conversation_sessions 
ADD COLUMN IF NOT EXISTS client_id UUID NULL;

-- Criar foreign key (sem ON DELETE CASCADE para preservar histórico)
ALTER TABLE conversation_sessions 
ADD CONSTRAINT IF NOT EXISTS fk_conversation_sessions_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_client_id 
ON conversation_sessions(client_id);

-- Comentários para documentação
COMMENT ON COLUMN conversation_sessions.client_id IS 'ID do cliente unificado (pode ser null para sessões antigas)';
COMMENT ON CONSTRAINT fk_conversation_sessions_client_id IS 'Vínculo opcional com tabela unificada de clientes';

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 20241209_add_client_id_to_conversation_sessions: client_id column added to conversation_sessions';
    RAISE NOTICE 'Foreign key constraint created: fk_conversation_sessions_client_id';
    RAISE NOTICE 'Index created: idx_conversation_sessions_client_id';
END $$;
