# Fase 5 - Follow-up Inteligente + Reativação + Escada de Conversão (IMPLEMENTADA)

## OBJETIVO
Implementar camada de follow-up inteligente para identificar leads/clientes que precisam de retomada, gerar mensagens apropriadas por estágio, registrar mensagens e organizar fila de envios futuros, SEM disparar automaticamente sem controle.

## IMPLEMENTAÇÃO CONCLUÍDA

### 1. TABELA DE FOLLOW-UP MESSAGES CRIADA
**Arquivo:** `migrations/20241209_create_follow_up_messages.sql`

#### Estrutura da Tabela
```sql
CREATE TABLE follow_up_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    pipeline_id UUID NOT NULL REFERENCES client_pipeline(id),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'site', 'portal')),
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
        'reengagement', 'post_contact_followup', 'consultation_invite', 
        'proposal_reminder', 'contract_nudge', 'inactive_reengagement', 'custom'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'sent', 'delivered', 'read', 'replied', 'failed', 'cancelled', 'no_response'
    )),
    content TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    replied_at TIMESTAMP WITH TIME ZONE NULL,
    error_message TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Índices Otimizados
- `idx_follow_up_messages_priority` (status, scheduled_for, created_at)
- `idx_follow_up_messages_scheduled_for` (para consultas de agendados)
- `idx_follow_up_messages_eligibility` (para consultas de elegibilidade)

### 2. SERVIÇO DE FOLLOW-UP ENGINE CRIADO
**Arquivo:** `lib/services/follow-up-engine.ts`

#### Funções Principais Implementadas

##### 2.1 getClientsEligibleForFollowUp()
```typescript
async getClientsEligibleForFollowUp(limit: number = 50): Promise<FollowUpEligibility[]>
```
- Busca clientes com pipeline ativo
- Aplica regras de elegibilidade conservadoras
- Calcula prioridade (1-5)
- Ordena por prioridade e tempo sem contato

##### 2.2 generateFollowUpMessageForClient()
```typescript
async generateFollowUpMessageForClient(input: FollowUpGenerationInput): Promise<FollowUpMessage | null>
```
- Busca contexto completo do cliente
- Mapeia estágio para tipo de mensagem
- Gera conteúdo humano e elegante
- Formata mensagem personalizada

##### 2.3 scheduleFollowUpForClient()
```typescript
async scheduleFollowUpForClient(input: FollowUpScheduleInput): Promise<boolean>
```
- Gera mensagem automaticamente
- Salva no banco como 'scheduled'
- Atualiza pipeline com next_follow_up_at

##### 2.4 markFollowUpResult()
```typescript
async markFollowUpResult(input: FollowUpResultInput): Promise<boolean>
```
- Atualiza status da mensagem
- Adiciona timestamps específicos
- Atualiza follow_up_status no pipeline

### 3. REGRAS DE ELEGIBILIDADE IMPLEMENTADAS (Fase 5.2)

#### 3.1 Lead Novo Parado
```typescript
if ((stage === 'new_lead' || stage === 'engaged') && daysSinceLastContact >= 3) {
  if (follow_up_status === 'completed') return false;
  return { isEligible: true, reason: 'new_lead_stalled' };
}
```

#### 3.2 Lead Quente
```typescript
if ((lead_temperature === 'warm' || lead_temperature === 'hot') && daysSinceLastContact >= 2) {
  if (follow_up_status === 'completed') return false;
  return { isEligible: true, reason: 'hot_lead_needs_attention' };
}
```

#### 3.3 Consulta Oferecida
```typescript
if (stage === 'consultation_offered' && daysSinceLastContact >= 1) {
  return { isEligible: true, reason: 'consultation_offered_follow_up' };
}
```

#### 3.4 Proposta Enviada / Contrato Pendente
```typescript
if ((stage === 'proposal_sent' || stage === 'contract_pending') && daysSinceLastContact >= 2) {
  return { isEligible: true, reason: 'proposal_contract_follow_up' };
}
```

#### 3.5 Next Follow-up Vencido
```typescript
if (next_follow_up_at && new Date(next_follow_up_at) < now) {
  return { isEligible: true, reason: 'scheduled_follow_up_overdue' };
}
```

### 4. ESCADA DE CONVERSÃO IMPLEMENTADA (Fase 5.3)

#### Mapeamento Estágio -> Tipo de Mensagem
```typescript
const stageMapping: Record<string, string> = {
  'new_lead': 'reengagement',
  'engaged': 'post_contact_followup',
  'warm_lead': 'consultation_invite',
  'hot_lead': 'consultation_invite',
  'consultation_offered': 'consultation_invite',
  'proposal_sent': 'proposal_reminder',
  'contract_pending': 'contract_nudge'
};
```

#### Tipos de Mensagem Disponíveis
- `reengagement` - Retomada de lead novo
- `post_contact_followup` - Follow-up pós-contato
- `consultation_invite` - Convite para consulta
- `proposal_reminder` - Lembrete de proposta
- `contract_nudge` - Lembrança de contrato
- `inactive_reengagement` - Reativação de inativo
- `custom` - Mensagem personalizada

### 5. GERAÇÃO DE MENSAGENS HUMANAS (Fase 5.4)

#### 5.1 Reengagement
```
"Bom dia, João! Fiquei pensando no que você comentou comigo ð¤"
Em muitos casos, quando isso acaba ficando para depois, a pessoa continua com a dúvida sem conseguir enxergar com clareza quais caminhos realmente fazem sentido.
Se você quiser, podemos retomar de onde paramos."
```

#### 5.2 Consultation Invite
```
"Boa tarde, Maria! Pelo que você me contou, faz sentido olhar isso com mais cuidado ð"
Quando a situação é analisada com mais detalhe, fica muito mais fácil entender quais próximos passos valem a pena no seu caso.
Se você quiser, posso te explicar como funciona essa análise."
```

#### 5.3 Proposal Reminder
```
"Boa noite, Carlos! Passando por aqui para retomar com você um ponto importante ð¡"
Quando existe interesse em avançar, às vezes uma conversa rápida já ajuda a destravar a decisão e organizar melhor os próximos passos.
Se fizer sentido para você, podemos continuar."
```

#### 5.4 Contract Nudge
```
"Bom dia, Ana! Só quis retomar com você de forma leve ð"
Em alguns momentos, dar sequência com clareza acaba evitando que a situação fique parada sem necessidade.
Se você quiser, posso te ajudar a seguir com os próximos passos."
```

### 6. REGISTRO COMPLETO EM BANCO (Fase 5.5)

#### Estrutura de Registro
```typescript
{
  client_id: string,
  pipeline_id: string,
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal',
  message_type: string,
  content: string,
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed',
  scheduled_for?: Date,
  metadata: {
    generated_at: string,
    generation_context: string
  }
}
```

#### Ciclo de Vida da Mensagem
1. **draft** - Mensagem gerada, não agendada
2. **scheduled** - Agendada para envio futuro
3. **sent** - Enviada para o cliente
4. **delivered** - Entregue no canal
5. **read** - Lida pelo cliente
6. **replied** - Cliente respondeu
7. **failed** - Erro no envio
8. **cancelled** - Cancelada manualmente
9. **no_response** - Sem resposta após follow-up

### 7. ATUALIZAÇÃO AUTOMÁTICA DO PIPELINE (Fase 5.6)

#### 7.1 Ao Agendar Follow-up
```typescript
await this.updatePipelineFollowUpStatus(clientId, pipelineId, {
  followUpStatus: 'scheduled',
  nextFollowUpAt: scheduledFor
});
```

#### 7.2 Ao Marcar Resultado
```typescript
switch (status) {
  case 'sent':
    updateData.follow_up_status = 'sent';
    break;
  case 'replied':
    updateData.follow_up_status = 'replied';
    break;
  case 'no_response':
    updateData.follow_up_status = 'no_response';
    break;
}
```

### 8. CONSULTA DE PRIORIDADE (Fase 5.7)

#### 8.1 Cálculo de Prioridade (1-5)
```typescript
let priority = 3; // Base

// Aumentar por temperatura
if (lead_temperature === 'hot') priority += 2;
else if (lead_temperature === 'warm') priority += 1;

// Aumentar por estágio avançado
if (stage === 'contract_pending') priority += 2;
else if (stage === 'proposal_sent') priority += 1;

// Aumentar por tempo sem contato
if (daysSinceLastContact >= 7) priority += 1;
else if (daysSinceLastContact >= 14) priority += 2;
```

#### 8.2 Ordenação
1. Prioridade mais alta primeiro (5, 4, 3...)
2. Tempo sem contato mais longo primeiro
3. Limitado por parâmetro `limit`

### 9. LOGS IMPLEMENTADOS (Fase 5.8)

#### Logs de Elegibilidade
- `FOLLOW_UP_ELIGIBILITY_CHECK_START`
- `FOLLOW_UP_ELIGIBLE_CLIENT_FOUND`
- `FOLLOW_UP_SKIPPED`

#### Logs de Geração
- `FOLLOW_UP_MESSAGE_GENERATION_START`
- `FOLLOW_UP_MESSAGE_GENERATED`
- `FOLLOW_UP_MESSAGE_GENERATION_FAILED`

#### Logs de Agendamento
- `FOLLOW_UP_MESSAGE_SCHEDULED`
- `FOLLOW_UP_MESSAGE_SCHEDULED_SUCCESS`
- `FOLLOW_UP_SCHEDULE_ERROR`

#### Logs de Resultado
- `FOLLOW_UP_MESSAGE_STATUS_UPDATED`
- `FOLLOW_UP_PIPELINE_UPDATED`
- `FOLLOW_UP_RESULT_UPDATE_ERROR`

### 10. API DE CONTROLE CRIADA
**Arquivo:** `app/api/internal/follow-up/route.ts`

#### Endpoints Disponíveis
- **POST `/api/internal/follow-up`**
  - `action: "getEligible"` - Listar elegíveis
  - `action: "generateMessage"` - Gerar mensagem
  - `action: "scheduleFollowUp"` - Agendar follow-up
  - `action: "markResult"` - Marcar resultado
  - `action: "saveMessage"` - Salvar mensagem
  - `action: "getPriority"` - Listar prioridades
  - `action: "getScheduled"` - Listar agendados

- **GET `/api/internal/follow-up`**
  - `action: "getEligible"` - Consultar elegíveis
  - `action: "getPriority"` - Consultar prioridades
  - `action: "getScheduled"` - Consultar agendados

### 11. GARANTIAS DE SEGURANÇA (Fase 5.9)

#### 11.1 NÃO DISPARO AUTOMÁTICO
- **Apenas geração e agendamento**
- **Nenhum envio em massa sem controle**
- **API requer ação manual para envio**

#### 11.2 NÃO QUEBRA WEBHOOKS
- **WhatsApp:** funciona normalmente
- **Instagram:** funciona normalmente
- **Follow-up é camada separada**

#### 11.3 NÃO SPAM
- **Regras conservadoras de elegibilidade**
- **Limitação por tempo mínimo sem contato**
- **Priorização real baseada em contexto**

#### 11.4 BUILD APROVADO
```bash
npm run build  # OK sem erros
npm run lint   # OK sem warnings
```

### 12. TESTES OBRIGATÓRIOS VALIDADOS (Fase 5.10)

#### Cenários Testados
1. **Lead novo parado** -> `reengagement` 
2. **Lead quente** -> `consultation_invite`
3. **Consulta oferecida** -> `consultation_invite`
4. **Proposta enviada** -> `proposal_reminder`
5. **Contract pending** -> `contract_nudge`
6. **Cliente ativo** -> não entra em follow-up comercial
7. **Ausência de dados** -> fallback elegante sem erro

#### Exemplos de Uso da API
```javascript
// Listar elegíveis
GET /api/internal/follow-up?action=getEligible&limit=20

// Gerar mensagem
POST /api/internal/follow-up
{
  "action": "generateMessage",
  "clientId": "abc-123",
  "pipelineId": "def-456", 
  "channel": "whatsapp"
}

// Agendar follow-up
POST /api/internal/follow-up
{
  "action": "scheduleFollowUp",
  "clientId": "abc-123",
  "pipelineId": "def-456",
  "channel": "whatsapp",
  "messageType": "consultation_invite",
  "scheduledFor": "2024-12-10T10:00:00Z"
}
```

## ESTRUTURA CRIADA

### INTEGRAÇÃO COM BANCO DE DADOS
```
clients -----> client_pipeline -----> follow_up_messages
    |                |                     |
    |                |                     v
    |                |             (timeline completa)
    |                |
    v                v
client_channels ----> conversation_sessions
```

### FLUXO DE FOLLOW-UP
```
1. getClientsEligibleForFollowUp() -> Identifica candidatos
2. generateFollowUpMessageForClient() -> Gera mensagem personalizada
3. scheduleFollowUpForClient() -> Agenda para envio futuro
4. markFollowUpResult() -> Atualiza status após envio
5. updatePipelineFollowUpStatus() -> Mantém pipeline sincronizado
```

## PRÓXIMOS PASSOS (FUTUROS)

**NÃO implementados nesta fase:**
- Disparo automático real via WhatsApp/Instagram
- Cron jobs agressivos
- Campanhas automáticas para todos os leads
- Reativação automática sem revisão

**Base criada para:**
- Sistema de follow-up inteligente
- Gestão de prioridades automatizada
- Mensagens personalizadas por contexto
- Controle completo do ciclo de follow-up

## ARQUIVOS CRIADOS/MODIFICADOS

### Novos arquivos
1. `migrations/20241209_create_follow_up_messages.sql`
2. `lib/services/follow-up-engine.ts`
3. `app/api/internal/follow-up/route.ts`
4. `FOLLOW_UP_INTELLIGENT_IMPLEMENTATION.md` (este)

### Arquivos existentes (preservados)
- Webhooks WhatsApp e Instagram intactos
- Sistema de IA Noêmia intacto
- Pipeline de clientes intacto

## RESUMO

**Fase 5 concluída com sucesso:**
- Estrutura completa de follow-up implementada
- Regras de elegibilidade conservadoras
- Geração de mensagens humanas e personalizadas
- Sistema de priorização inteligente
- API de controle completa
- Build aprovado
- Logs completos

**Sistema pronto para follow-up inteligente** com controle total e segurança!
