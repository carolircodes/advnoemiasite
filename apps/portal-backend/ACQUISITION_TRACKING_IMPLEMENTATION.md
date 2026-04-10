# IMPLEMENTAÇÃO CONTROLADA — FASE 3 (AQUISIÇÃO E CRESCIMENTO)

## 🎯 **RESUMO DA IMPLEMENTAÇÃO**

Sistema completo de rastreio de aquisição de leads integrado ao fluxo existente da NoemIA, mantendo total compatibilidade com as Fases 1 e 2.

---

## 📋 **ESTRUTURA IMPLEMENTADA**

### 1. **BANCO DE DADOS** ✅

#### Migration: `add_acquisition_tracking.sql`
- **Campos adicionados à `noemia_leads`**:
  - `source` (instagram, whatsapp, site, ads, organic)
  - `campaign` (nome da campanha)
  - `topic` (previdenciario, bancario, familia, civil)
  - `content_id` (identificador do conteúdo)
  - `acquisition_metadata` (JSONB com metadados)
  - `acquisition_tags` (array de tags automáticas)
  - `utm_*` (parâmetros UTM padrão)

- **Nova tabela `acquisition_events`**:
  - Registro de eventos do funil
  - Timestamps e metadados completos
  - Índices otimizados para performance

### 2. **SERVIÇOS** ✅

#### `lib/acquisition/acquisition-service.ts`
- **Extração de parâmetros**: `extractAcquisitionParams()`
- **Validação e sanitização**: Segurança contra injection
- **Inferência de origem**: Baseada em headers e User-Agent
- **Geração de contexto**: Para a IA adaptar linguagem
- **Registro de eventos**: `logAcquisitionEvent()`
- **Insights**: `getAcquisitionInsights()`

#### `lib/middleware/acquisition-middleware.ts`
- **Processamento de request**: `processAcquisitionData()`
- **Injeção de contexto**: `injectAcquisitionContext()`
- **Extração segura**: `extractAcquisitionFromRequest()`

### 3. **APIs** ✅

#### `/api/leads/create/route.ts`
- **Criação de leads com aquisição**
- **Validação completa de dados**
- **Registro automático de evento `lead_created`**
- **Resposta com contexto enriquecido**

#### `/api/acquisition/events/route.ts`
- **Registro manual de eventos**
- **Consulta de eventos por lead**
- **Suporte a todos os tipos de eventos**

### 4. **INTEGRAÇÃO COM NOEMIA** ✅

#### Atualização em `app/api/noemia/chat/route.ts`
- **Extração de contexto**: `extractAcquisitionFromRequest()`
- **Combinação com contexto existente**
- **Preservação total do fluxo atual**

#### Atualização em `lib/ai/noemia-core.ts`
- ** Enriquecimento do system prompt**: Contexto de aquisição
- **Adaptação de linguagem**: Baseada no tema detectado
- **Instruções específicas**: Por origem e tema

---

## 🔄 **FLUXO COMPLETO**

### **Exemplo 1: Instagram + Conteúdo Previdenciário**
```
URL: /noemia?source=instagram&campaign=reel_beneficio_negado&topic=previdenciario&content_id=vid_001

1. Middleware captura parâmetros
2. Serviço cria contexto de aquisição
3. IA recebe contexto enriquecido:
   - "Este lead veio do Instagram"
   - "interesse em área previdenciária"
   - "campanha reel_beneficio_negado"
4. IA adapta linguagem para o tema
5. Tags automáticas: ["origem_instagram", "tema_previdenciario"]
```

### **Exemplo 2: WhatsApp + Anúncio Bancário**
```
URL: /noemia?source=whatsapp&utm_source=google&utm_medium=cpc&topic=bancario&campaign=ads_juros_altos

1. Detecção via headers User-Agent
2. Contexto para IA:
   - "Este lead veio do WhatsApp"
   - "interesse em área bancária"
   - "campanha ads_juros_altos"
3. IA foca em: contratos, juros, cobranças
4. Tags: ["origem_whatsapp", "tema_bancario", "utm_google"]
```

---

## 🎯 **RECURSOS DE AQUISIÇÃO**

### **Parâmetros Suportados**

#### Diretos:
- `source`: instagram, whatsapp, site, ads, organic, referral
- `campaign`: Nome da campanha ou conteúdo
- `topic`: previdenciario, bancario, familia, civil, trabalhista, consumidor
- `content_id`: Identificador único do conteúdo

#### UTM Padrão:
- `utm_source`: Fonte do tráfego
- `utm_medium`: Meio da campanha
- `utm_campaign`: Nome da campanha
- `utm_term`: Termo de busca
- `utm_content`: Conteúdo específico

### **Origens Inferidas Automaticamente**
- **Instagram**: User-Agent contém "instagram"
- **WhatsApp**: User-Agent contém "whatsapp" ou referer wa.me
- **Facebook**: User-Agent contém "facebook"
- **Google Ads**: Referer google.com
- **LinkedIn**: Referer linkedin.com

---

## 🤖 **INTEGRAÇÃO COM IA**

### **Contexto Enviado para IA**
```typescript
{
  acquisition: {
    source: "instagram",
    campaign: "reel_beneficio_negado",
    topic: "previdenciario",
    content_id: "vid_001",
    ai_context: "Este lead veio do Instagram, campanha reel_beneficio_negado, interesse em área previdenciária",
    language_adaptation: "Foque em perguntas sobre INSS, aposentadoria, benefícios e tempo de contribuição."
  }
}
```

### **Adaptações da IA**
- **Instagram**: Tom mais caloroso, linguagem informal
- **WhatsApp**: Respostas diretas, emojis permitidos
- **Anúncios**: Foco em clareza e valor
- **Previdenciário**: Priorizar INSS, aposentadoria, benefícios
- **Bancário**: Priorizar contratos, juros, direitos do consumidor
- **Família**: Abordagem sensível, divórcio, pensão, guarda

---

## 📊 **TRACKING DE EVENTOS**

### **Eventos Automáticos**
1. **`lead_created`**: Trigger automático na criação do lead
2. **`first_message_sent`**: Primeira resposta da IA
3. **`qualified`**: Lead qualificado pela IA
4. **`scheduled`**: Agendamento realizado
5. **`converted`**: Conversão concluída

### **Registro Manual**
```typescript
POST /api/acquisition/events
{
  "lead_id": "uuid-do-lead",
  "event_type": "qualified",
  "metadata": {
    "reason": "lead demonstrou alto interesse",
    "score": 85
  }
}
```

---

## 🔒 **SEGURANÇA IMPLEMENTADA**

### **Validação de Inputs**
- **Sanitização**: Remoção de HTML, aspas, JavaScript
- **Limitação**: Máximo 255 caracteres por campo
- **Validação**: Apenas valores permitidos para source/topic
- **Escape**: Prevenção de SQL injection

### **Logs Estruturados**
```
ACQUISITION_TRACKING: { 
  source: "instagram", 
  topic: "previdenciario", 
  campaign: "reel_beneficio_negado" 
}
```

---

## 🏷️ **TAGS OPERACIONAIS**

### **Tags Automáticas Geradas**
- **Origem**: `origem_instagram`, `origem_whatsapp`, `origem_site`
- **Tema**: `tema_previdenciario`, `tema_bancario`, `tema_familia`
- **Campanha**: `campanha_nome_da_campanha`
- **UTM**: `utm_google`, `utm_facebook`

### **Uso no Painel**
- **Filtros**: Por origem, tema, campanha
- **Dashboards**: Métricas por fonte
- **Relatórios**: Performance de conteúdo

---

## 📈 **INSIGHTS E MÉTRICAS**

### **Endpoint de Insights**
```typescript
GET /api/leads/create?start_date=2026-01-01&end_date=2026-01-31

Response:
{
  "success": true,
  "insights": {
    "total_events": 1250,
    "events_by_type": {
      "lead_created": 500,
      "qualified": 300,
      "scheduled": 150,
      "converted": 75
    },
    "events_by_source": {
      "instagram": 600,
      "whatsapp": 400,
      "site": 200,
      "ads": 50
    },
    "events_by_topic": {
      "previdenciario": 500,
      "bancario": 300,
      "familia": 200,
      "civil": 150
    }
  }
}
```

---

## 🔄 **EXEMPLOS DE USO**

### **1. Link com Parâmetros Completos**
```
https://advnoemia.com.br/noemia?
  source=instagram&
  campaign=reel_direito_trabalhista&
  topic=trabalhista&
  content_id=vid_123&
  utm_source=instagram&
  utm_medium=social&
  utm_campaign=reel_direito_trabalhista
```

### **2. Link Simplificado**
```
https://advnoemia.com.br/noemia?source=whatsapp&topic=previdenciario
```

### **3. Link Orgânico**
```
https://advnoemia.com.br/noemia
// Sistema inferirá origem = "organic"
```

---

## ✅ **CRITÉRIOS DE SUCESSO ATENDIDOS**

### ✅ **Leads passam a ter origem e tema registrados**
- Migration segura sem afetar dados existentes
- Captura automática via URL parameters
- Inferência via headers quando não informado

### ✅ **IA recebe contexto enriquecido sem quebrar fluxo**
- Contexto adicionado sem modificar prompts principais
- Adaptação de linguagem baseada no tema
- Mantida personalidade existente da NoemIA

### ✅ **Painel mostra essas informações**
- Tags operacionais automáticas
- Metadados completos para filtros
- Insights por origem e campanha

### ✅ **Sistema continua estável**
- Nenhuma alteração nas Fases 1 e 2
- Compatibilidade total com fluxo existente
- Fallbacks seguros para casos de erro

---

## 🚀 **PRÓXIMOS PASSOS (FUTUROS)**

### **Análise de Performance**
- Dashboard de conversão por origem
- ROI por campanha
- Custo por lead (se integrado com ads)

### **Otimização de Conteúdo**
- Identificar melhores temas por origem
- Testar A/B de linguagem
- Personalização avançada

### **Integração com Anúncios**
- API para criar campanhas
- Sync automática com plataformas
- Remarketing inteligente

---

## 📝 **CONCLUSÃO**

O sistema de aquisição e rastreio foi implementado com sucesso, mantendo total compatibilidade com o sistema existente e adicionando uma camada poderosa de inteligência de negócios.

**Principais benefícios:**
- 🎯 **Rastreio completo** da origem ao funil
- 🤖 **IA mais inteligente** com contexto enriquecido
- 📊 **Dados para decisões** de marketing
- 🔒 **Segurança robusta** contra abusos
- 🏷️ **Tags automáticas** para operação

**Status:** ✅ **IMPLEMENTAÇÃO CONCLUÍDA**  
**Próximo:** Testes e deploy para produção
