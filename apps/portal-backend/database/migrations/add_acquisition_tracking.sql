-- Migração para adicionar sistema de rastreio de aquisição de leads

-- Adicionar campos de rastreio à tabela noemia_leads
ALTER TABLE noemia_leads 
ADD COLUMN IF NOT EXISTS source TEXT, -- instagram, whatsapp, site, ads, organic
ADD COLUMN IF NOT EXISTS campaign TEXT, -- nome da campanha ou conteúdo
ADD COLUMN IF NOT EXISTS topic TEXT, -- tema jurídico: previdenciario, bancario, familia, civil
ADD COLUMN IF NOT EXISTS content_id TEXT, -- identificador do conteúdo específico
ADD COLUMN IF NOT EXISTS acquisition_metadata JSONB DEFAULT '{}', -- metadados adicionais da aquisição
ADD COLUMN IF NOT EXISTS acquisition_tags TEXT[] DEFAULT '{}', -- tags operacionais automáticas
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_noemia_leads_source ON noemia_leads(source);
CREATE INDEX IF NOT EXISTS idx_noemia_leads_campaign ON noemia_leads(campaign);
CREATE INDEX IF NOT EXISTS idx_noemia_leads_topic ON noemia_leads(topic);
CREATE INDEX IF NOT EXISTS idx_noemia_leads_acquisition_tags ON noemia_leads USING GIN(acquisition_tags);
CREATE INDEX IF NOT EXISTS idx_noemia_leads_utm_source ON noemia_leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_noemia_leads_utm_campaign ON noemia_leads(utm_campaign);

-- Tabela para tracking de eventos de aquisição
CREATE TABLE IF NOT EXISTS acquisition_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES noemia_leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- lead_created, first_message_sent, qualified, scheduled, converted
    source TEXT,
    campaign TEXT,
    topic TEXT,
    content_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para acquisition_events
CREATE INDEX IF NOT EXISTS idx_acquisition_events_lead_id ON acquisition_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_event_type ON acquisition_events(event_type);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_source ON acquisition_events(source);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_created_at ON acquisition_events(created_at);

-- Função para registrar eventos de aquisição automaticamente
CREATE OR REPLACE FUNCTION log_acquisition_event(
    p_lead_id UUID,
    p_event_type TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO acquisition_events (
        lead_id,
        event_type,
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        metadata
    )
    SELECT 
        p_lead_id,
        p_event_type,
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        p_metadata
    FROM noemia_leads 
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para automaticamente criar evento lead_created
CREATE OR REPLACE FUNCTION trigger_lead_created_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar evento de criação do lead
    INSERT INTO acquisition_events (
        lead_id,
        event_type,
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        metadata
    ) VALUES (
        NEW.id,
        'lead_created',
        NEW.source,
        NEW.campaign,
        NEW.topic,
        NEW.content_id,
        NEW.utm_source,
        NEW.utm_medium,
        NEW.utm_campaign,
        NEW.utm_term,
        NEW.utm_content,
        jsonb_build_object(
            'created_at', NEW.created_at,
            'phone', NEW.phone,
            'email', NEW.email,
            'name', NEW.name
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_noemia_lead_create ON noemia_leads;
CREATE TRIGGER on_noemia_lead_create
    AFTER INSERT ON noemia_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_created_event();

-- Comentários
COMMENT ON COLUMN noemia_leads.source IS 'Origem do lead: instagram, whatsapp, site, ads, organic';
COMMENT ON COLUMN noemia_leads.campaign IS 'Nome da campanha ou conteúdo que gerou o lead';
COMMENT ON COLUMN noemia_leads.topic IS 'Tema jurídico de interesse: previdenciario, bancario, familia, civil';
COMMENT ON COLUMN noemia_leads.content_id IS 'Identificador único do conteúdo específico';
COMMENT ON COLUMN noemia_leads.acquisition_metadata IS 'Metadados adicionais da aquisição em formato JSON';
COMMENT ON COLUMN noemia_leads.acquisition_tags IS 'Tags operacionais automáticas para filtragem';
COMMENT ON TABLE acquisition_events IS 'Tabela para tracking de eventos do funil de aquisição';

-- Função para atualizar tags automaticamente
CREATE OR REPLACE FUNCTION update_acquisition_tags()
RETURNS TRIGGER AS $$
BEGIN
    -- Limpar tags existentes
    NEW.acquisition_tags := '{}';
    
    -- Adicionar tag de origem
    IF NEW.source IS NOT NULL THEN
        NEW.acquisition_tags := array_append(NEW.acquisition_tags, 'origem_' || NEW.source);
    END IF;
    
    -- Adicionar tag de tema
    IF NEW.topic IS NOT NULL THEN
        NEW.acquisition_tags := array_append(NEW.acquisition_tags, 'tema_' || NEW.topic);
    END IF;
    
    -- Adicionar tag de campanha se existir
    IF NEW.campaign IS NOT NULL THEN
        NEW.acquisition_tags := array_append(NEW.acquisition_tags, 'campanha_' || NEW.campaign);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar tags
DROP TRIGGER IF EXISTS update_acquisition_tags_trigger ON noemia_leads;
CREATE TRIGGER update_acquisition_tags_trigger
    BEFORE INSERT OR UPDATE ON noemia_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_acquisition_tags();

-- Função de utilidade para extrair parâmetros de URL
CREATE OR REPLACE FUNCTION extract_url_params(url TEXT)
RETURNS TABLE(
    source TEXT,
    campaign TEXT,
    topic TEXT,
    content_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        NULLIF(regexp_replace(url, '.*[?&]source=([^&]*).*', '\1'), '') as source,
        NULLIF(regexp_replace(url, '.*[?&]campaign=([^&]*).*', '\1'), '') as campaign,
        NULLIF(regexp_replace(url, '.*[?&]topic=([^&]*).*', '\1'), '') as topic,
        NULLIF(regexp_replace(url, '.*[?&]content_id=([^&]*).*', '\1'), '') as content_id,
        NULLIF(regexp_replace(url, '.*[?&]utm_source=([^&]*).*', '\1'), '') as utm_source,
        NULLIF(regexp_replace(url, '.*[?&]utm_medium=([^&]*).*', '\1'), '') as utm_medium,
        NULLIF(regexp_replace(url, '.*[?&]utm_campaign=([^&]*).*', '\1'), '') as utm_campaign,
        NULLIF(regexp_replace(url, '.*[?&]utm_term=([^&]*).*', '\1'), '') as utm_term,
        NULLIF(regexp_replace(url, '.*[?&]utm_content=([^&]*).*', '\1'), '') as utm_content;
END;
$$ LANGUAGE plpgsql;

-- Migração concluída com sucesso
