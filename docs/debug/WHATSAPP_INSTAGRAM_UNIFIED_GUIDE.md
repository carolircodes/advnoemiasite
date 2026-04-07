# Sistema Unificado Instagram + WhatsApp - NoemIA

## Visão Geral
Sistema completo de gestão de leads unificado para Instagram e WhatsApp, com arquitetura modular, processamento centralizado e dashboard premium.

## Arquitetura do Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Instagram     │    │   WhatsApp       │    │   Dashboard     │
│   Webhook       │    │   Webhook        │    │   Premium       │
└────────┬────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                      │                      │
         └──────────┬───────────┘                      │
                    │                                │
         ┌─────────────────────────┐                │
         │  Message Processor      │                │
         │  (Core Unificado)       │                │
         └─────────────┬───────────┘                │
                       │                            │
         ┌─────────────────────────┐                │
         │  OpenAI GPT + Fallback  │                │
         │  (IA Híbrida)           │                │
         └─────────────┬───────────┘                │
                       │                            │
         ┌─────────────────────────┐                │
         │  Supabase               │◄───────────────┘
         │  (noemia_leads)         │
         │  (noemia_conversations) │
         └─────────────────────────┘
```

## Estrutura de Arquivos

### Core do Sistema
```
lib/platforms/
├── core.ts                    # Tipos e configurações unificadas
└── message-processor.ts        # Processamento centralizado
```

### Webhooks
```
api/
├── meta/webhook.ts            # Instagram (existente)
└── whatsapp/webhook.ts        # WhatsApp (novo)
```

### Dashboard
```
apps/portal-backend/app/internal/advogada/leads/
├── dashboard.tsx              # Dashboard atualizado
├── prioridades.tsx            # Componente de prioridades
└── page.tsx                   # Página principal
```

### APIs de Dados
```
api/internal/leads/
├── route.ts                   # CRUD de leads
└── [userId]/conversations/    # Histórico de conversas
```

## Funcionalidades Implementadas

### 1. Sistema Unificado de Plataformas
- ✅ **Core Modular**: Tipos e configurações compartilhadas
- ✅ **Message Processor**: Lógica centralizada de processamento
- ✅ **Platform Detection**: Identificação automática Instagram/WhatsApp
- ✅ **Unified Storage**: Mesmo banco para ambas plataformas

### 2. WhatsApp Cloud API Integration
- ✅ **Webhook Completo**: GET/POST com verificação e processamento
- ✅ **Message Parsing**: Extração segura de mensagens
- ✅ **Response Sending**: Envio automático via WhatsApp API
- ✅ **Signature Validation**: Segurança HMAC-SHA256

### 3. Detecção e Atualização de Leads
- ✅ **Find or Create**: Busca lead existente por telefone/ID
- ✅ **Update Logic**: Incrementa contador de conversas
- ✅ **Platform Tracking**: Mantém origem da mensagem
- ✅ **No Duplicates**: Evita duplicação de leads

### 4. Dashboard Multiplataforma
- ✅ **Platform Metrics**: Cards separados Instagram/WhatsApp
- ✅ **Platform Filter**: Filtrar por plataforma específica
- ✅ **Visual Indicators**: Ícones e cores por plataforma
- ✅ **Unified View**: Tabela única com todas as plataformas

### 5. IA Híbrida e Fallback
- ✅ **OpenAI Integration**: GPT-4o-mini com prompts especializados
- ✅ **Intelligent Fallback**: Respostas sem OpenAI
- ✅ **Platform Adaptation**: Mensagens otimizadas por plataforma
- ✅ **Memory System**: Contexto de conversação

## Configuração de Ambiente

### Variáveis de Ambiente Obrigatórias
```bash
# Meta (Instagram)
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
INSTAGRAM_ACCESS_TOKEN=instagram_token_aqui

# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=whatsapp_token_aqui
WHATSAPP_PHONE_NUMBER_ID=phone_number_id_aqui

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o-mini

# Sistema
NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br
NOEMIA_WHATSAPP_URL=https://wa.me/5511999999999
```

## Configuração na Meta

### 1. Instagram (já existente)
- Webhook URL: `https://advnoemia.com.br/api/meta/webhook`
- Verify Token: `noeminha_verify_2026`
- App Secret: `noeminha_app_secret_2026`

### 2. WhatsApp Cloud API (novo)

#### Passo 1: Criar App no Meta for Developers
1. Acessar [Meta for Developers](https://developers.facebook.com/)
2. Criar novo app: "Business"
3. Adicionar produto: "WhatsApp"

#### Passo 2: Configurar WhatsApp
1. Obter Phone Number ID
2. Configurar Webhook:
   - URL: `https://advnoemia.com.br/api/whatsapp/webhook`
   - Verify Token: `noeminha_whatsapp_verify_2026`
   - App Secret: `noeminha_whatsapp_secret_2026`

#### Passo 3: Subscrições Webhook
Ativar eventos:
- `messages`
- `message_reactions` (opcional)

#### Passo 4: Permissões
Adicionar ao app:
- `whatsapp_business_messaging`
- `pages_read_engagement` (se necessário)

#### Passo 5: Obter Tokens
1. Gerar System User Access Token
2. Adicionar Phone Number ao app
3. Testar webhook com número de teste

## Fluxo de Processamento

### Instagram
```
Instagram DM → Webhook (/api/meta/webhook) → Message Processor → OpenAI → Response → Instagram API
```

### WhatsApp
```
WhatsApp Message → Webhook (/api/whatsapp/webhook) → Message Processor → OpenAI → Response → WhatsApp API
```

### Lógica Unificada
```
1. Parse Message (platform-specific)
2. Validate Signature
3. Check Duplicate
4. Detect Legal Area
5. Classify Lead
6. Generate AI Response
7. Find/Create Lead in Database
8. Save Conversation
9. Send Response (platform-specific)
```

## Estrutura do Banco

### noemia_leads
```sql
id (uuid, primary key)
platform (varchar) -- 'instagram' | 'whatsapp'
platform_user_id (varchar) -- ID único da plataforma
username (varchar) -- @username ou nome
legal_area (enum) -- previdenciario/bancario/familia/geral
lead_status (enum) -- frio/curioso/interessado/quente/pronto_para_agendar/cliente_ativo/sem_aderencia
funnel_stage (enum) -- contato_inicial/qualificacao/triagem/interesse/agendamento/cliente
urgency (enum) -- baixa/media/alta
last_message (text)
last_response (text)
wants_human (boolean)
should_schedule (boolean)
summary (text)
suggested_action (text)
first_contact_at (timestamp)
last_contact_at (timestamp)
conversation_count (integer)
metadata (jsonb)
```

### noemia_conversations
```sql
id (uuid, primary key)
platform (varchar) -- 'instagram' | 'whatsapp'
platform_user_id (varchar)
username (varchar)
event_type (enum) -- message/comment/postback
message_id (varchar)
user_text (text)
ai_response (text)
legal_area (varchar)
lead_status (varchar)
funnel_stage (varchar)
urgency (varchar)
wants_human (boolean)
should_schedule (boolean)
metadata (jsonb)
created_at (timestamp)
```

## Dashboard Premium

### Métricas Multiplataforma
- **Total**: Todos os leads
- **Instagram**: Leads via Instagram
- **WhatsApp**: Leads via WhatsApp
- **Quentes**: Leads quentes (todas plataformas)
- **Prontos para Agendar**: Prontos (todas plataformas)

### Filtros Avançados
- **Plataforma**: Instagram/WhatsApp/Todas
- **Área Jurídica**: Previdenciário/Bancário/Família/Geral
- **Urgência**: Baixa/Média/Alta
- **Status**: Frio/Curioso/Interessado/Quente/Pronto/Cliente
- **Funil**: Contato/Qualificação/Triagem/Interesse/Agendamento/Cliente

### Visual por Plataforma
- **Instagram**: 📷 Cor rosa (#E1306C)
- **WhatsApp**: 💬 Cor verde (#25D366)
- **Badges**: Indicadores visuais na tabela
- **Identificação**: Nome + plataforma + ID

## Detecção de Áreas Jurídicas

### Previdenciário
- Palavras-chave: aposentadoria, inss, benefício, auxílio, aposentar
- System Prompt: Foco em direito previdenciário

### Bancário
- Palavras-chave: banco, empréstimo, juros, cobrança, financiamento
- System Prompt: Foco em direito bancário e consumidor

### Família
- Palavras-chave: divórcio, pensão, guarda, filhos, casamento
- System Prompt: Foco em direito de família

### Geral
- Fallback para outras questões
- System Prompt: Resposta geral profissional

## Classificação de Leads

### Status
- **Frio**: Contato inicial sem engajamento
- **Curioso**: Faz perguntas básicas
- **Interessado**: Demonstra interesse real
- **Quente**: Dor concreta, boa chance de conversão
- **Pronto para Agendar**: Intenção clara de consulta
- **Cliente Ativo**: Já é cliente
- **Sem Aderência**: Sem fit com serviços

### Urgência
- **Baixa**: Sem urgência aparente
- **Média**: Prazo normal de atendimento
- **Alta**: Urgente, necessidade rápida

### Funil
- **Contato Inicial**: Primeira interação
- **Qualificação**: Coleta de informações
- **Triagem**: Análise do caso
- **Interesse**: Demonstrou interesse
- **Agendamento**: Pronto para consulta
- **Cliente**: Já contratou

## Respostas da IA

### Estrutura Padrão
```
[Contexto Inicial] + [Fatores Importantes] + [Transição para Consulta]
```

### Adaptação por Plataforma
- **Instagram**: Mensagens mais visuais, com CTAs
- **WhatsApp**: Mensagens mais diretas, texto otimizado

### Fallback Inteligente
- Funciona sem OpenAI
- Baseado em intenções detectadas
- Respostas contextuais com dados reais

## Monitoramento e Logs

### Logs Estruturados
```json
{
  "timestamp": "2026-04-06T19:00:00.000Z",
  "source": "platform-webhook",
  "platform": "whatsapp",
  "eventType": "MESSAGE_PROCESSED",
  "platformUserId": "5511999999999",
  "messageSent": true,
  "textLength": 45,
  "responseLength": 180
}
```

### Métricas de Performance
- Tempo de processamento
- Taxa de sucesso de envio
- Uso do fallback
- Conversão por plataforma

## Segurança

### Validação de Assinatura
- HMAC-SHA256 para ambos webhooks
- Tokens separados por plataforma
- Verificação timing-safe

### Proteção de Dados
- PII criptografado no banco
- Logs sem dados sensíveis
- Rate limiting implícito

## Roadmap Futuro

### Fase 2: IA Híbrida Avançada
- Contexto persistente entre plataformas
- Transferência inteligente para humano
- Análise preditiva de conversão

### Fase 3: Omnichannel Completo
- Integração com Messenger
- Chat no site
- Email automation

### Fase 4: Analytics Avançado
- Dashboard analítico
- Relatórios de conversão
- Previsão de demanda

## Testes e Validação

### Testes Unitários
- Detecção de área jurídica
- Classificação de leads
- Validação de assinatura

### Testes de Integração
- Webhook verification
- Envio de mensagens
- Conexão com Supabase

### Testes de Carga
- Múltiplas mensagens simultâneas
- Performance do dashboard
- Escalabilidade da API

## Troubleshooting

### Problemas Comuns
1. **Webhook não verificado**: Verificar token e URL
2. **Mensagem não enviada**: Validar access token
3. **Lead duplicado**: Verificar lógica de find/create
4. **Resposta vazia**: Checar OpenAI quota

### Debug Tips
- Verificar logs estruturados
- Testar webhook com curl
- Validar variáveis de ambiente
- Checar tabela no Supabase

---

## Resumo da Implementação

✅ **Arquitetura Modular** e escalável  
✅ **WhatsApp Cloud API** totalmente integrado  
✅ **Sistema Unificado** Instagram + WhatsApp  
✅ **Dashboard Premium** multiplataforma  
✅ **IA Híbrida** com fallback inteligente  
✅ **Detecção Avançada** de leads existentes  
✅ **Segurança Completa** com validação HMAC  
✅ **Logs Estruturados** para monitoramento  

**Sistema 100% production-ready para gestão omnichannel! 🚀**
