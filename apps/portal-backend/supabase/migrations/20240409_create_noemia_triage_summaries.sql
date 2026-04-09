-- Criar tabela para resumos de triagem da NoemIA
CREATE TABLE IF NOT EXISTS noemia_triage_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('instagram', 'whatsapp', 'site', 'portal')),
  user_id TEXT NOT NULL,
  
  -- Dados estruturados da triagem (JSON)
  triage_data JSONB NOT NULL DEFAULT '{}',
  
  -- Classificação e prioridade
  is_hot_lead BOOLEAN NOT NULL DEFAULT false,
  needs_human_attention BOOLEAN NOT NULL DEFAULT false,
  handoff_reason TEXT,
  
  -- Resumos gerados
  internal_summary TEXT NOT NULL DEFAULT '',
  user_friendly_summary TEXT NOT NULL DEFAULT '',
  
  -- Controle de atendimento humano
  attended_by TEXT,
  attended_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_session_id ON noemia_triage_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_channel ON noemia_triage_summaries(channel);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_user_id ON noemia_triage_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_is_hot_lead ON noemia_triage_summaries(is_hot_lead);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_needs_attention ON noemia_triage_summaries(needs_human_attention);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_created_at ON noemia_triage_summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_updated_at ON noemia_triage_summaries(updated_at);

-- Índices específicos para dados JSONB
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_area ON noemia_triage_summaries USING GIN ((triage_data->'area'));
CREATE INDEX IF NOT EXISTS idx_noemia_triage_summaries_urgency ON noemia_triage_summaries USING GIN ((triage_data->'nivel_urgencia'));

-- Comentários
COMMENT ON TABLE noemia_triage_summaries IS 'Resumos de triagem conversacional da NoemIA';
COMMENT ON COLUMN noemia_triage_summaries.session_id IS 'ID único da sessão de conversa';
COMMENT ON COLUMN noemia_triage_summaries.channel IS 'Canal da conversa (instagram, whatsapp, site, portal)';
COMMENT ON COLUMN noemia_triage_summaries.user_id IS 'ID do usuário na plataforma externa';
COMMENT ON COLUMN noemia_triage_summaries.triage_data IS 'Dados estruturados da triagem em formato JSON';
COMMENT ON COLUMN noemia_triage_summaries.is_hot_lead IS 'Se é um lead quente que necessita atenção prioritária';
COMMENT ON COLUMN noemia_triage_summaries.needs_human_attention IS 'Se necessita atenção humana';
COMMENT ON COLUMN noemia_triage_summaries.handoff_reason IS 'Motivo do encaminhamento para humano';
COMMENT ON COLUMN noemia_triage_summaries.internal_summary IS 'Resumo interno para equipe';
COMMENT ON COLUMN noemia_triage_summaries.user_friendly_summary IS 'Resumo amigável para o usuário';
COMMENT ON COLUMN noemia_triage_summaries.attended_by IS 'Quem atendeu (se atendido por humano)';
COMMENT ON COLUMN noemia_triage_summaries.attended_at IS 'Quando foi atendido por humano';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_noemia_triage_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_noemia_triage_summaries_updated_at
    BEFORE UPDATE ON noemia_triage_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_noemia_triage_summaries_updated_at();
