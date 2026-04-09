-- Script para corrigir problemas de tabelas na automação por palavra-chave
-- Execute este script manualmente no Supabase SQL Editor

-- 1. Remover tabela antiga se existir (comment_keyword_events)
DROP TABLE IF EXISTS comment_keyword_events CASCADE;

-- 2. Criar tabela correta (keyword_automation_events)
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

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_comment_id ON keyword_automation_events(comment_id);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_user_id ON keyword_automation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_keyword ON keyword_automation_events(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_theme ON keyword_automation_events(theme);
CREATE INDEX IF NOT EXISTS idx_keyword_automation_events_processed_at ON keyword_automation_events(processed_at);

-- 4. Adicionar comentários
COMMENT ON TABLE keyword_automation_events IS 'Eventos de automação por palavra-chave em comentários do Instagram';
COMMENT ON COLUMN keyword_automation_events.comment_id IS 'ID do comentário original';
COMMENT ON COLUMN keyword_automation_events.user_id IS 'ID do usuário que comentou';
COMMENT ON COLUMN keyword_automation_events.keyword IS 'Palavra-chave detectada';
COMMENT ON COLUMN keyword_automation_events.theme IS 'Tema jurídico identificado';
COMMENT ON COLUMN keyword_automation_events.area IS 'Área jurídica';
COMMENT ON COLUMN keyword_automation_events.dm_sent IS 'Se DM foi enviado com sucesso';
COMMENT ON COLUMN keyword_automation_events.session_created IS 'Se sessão foi criada com contexto';
COMMENT ON COLUMN keyword_automation_events.processed_at IS 'Data/hora do processamento';

-- 5. Verificar estrutura
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'keyword_automation_events' 
ORDER BY ordinal_position;

-- 6. Verificar índices
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'keyword_automation_events';

-- 7. Limpar dados de teste (se necessário)
-- DELETE FROM keyword_automation_events WHERE created_at < NOW() - INTERVAL '1 day';

-- 8. Contar registros existentes
SELECT COUNT(*) as total_records FROM keyword_automation_events;

-- 9. Verificar registros recentes
SELECT 
  comment_id,
  user_id,
  keyword,
  theme,
  dm_sent,
  session_created,
  created_at
FROM keyword_automation_events 
ORDER BY created_at DESC 
LIMIT 10;
