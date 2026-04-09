-- Migration: Add merge support to clients table
-- Fase 3.2 - Ajustar tabela clients para suportar merge

-- Adicionar campos de merge à tabela clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS merged_into_client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS merge_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (merge_status IN ('active', 'merged'));

-- Criar índices para performance e consultas de merge
CREATE INDEX IF NOT EXISTS idx_clients_merged_into_client_id 
ON clients(merged_into_client_id);

CREATE INDEX IF NOT EXISTS idx_clients_merge_status 
ON clients(merge_status);

-- Criar índice composto para encontrar clientes que foram mergeados
CREATE INDEX IF NOT EXISTS idx_clients_merged_status_with_target 
ON clients(merge_status, merged_into_client_id) 
WHERE merge_status = 'merged';

-- Criar trigger para evitar ciclos de merge (não permitir merge circular)
CREATE OR REPLACE FUNCTION prevent_merge_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o target client já foi mergeado em outro cliente
    IF NEW.merged_into_client_id IS NOT NULL THEN
        -- Verificar se o target está ativo
        PERFORM 1 FROM clients 
        WHERE id = NEW.merged_into_client_id 
        AND merge_status = 'active';
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot merge into a client that is already merged';
        END IF;
        
        -- Verificar se o target não tem um merged_into_client_id (evitar ciclos)
        IF EXISTS (
            SELECT 1 FROM clients 
            WHERE id = NEW.merged_into_client_id 
            AND merged_into_client_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Circular merge reference detected';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para validação de merge
CREATE TRIGGER check_merge_circular_reference
    BEFORE UPDATE OF merged_into_client_id, merge_status
    ON clients
    FOR EACH ROW
    WHEN (OLD.merged_into_client_id IS DISTINCT FROM NEW.merged_into_client_id 
          OR OLD.merge_status IS DISTINCT FROM NEW.merge_status)
    EXECUTE FUNCTION prevent_merge_circular_reference();

-- Comentários para documentação
COMMENT ON COLUMN clients.merged_into_client_id IS 'ID do cliente principal para o qual este cliente foi mergeado (apenas se merge_status = merged)';
COMMENT ON COLUMN clients.merge_status IS 'Status do cliente: active (normal) ou merged (incorporado em outro cliente)';
COMMENT ON CONSTRAINT check_merge_circular_reference IS 'Evita referências circulares e merge em clientes já mergeados';

-- Função para obter o client canônico (resolve cadeias de merge)
CREATE OR REPLACE FUNCTION get_canonical_client_id(client_uuid UUID)
RETURNS UUID AS $$
DECLARE
    current_client_id UUID := client_uuid;
    client_record RECORD;
    max_iterations INTEGER := 10;
    iteration INTEGER := 0;
BEGIN
    -- Iterar para resolver cadeias de merge (proteção contra loops infinitos)
    WHILE iteration < max_iterations LOOP
        SELECT merged_into_client_id, merge_status 
        INTO client_record.merged_into_client_id, client_record.merge_status
        FROM clients 
        WHERE id = current_client_id;
        
        -- Se não encontrou ou não está mergeado, retornar o ID atual
        IF NOT FOUND OR client_record.merge_status != 'merged' OR client_record.merged_into_client_id IS NULL THEN
            RETURN current_client_id;
        END IF;
        
        -- Avançar para o cliente principal
        current_client_id := client_record.merged_into_client_id;
        iteration := iteration + 1;
    END LOOP;
    
    -- Se atingiu limite de iterações, retornar o último encontrado (fallback de segurança)
    RAISE WARNING 'Possible merge loop detected for client %, returning last known client %', client_uuid, current_client_id;
    RETURN current_client_id;
END;
$$ LANGUAGE plpgsql;

-- Criar índice para função canônica
CREATE INDEX IF NOT EXISTS idx_clients_canonical_lookup 
ON clients(id) 
WHERE merge_status = 'active';

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 20241209_add_merge_support_to_clients: Merge support added to clients table';
    RAISE NOTICE 'Columns added: merged_into_client_id, merge_status';
    RAISE NOTICE 'Indexes created: idx_clients_merged_into_client_id, idx_clients_merge_status, idx_clients_merged_status_with_target';
    RAISE NOTICE 'Trigger created: check_merge_circular_reference';
    RAISE NOTICE 'Function created: get_canonical_client_id()';
END $$;
