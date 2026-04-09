-- Estrutura para automação de comentários do Instagram
-- FASE 1: Tabelas de campanhas e eventos

-- Tabela de campanhas de palavra-chave por conteúdo
CREATE TABLE IF NOT EXISTS comment_keyword_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(20) NOT NULL DEFAULT 'instagram',
  media_id VARCHAR(255) NOT NULL,
  theme VARCHAR(50) NOT NULL,
  area VARCHAR(50) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  public_reply_template TEXT NOT NULL,
  dm_opening_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT comment_campaigns_platform_check CHECK (platform IN ('instagram')),
  CONSTRAINT comment_campaigns_theme_check CHECK (theme IN ('aposentadoria', 'previdenciario', 'bancario', 'consumidor', 'familia', 'divorcio', 'pensao', 'trabalhista', 'civil')),
  CONSTRAINT comment_campaigns_area_check CHECK (area IN ('previdenciario', 'bancario', 'familia', 'civil', 'consumidor', 'trabalhista')),
  CONSTRAINT comment_campaigns_unique_media_keyword UNIQUE (media_id, keyword)
);

-- Índices para performance
CREATE INDEX idx_comment_campaigns_platform ON comment_keyword_campaigns(platform);
CREATE INDEX idx_comment_campaigns_media_id ON comment_keyword_campaigns(media_id);
CREATE INDEX idx_comment_campaigns_theme ON comment_keyword_campaigns(theme);
CREATE INDEX idx_comment_campaigns_area ON comment_keyword_campaigns(area);
CREATE INDEX idx_comment_campaigns_active ON comment_keyword_campaigns(is_active);

-- Tabela de eventos de comentários processados
CREATE TABLE IF NOT EXISTS comment_keyword_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(20) NOT NULL DEFAULT 'instagram',
  comment_id VARCHAR(255) NOT NULL UNIQUE,
  media_id VARCHAR(255) NOT NULL,
  external_user_id VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  normalized_comment_text TEXT NOT NULL,
  keyword_matched VARCHAR(100) NOT NULL,
  public_replied BOOLEAN DEFAULT false,
  dm_sent BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES comment_keyword_campaigns(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadados do comentário
  username VARCHAR(255),
  user_full_name VARCHAR(255),
  
  -- Status de processamento
  processing_status VARCHAR(20) DEFAULT 'pending',
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT comment_events_platform_check CHECK (platform IN ('instagram')),
  CONSTRAINT comment_events_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Índices para performance e consultas
CREATE INDEX idx_comment_events_platform ON comment_keyword_events(platform);
CREATE INDEX idx_comment_events_comment_id ON comment_keyword_events(comment_id);
CREATE INDEX idx_comment_events_media_id ON comment_keyword_events(media_id);
CREATE INDEX idx_comment_events_user_id ON comment_keyword_events(external_user_id);
CREATE INDEX idx_comment_events_keyword ON comment_keyword_events(keyword_matched);
CREATE INDEX idx_comment_events_campaign ON comment_keyword_events(campaign_id);
CREATE INDEX idx_comment_events_status ON comment_keyword_events(processing_status);
CREATE INDEX idx_comment_events_created ON comment_keyword_events(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comment_campaigns_updated_at 
  BEFORE UPDATE ON comment_keyword_campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Exemplo de campanha para reel real de aposentadoria
INSERT INTO comment_keyword_campaigns (
  platform,
  media_id,
  theme,
  area,
  keyword,
  public_reply_template,
  dm_opening_template,
  is_active
) VALUES (
  'instagram',
  'reel_aposentadoria_direito_2024', -- ID real do reel sobre aposentadoria
  'aposentadoria',
  'previdenciario',
  'aposentadoria',
  'Vou te explicar melhor no direct agora 💬',
  'Oi! Vi seu comentário no vídeo sobre aposentadoria 😊

Muita gente nessa situação acaba deixando de investigar uma possibilidade importante justamente por achar que não se encaixa, quando às vezes o detalhe que faz diferença está no histórico do caso.

Me conta: você está começando a entender isso agora ou já buscou alguma orientação antes?',
  true
);

-- Exemplo de campanha para reel sobre banco
INSERT INTO comment_keyword_campaigns (
  platform,
  media_id,
  theme,
  area,
  keyword,
  public_reply_template,
  dm_opening_template,
  is_active
) VALUES (
  'instagram',
  'reel_banco_cobranca_2024', -- ID real do reel sobre cobranças bancárias
  'bancario',
  'bancario',
  'banco',
  'Te enviei uma mensagem no direct com mais detalhes ✨',
  'Oi! Vi seu comentário sobre cobranças do banco 🏦

O que pouca gente sabe é que muitos descontos e cobranças indevidas podem ser revertidos, mesmo que pareçam normais à primeira vista. As instituições financeiras contam com as pessoas não questionarem.

Você já tentou contestar essa cobrança diretamente com o banco?',
  true
);

-- Exemplo de campanha para reel sobre família/pensão
INSERT INTO comment_keyword_campaigns (
  platform,
  media_id,
  theme,
  area,
  keyword,
  public_reply_template,
  dm_opening_template,
  is_active
) VALUES (
  'instagram',
  'reel_familia_pensao_2024', -- ID real do reel sobre pensão alimentícia
  'familia',
  'familia',
  'pensão',
  'Vou te explicar melhor no direct agora 💬',
  'Oi! Vi seu comentário sobre pensão alimentícia 👨‍👩‍👧‍👦

A questão da pensão é mais delicada do que parece, e muitas vezes o que está sendo pago (ou não pago) não reflete o que a lei realmente determina para cada situação específica.

Você já fez algum cálculo do valor que deveria estar recebendo ou pagando?',
  true
);
