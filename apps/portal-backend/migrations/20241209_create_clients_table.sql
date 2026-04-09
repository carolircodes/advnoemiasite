-- Migration: Create clients table for unified identity management
-- Fase 1.1 - Criar tabela clients
-- Objetivo: Unificar identificação de pessoas vindas de WhatsApp e Instagram

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    instagram_id VARCHAR(100) NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_instagram_id ON clients(instagram_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Garantir unicidade onde aplicável (mas permitir nulls)
-- Note: Não criamos unique constraints para permitir múltipos contatos do mesmo cliente
-- até que seja feito merge manual futuro

-- Comentários para documentação
COMMENT ON TABLE clients IS 'Tabela unificada de identidade de clientes vindos de WhatsApp, Instagram e outros canais';
COMMENT ON COLUMN clients.id IS 'Identificador único universal do cliente';
COMMENT ON COLUMN clients.name IS 'Nome completo do cliente (quando disponível)';
COMMENT ON COLUMN clients.phone IS 'Telefone com DDI (formato: +55XXXXXXXXXXX)';
COMMENT ON COLUMN clients.instagram_id IS 'ID numérico do Instagram (sem @)';
COMMENT ON COLUMN clients.email IS 'Email principal do cliente';
COMMENT ON COLUMN clients.created_at IS 'Data de primeira identificação do cliente';
COMMENT ON COLUMN clients.updated_at IS 'Data da última atualização dos dados do cliente';
