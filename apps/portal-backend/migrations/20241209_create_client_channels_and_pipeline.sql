-- Migration: Create client_channels and client_pipeline tables
-- Fase 2 - Conectar clientes com conversas e canais

-- Criar tabela de vínculo de canais por cliente
CREATE TABLE IF NOT EXISTS client_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'site', 'portal')),
    external_user_id VARCHAR(255) NOT NULL,
    external_thread_id VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT true,
    last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de pipeline de clientes
CREATE TABLE IF NOT EXISTS client_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'new_lead' CHECK (stage IN ('new_lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    lead_temperature VARCHAR(20) NOT NULL DEFAULT 'cold' CHECK (lead_temperature IN ('cold', 'warm', 'hot')),
    source_channel VARCHAR(20) NOT NULL,
    assigned_to UUID NULL REFERENCES staff(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    tags TEXT[] DEFAULT '{}',
    notes TEXT NULL,
    first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_follow_up_at TIMESTAMP WITH TIME ZONE NULL,
    converted_to_client_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_channels_unique 
ON client_channels(channel, external_user_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_client_channels_client_id 
ON client_channels(client_id);

CREATE INDEX IF NOT EXISTS idx_client_channels_last_contact 
ON client_channels(last_contact_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_client_id 
ON client_pipeline(client_id);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_stage 
ON client_pipeline(stage);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_temperature 
ON client_pipeline(lead_temperature);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_source_channel 
ON client_pipeline(source_channel);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_last_contact 
ON client_pipeline(last_contact_at DESC);

-- Criar triggers para updated_at
CREATE TRIGGER update_client_channels_updated_at 
    BEFORE UPDATE ON client_channels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_pipeline_updated_at 
    BEFORE UPDATE ON client_pipeline 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE client_channels IS 'Vínculo entre clientes e seus canais de comunicação (WhatsApp, Instagram, etc)';
COMMENT ON COLUMN client_channels.channel IS 'Canal de comunicação: whatsapp, instagram, site, portal';
COMMENT ON COLUMN client_channels.external_user_id IS 'ID externo do usuário no canal (telefone, instagram_id, etc)';
COMMENT ON COLUMN client_channels.external_thread_id IS 'ID externo da conversa/thread (opcional)';
COMMENT ON COLUMN client_channels.is_active IS 'Se o canal está ativo para este cliente';

COMMENT ON TABLE client_pipeline IS 'Pipeline de vendas/atendimento para cada cliente';
COMMENT ON COLUMN client_pipeline.stage IS 'Estágio atual no pipeline: new_lead, contacted, qualified, proposal, negotiation, closed_won, closed_lost';
COMMENT ON COLUMN client_pipeline.lead_temperature IS 'Temperatura do lead: cold, warm, hot';
COMMENT ON COLUMN client_pipeline.source_channel IS 'Canal original de aquisição do lead';
COMMENT ON COLUMN client_pipeline.assigned_to IS 'Staff responsável pelo cliente (opcional)';
COMMENT ON COLUMN client_pipeline.priority IS 'Prioridade do cliente (1-5, onde 5 é mais alta)';
COMMENT ON COLUMN client_pipeline.tags IS 'Array de tags para categorização';
COMMENT ON COLUMN client_pipeline.next_follow_up_at IS 'Próximo follow-up agendado';
COMMENT ON COLUMN client_pipeline.converted_to_client_at IS 'Data em que o lead foi convertido para cliente ativo';

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 20241209_create_client_channels_and_pipeline: Tables created successfully';
    RAISE NOTICE 'client_channels: Vínculo cliente-canal com índice único';
    RAISE NOTICE 'client_pipeline: Pipeline de vendas/atendimento';
    RAISE NOTICE 'All indexes and triggers created';
END $$;
