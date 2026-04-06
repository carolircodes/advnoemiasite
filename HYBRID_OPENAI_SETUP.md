# Sistema Híbrido OpenAI + Fallback - Guia de Configuração

## 🎯 Objetivo

Sistema que funciona PERFEITAMENTE mesmo sem OpenAI, com fallback inteligente e logs detalhados.

## 🚀 Funcionalidades Implementadas

### 1. **Modo Híbrido**
- **ENABLE_OPENAI=true**: Usa IA OpenAI quando disponível
- **ENABLE_OPENAI=false**: Usa fallback inteligente diretamente
- **Falha OpenAI**: Detecta erros e usa fallback automaticamente

### 2. **Logs Estruturados com Emojis**
```
✅ OPENAI_ENABLED: Configurada e pronta para uso
🚫 OPENAI_DISABLED: ENABLE_OPENAI=false
🚫 OPENAI_SKIPPED: OPENAI_API_KEY não configurada
🛡️ OPENAI_FAILED_FALLBACK_USED: Erro da OpenAI, usando fallback
📤 WHATSAPP_SEND_SUCCESS: Mensagem enviada com sucesso
❌ WHATSAPP_SEND_FAIL: Falha no envio
📤 INSTAGRAM_SEND_SUCCESS: Mensagem enviada com sucesso
❌ INSTAGRAM_SEND_FAIL: Falha no envio
```

### 3. **Fallback Inteligente por Área**

#### Previdenciário
```text
Olá! Sou a NoemIA, assistente da Advogada Noemia. Recebi sua mensagem sobre direito previdenciário.

Para te dar uma orientação segura e personalizada, o ideal é conversar diretamente com a advogada Noemia. Cada caso tem suas particularidades e merece atenção individual.

📱 WhatsApp: https://wa.me/5511999999999
🌐 Site: https://advnoemia.com.br/direito-previdenciario.html

Estamos aguardando seu contato!
```

#### Bancário e Consumidor
```text
Olá! Sou a NoemIA, assistente da Advogada Noemia. Recebi sua mensagem sobre direito bancário e consumidor.

Para te dar uma orientação segura e personalizada, o ideal é conversar diretamente com a advogada Noemia. Cada caso tem suas particularidades e merece atenção individual.

📱 WhatsApp: https://wa.me/5511999999999
🌐 Site: https://advnoemia.com.br/direito-consumidor-bancario.html

Estamos aguardando seu contato!
```

#### Família
```text
Olá! Sou a NoemIA, assistente da Advogada Noemia. Recebi sua mensagem sobre direito de família.

Para te dar uma orientação segura e personalizada, o ideal é conversar diretamente com a advogada Noemia. Cada caso tem suas particularidades e merece atenção individual.

📱 WhatsApp: https://wa.me/5511999999999
🌐 Site: https://advnoemia.com.br/direito-familia.html

Estamos aguardando seu contato!
```

#### Alta Intenção (Urgente/Quer Humano)
```text
Olá! Sou a NoemIA, assistente da Advogada Noemia. Entendi que você precisa de atendimento sobre [ÁREA] e já estou direcionando seu caso.

Para atendimento imediato e personalizado, fale diretamente com a advogada:
📱 WhatsApp: https://wa.me/5511999999999
🌐 Site: https://advnoemia.com.br/[PÁGINA]

Em breve entraremos em contato!
```

## 🔧 Configuração das Variáveis de Ambiente

### Para Produção (Vercel/Render)
```bash
# OpenAI (Opcional)
ENABLE_OPENAI=true                    # true = usar IA, false = só fallback
OPENAI_API_KEY=sk-xxxxx             # Chave da OpenAI (se ENABLE_OPENAI=true)
OPENAI_MODEL=gpt-4o-mini            # Modelo da OpenAI

# Instagram
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
INSTAGRAM_ACCESS_TOKEN=xxxxx

# WhatsApp
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Site
NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br
NOEMIA_WHATSAPP_URL=https://wa.me/5511999999999

# Features
ENABLE_COMMENT_AUTOREPLY=true
ENABLE_SIGNATURE_VALIDATION=true
```

### Para Desenvolvimento (Sem OpenAI)
```bash
# Desabilitar OpenAI - usar só fallback
ENABLE_OPENAI=false

# Manter outras configurações normais
META_VERIFY_TOKEN=noeminha_verify_2026
# ... outras variáveis
```

## 🧪 Testes

### 1. Testar com OpenAI Desabilitada
```bash
# No .env.local
ENABLE_OPENAI=false

# Enviar mensagem para Instagram/WhatsApp
# Deve ver log: 🚫 OPENAI_DISABLED
# Deve receber resposta de fallback
```

### 2. Testar com OpenAI Habilitada mas Sem API Key
```bash
# No .env.local
ENABLE_OPENAI=true
# OPENAI_API_KEY não definida

# Enviar mensagem
# Deve ver log: 🚫 OPENAI_SKIPPED
# Deve receber resposta de fallback
```

### 3. Testar com OpenAI Funcionando
```bash
# No .env.local
ENABLE_OPENAI=true
OPENAI_API_KEY=sk-xxxxx

# Enviar mensagem
# Deve ver log: ✅ OPENAI_ENABLED
# Deve receber resposta da IA
```

### 4. Testar Falha da OpenAI
```bash
# Com API key inválida ou sem quota
ENABLE_OPENAI=true
OPENAI_API_KEY=sk-invalida

# Enviar mensagem
# Deve ver log: 🛡️ OPENAI_FAILED_FALLBACK_USED
# Deve receber resposta de fallback
```

## 📊 Logs em Produção

### Exemplos de Logs
```json
{
  "ts": "2026-04-06T20:30:00.000Z",
  "source": "platform-webhook",
  "platform": "instagram",
  "eventType": "OPENAI_ENABLED",
  "model": "gpt-4o-mini"
}

{
  "ts": "2026-04-06T20:30:05.000Z",
  "source": "platform-webhook", 
  "platform": "instagram",
  "eventType": "FALLBACK_USED",
  "area": "previdenciario",
  "urgency": "alta",
  "wantsHuman": true
}

{
  "ts": "2026-04-06T20:30:10.000Z",
  "source": "platform-webhook",
  "platform": "instagram", 
  "eventType": "INSTAGRAM_SEND_SUCCESS",
  "userId": "123456789",
  "messageLength": 245
}
```

## 🔄 Fluxo Completo

```
Usuário envia mensagem
    ↓
Detectar área jurídica (previdenciário/bancário/família/geral)
    ↓
Classificar lead (frio/curioso/interessado/quente/pronto_para_agendar)
    ↓
Verificar ENABLE_OPENAI
    ↓
┌─ ENABLE_OPENAI=false ──→ Usar fallback inteligente
│
└─ ENABLE_OPENAI=true ──→ Tentar OpenAI
                           │
                           ├─ Sucesso ──→ Resposta da IA
                           │
                           └─ Falha ──→ Usar fallback inteligente
    ↓
Enviar resposta (Instagram/WhatsApp)
    ↓
Gravar lead em noemia_leads
    ↓
Gravar conversa em noemia_conversations
    ↓
Log estruturado com emojis
```

## 🚀 Deploy

### Vercel
1. Configurar Environment Variables no dashboard
2. Deploy automático detecta as variáveis
3. Logs aparecem no Functions tab

### Render
1. Configurar Environment Variables
2. Logs aparecem no Logs tab
3. Sistema funciona mesmo sem OpenAI

## 💡 Benefícios

1. **Zero Downtime**: Sistema nunca para de responder
2. **Custo Controlado**: Fallback é gratuito
3. **Logs Claros**: Fácil debugar com emojis
4. **Experiência Consistente**: Usuário sempre recebe resposta
5. **Flexibilidade**: Ativa/desativa OpenAI por variável
6. **Profissionalismo**: Fallbacks são elegantes e úteis

## 🔍 Monitoramento

### KPIs para Monitorar
- **Taxa de Uso OpenAI**: % de mensagens com IA vs fallback
- **Taxa de Falha OpenAI**: % de erros da OpenAI
- **Taxa de Envio**: % de mensagens enviadas com sucesso
- **Áreas Mais Comuns**: previdenciário/bancário/família
- **Intenção dos Leads**: alta/média/baixa

### Alertas
- Se OPENAI_FAILED_FALLBACK_USED > 50% por 1h
- Se WHATSAPP_SEND_FAIL > 10% por 30min
- Se INSTAGRAM_SEND_FAIL > 10% por 30min

---

**Resultado**: Sistema 100% funcional mesmo sem OpenAI, com fallback inteligente e logs profissionais! 🚀
