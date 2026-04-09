# Fase 2 - Conectar Clientes com Conversas e Canais (IMPLEMENTADA)

## OBJETIVO
Integrar as novas tabelas (clients, client_channels, client_pipeline) com o fluxo atual de mensagens (WhatsApp e Instagram), SEM ALTERAR o comportamento da IA.

## IMPLEMENTAÇÃO CONCLUÍDA

### 1. TABELAS ADICIONAIS CRIADAS
**Arquivo:** `migrations/20241209_create_client_channels_and_pipeline.sql`

#### TABELA client_channels
```sql
CREATE TABLE client_channels (
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
```

**Índice único para evitar duplicação:**
```sql
CREATE UNIQUE INDEX idx_client_channels_unique 
ON client_channels(channel, external_user_id) 
WHERE is_active = true;
```

#### TABELA client_pipeline
```sql
CREATE TABLE client_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'new_lead',
    lead_temperature VARCHAR(20) NOT NULL DEFAULT 'cold',
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
```

### 2. SERVIÇO DE IDENTIDADE CRIADO
**Arquivo:** `lib/services/client-identity.ts`

#### Função Principal: getOrCreateClientAndChannel
```typescript
async getOrCreateClientAndChannel(input: GetOrCreateClientAndChannelInput): Promise<GetOrCreateClientAndChannelOutput>
```

**Regras implementadas:**
1. **Procurar em client_channels:** where channel + external_user_id
2. **Se encontrar:** retorna client_id
3. **Se não encontrar:**
   - Criar novo client (clients)
   - Criar vínculo (client_channels)
   - Criar pipeline (client_pipeline)
4. **Garantir unicidade:** índice único (channel + external_user_id)

#### Logs Implementados
- `CLIENT_IDENTITY_START`
- `CLIENT_CHANNEL_FOUND`
- `CLIENT_CREATED`
- `CLIENT_CHANNEL_CREATED`
- `PIPELINE_CREATED`
- `PIPELINE_UPDATED`
- `CLIENT_LINKED_TO_SESSION`

### 3. PIPELINE AUTOMÁTICO
**Criação automática ao identificar novo cliente:**
```typescript
// Criar pipeline com valores padrão
{
  stage: 'new_lead',
  lead_temperature: 'cold',
  source_channel: canal_recebido,
  first_contact_at: now(),
  last_contact_at: now()
}
```

**Atualização automática:**
- `last_contact_at` atualizado em cada contato
- Mantém histórico completo

### 4. INTEGRAÇÃO COM SESSÕES
**Arquivo modificado:** `lib/services/conversation-persistence.ts`

**Fluxo implementado:**
```typescript
// Fase 2.2 - Primeiro, obter/criar identidade do cliente e canal
let clientIdentity = null;

if (channel === 'whatsapp' || channel === 'instagram') {
  clientIdentity = await clientIdentityService.getOrCreateClientAndChannel({
    channel,
    externalUserId,
    externalThreadId
  });
}

// Vincular client_id à sessão
if (clientIdentity) {
  newSessionData.client_id = clientIdentity.client.id;
}
```

**Regras de vinculação:**
- **Sessão existente sem client_id:** atualiza automaticamente
- **Sessão nova:** já cria com client_id
- **Fallback:** continua funcionando sem client_id

## FLUXO COMPLETO IMPLEMENTADO

### NOVA MENSAGEM WHATSAPP/INSTAGRAM
```
1. getOrCreateSession() chamado
2. getOrCreateClientAndChannel() executado
   2.1 Busca client_channels (channel + external_user_id)
   2.2 Se não encontra: cria client + client_channel + pipeline
   2.3 Se encontra: atualiza last_contact_at
3. Sessão criada/atualizada com client_id
4. Log completo de todas as etapas
```

### EXEMPLO DE LOGS
```
CLIENT_IDENTITY_START: { channel: 'whatsapp', externalUserId: '+5511999998888' }
CLIENT_CHANNEL_NOT_FOUND - CREATING NEW
CLIENT_CREATED: { clientId: 'abc-123', channel: 'whatsapp' }
CLIENT_CHANNEL_CREATED: { channelId: 'def-456', clientId: 'abc-123' }
PIPELINE_CREATED: { pipelineId: 'ghi-789', stage: 'new_lead' }
CLIENT_LINKED_TO_NEW_SESSION: { sessionId: 'jkl-012', clientId: 'abc-123' }
```

## GARANTIAS DE SEGURANÇA

### 1. NÃO ALTERA COMPORTAMENTO DA IA
- **Noêmia Core:** sem alterações
- **Respostas:** idênticas
- **Lógica:** preservada 100%

### 2. NÃO QUEBRA WEBHOOKS
- **WhatsApp:** usa getOrCreateSession (agora com identidade)
- **Instagram:** usa getOrCreateSession (agora com identidade)
- **Fallback:** funciona sem client_id se der erro

### 3. EVITA DUPLICAÇÃO
- **Índice único:** (channel + external_user_id)
- **Busca antes de criar:** nunca duplica
- **is_active flag:** controle de canais inativos

### 4. BUILD APROVADO
```bash
npm run build  # OK sem erros
npm run lint   # OK sem warnings
```

## VALIDAÇÃO

### Fluxos Testados
- **WhatsApp:** continua respondendo normalmente
- **Instagram:** continua respondendo normalmente
- **Site/Portal:** sem alterações
- **Sessões existentes:** vinculação automática
- **Novos clientes:** pipeline criado automaticamente

### Logs Implementados
Todos os logs da Fase 2.5 funcionando:
- CLIENT_IDENTITY_START
- CLIENT_CHANNEL_FOUND
- CLIENT_CREATED
- CLIENT_CHANNEL_CREATED
- PIPELINE_CREATED
- PIPELINE_UPDATED
- CLIENT_LINKED_TO_SESSION

## ESTRUTURA CRIADA

### RELACIONAMENTO COMPLETO
```
clients (1) -----> (N) client_channels
   |                    |
   |                    | (channel + external_user_id único)
   |                    |
   |                    v
   |              conversation_sessions (client_id)
   |
   v
client_pipeline (1 por client)
```

### DADOS CAPTURADOS AUTOMATICAMENTE
- **Cliente:** name, phone, instagram_id, email
- **Canal:** channel, external_user_id, external_thread_id, last_contact_at
- **Pipeline:** stage, lead_temperature, source_channel, first_contact_at, last_contact_at

## PRÓXIMOS PASSOS (FUTUROS)

**NÃO implementados nesta fase:**
- Unificação Instagram + WhatsApp do mesmo usuário
- Leitura de pipeline pela IA
- Uso de dados do cliente nas respostas
- Merge de clientes duplicados

**Base criada para:**
- Unificação inteligente de contatos
- Análise de jornada por cliente
- Pipeline management
- Métricas de conversão por canal

## ARQUIVOS CRIADOS/MODIFICADOS

### Novos arquivos
1. `migrations/20241209_create_client_channels_and_pipeline.sql`
2. `lib/services/client-identity.ts`
3. `CLIENT_CHANNELS_PIPELINE_IMPLEMENTATION.md` (este)

### Arquivos modificados
1. `lib/services/conversation-persistence.ts`
   - Importado `clientIdentityService`
   - Integrado `getOrCreateClientAndChannel` no fluxo
   - Logs adicionados

## RESUMO

**Fase 2 concluída com sucesso:**
- Canais de comunicação mapeados
- Pipeline automático implementado
- Vínculo cliente-sessão funcionando
- Sistema atual preservado
- Build aprovado
- Logs completos

**Sistema pronto para próximas fases** de unificação inteligente e análise de dados.
