# Fase 3 - Unificar WhatsApp + Instagram da Mesma Pessoa (IMPLEMENTADA)

## OBJETIVO
Permitir que múltiplos canais pertençam ao mesmo cliente, com unificação segura e controlada, SEM ALTERAR o comportamento da IA.

## IMPLEMENTAÇÃO CONCLUÍDA

### 1. SUPORTE A MERGE NA TABELA CLIENTS
**Arquivo:** `migrations/20241209_add_merge_support_to_clients.sql`

#### Campos Adicionados
```sql
ALTER TABLE clients 
ADD COLUMN merged_into_client_id UUID NULL REFERENCES clients(id),
ADD COLUMN merge_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (merge_status IN ('active', 'merged'));
```

#### Índices Criados
- `idx_clients_merged_into_client_id` (para buscar merges)
- `idx_clients_merge_status` (para filtrar ativos/mergeados)
- `idx_clients_merged_status_with_target` (para consultas de merge)

#### Função SQL Canônica
```sql
CREATE OR REPLACE FUNCTION get_canonical_client_id(client_uuid UUID)
RETURNS UUID AS $$
-- Resolve cadeias de merge com proteção contra loops infinitos
```

#### Trigger de Segurança
- `check_merge_circular_reference`: evita ciclos e merge em clientes já mergeados

### 2. SERVIÇO DE MERGE CRIADO
**Arquivo:** `lib/services/client-merge.ts`

#### Função Principal: mergeClients
```typescript
async mergeClients(input: MergeClientsInput): Promise<MergeClientsOutput>
```

**Etapas do Merge:**
1. **Validação:** clientes existentes e ativos
2. **Conflito:** verifica duplicidade de canais
3. **Move client_channels:** do source para target
4. **Move conversation_sessions:** do source para target
5. **Move client_pipeline:** do source para target (se target não tiver)
6. **Marca source:** como `merged` com `merged_into_client_id`

#### Função: linkChannelToExistingClient
```typescript
async linkChannelToExistingClient(input: LinkChannelToExistingClientInput): Promise<LinkChannelToExistingClientOutput>
```

**Ações possíveis:**
- `linked`: canal vinculado com sucesso
- `conflict`: canal já existe em outro cliente
- `merged`: merge automático se apropriado
- `error`: erro na operação

#### Função: getCanonicalClientId
```typescript
async getCanonicalClientId(clientId: string): Promise<string>
```
- Resolve cadeias de merge
- Retorna sempre o cliente principal
- Usa função SQL com proteção contra loops

### 3. RESOLUÇÃO AUTOMÁTICA DE CLIENTE CANÔNICO
**Arquivo modificado:** `lib/services/client-identity.ts`

**Integração no fluxo:**
```typescript
// Ao encontrar canal existente
const canonicalClientId = await clientMergeService.getCanonicalClientId(existingChannel.client_id);

// Se foi mergeado, buscar dados do cliente canônico
if (canonicalClientId !== existingChannel.client_id) {
  const { data: canonicalClient } = await this.supabase
    .from('clients')
    .select('*')
    .eq('id', canonicalClientId)
    .single();
}
```

**Resultado:** Sistema sempre trabalha com o cliente canônico, mesmo após merges.

### 4. API DE TESTE E CONTROLE
**Arquivo:** `app/api/internal/clients/merge/route.ts`

#### Endpoints Disponíveis
- **POST `/api/internal/clients/merge`**
  - `action: "merge"` - fundir dois clientes
  - `action: "linkChannel"` - vincular canal a cliente
  - `action: "getCanonical"` - obter cliente canônico
  - `action: "getClientChannels"` - buscar canais canônicos
  - `action: "getClientPipeline"` - buscar pipeline canônico

- **GET `/api/internal/clients/merge`**
  - `action: "getCanonical"` - consulta cliente canônico
  - `action: "getClientChannels"` - consulta canais
  - `action: "getClientPipeline"` - consulta pipeline

## FLUXO DE UNIFICAÇÃO IMPLEMENTADO

### CENÁRIO 1: MESMA PESSOA NO WHATSAPP E INSTAGRAM
```
1. Pessoa entra pelo WhatsApp -> client_id: abc criado
2. Mesma pessoa entra pelo Instagram -> client_id: def criado
3. Operador detecta duplicidade -> chama mergeClients
4. mergeClients(abc, def):
   - Move canal Instagram para client abc
   - Move sessões Instagram para client abc
   - Marca client def como merged_into: abc
5. Sistema resolve automaticamente para abc canônico
```

### CENÁRIO 2: VINCULAR CANAL A CLIENTE EXISTENTE
```
1. Cliente existente com WhatsApp
2. Novo contato pelo Instagram
3. Operador usa linkChannelToExistingClient:
   - Verifica se Instagram já existe
   - Se não existir: vincula ao cliente existente
   - Se existir em outro cliente: retorna conflito
4. Se necessário, fazer merge manual
```

### CENÁRIO 3: RESOLUÇÃO AUTOMÁTICA
```
1. Mensagem chega do Instagram
2. Sistema busca client_channels
3. Encontra canal vinculado ao client_id: def
4. getCanonicalClientId(def) -> abc (def foi mergeado)
5. Sistema trabalha com cliente abc canônico
6. Sessão criada/atualizada com client_id: abc
```

## LOGS IMPLEMENTADOS (Fase 3.7)

### Logs de Merge
- `CLIENT_MERGE_START` - início do processo de merge
- `CLIENT_MERGE_COMPLETED` - merge concluído com sucesso
- `CLIENT_MERGE_SKIPPED` - merge não executado (conflito, etc)

### Logs de Vinculação
- `CHANNEL_LINK_START` - início de vinculação de canal
- `CHANNEL_LINK_CREATED` - canal vinculado com sucesso
- `CHANNEL_LINK_CONFLICT` - conflito detectado
- `CHANNEL_LINK_MERGED` - merge executado durante vinculação

### Logs de Resolução
- `CLIENT_CANONICAL_RESOLVED` - cliente canônico resolvido

## GARANTIAS DE SEGURANÇA

### 1. NÃO ALTERA COMPORTAMENTO DA IA
- **Noêmia Core:** sem alterações
- **Respostas:** idênticas
- **Lógica:** preservada 100%

### 2. CONTROLE DE MERGE
- **Sem merge automático por heurística fraca**
- **Apenas merge manual/controlado**
- **Validação de conflitos antes de merge**
- **Proteção contra ciclos e referências circulares**

### 3. INTEGRIDADE DE DADOS
- **Índice único evita duplicação de canais**
- **Trigger evita ciclos de merge**
- **Função canônica resolve cadeias com segurança**
- **Dados originais preservados (marcados como merged)**

### 4. BUILD APROVADO
```bash
npm run build  # OK sem erros
npm run lint   # OK sem warnings
```

## VALIDAÇÃO

### Fluxos Testados
- **WhatsApp:** continua funcionando
- **Instagram:** continua funcionando
- **Sessões mergeadas:** resolvem para cliente canônico
- **Novos canais:** vinculados corretamente
- **Conflitos:** detectados e reportados

### Exemplos de Uso da API
```javascript
// Merge de clientes
POST /api/internal/clients/merge
{
  "action": "merge",
  "sourceClientId": "client-abc",
  "targetClientId": "client-def",
  "reason": "Mesma pessoa identificada manualmente"
}

// Vincular canal
POST /api/internal/clients/merge
{
  "action": "linkChannel",
  "clientId": "client-abc",
  "channel": "instagram",
  "externalUserId": "17841435789"
}

// Obter cliente canônico
GET /api/internal/clients/merge?clientId=client-def&action=getCanonical
```

## ESTRUTURA CRIADA

### RELACIONAMENTO COMPLETO
```
clients (active) -----> (N) client_channels
   |                      |
   |                      | (channel + external_user_id único)
   |                      |
   v                      v
clients (merged) ----> conversation_sessions
   |
   v
client_pipeline
```

### CAMINHO DE RESOLUÇÃO
```
client_id_original -> getCanonicalClientId() -> client_id_canonical
```

## PRÓXIMOS PASSOS (FUTUROS)

**NÃO implementados nesta fase:**
- IA lendo status do processo
- IA personalizando resposta com base no painel
- Merge automático por heurística
- UI complexa de merge

**Base criada para:**
- Unificação inteligente de contatos
- Análise de jornada unificada
- Painel de gestão de clientes
- Métricas consolidadas

## ARQUIVOS CRIADOS/MODIFICADOS

### Novos arquivos
1. `migrations/20241209_add_merge_support_to_clients.sql`
2. `lib/services/client-merge.ts`
3. `app/api/internal/clients/merge/route.ts`
4. `CLIENT_MERGE_UNIFICATION_IMPLEMENTATION.md` (este)

### Arquivos modificados
1. `lib/services/client-identity.ts`
   - Importado `clientMergeService`
   - Integrado resolução de cliente canônico
   - Logs adicionados

## RESUMO

**Fase 3 concluída com sucesso:**
- Estrutura de merge implementada
- Unificação segura de canais
- Resolução automática de cliente canônico
- API de controle criada
- Sistema atual preservado
- Build aprovado
- Logs completos

**Sistema pronto para unificação controlada** de múltiplos canais do mesmo cliente.
