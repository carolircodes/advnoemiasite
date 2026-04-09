-- Criar tabela para eventos de automação por palavra-chave
CREATE TABLE IF NOT EXISTS keyword_automation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  theme TEXT NOT NULL,
  area TEXT NOT NULL,
  dm_sent BOOLEAN NOT NULL DEFAULT false,
  session_created BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_comment_id ON keyword_automation_events(comment_id);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_user_id ON keyword_automation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_keyword ON keyword_automation_events(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_theme ON keyword_automation_events(theme);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_processed_at ON keyword_automation_events(processed_at);

-- Comentários
COMMENT ON TABLE keyword_automation_events IS 'Eventos de automação por palavra-chave em comentários do Instagram';
COMMENT ON COLUMN keyword_automation_events.comment_id IS 'ID do comentário original';
COMMENT ON COLUMN keyword_automation_events.user_id IS 'ID do usuário que comentou';
COMMENT ON COLUMN keyword_automation_events.keyword IS 'Palavra-chave detectada';
COMMENT ON COLUMN keyword_automation_events.theme IS 'Tema jurídico identificado';
COMMENT ON COLUMN keyword_automation_events.area IS 'Área jurídica';
COMMENT ON COLUMN keyword_automation_events.dm_sent IS 'Se DM foi enviado com sucesso';
COMMENT ON COLUMN keyword_automation_events.session_created IS 'Se sessão foi criada com contexto';
COMMENT ON COLUMN keyword_automation_events.processed_at IS 'Data/hora do processamento';
