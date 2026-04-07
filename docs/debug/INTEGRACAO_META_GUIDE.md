# Guia de Integração com APIs Oficiais da Meta

## 🎯 Objetivo
Integração completa com Instagram + WhatsApp Business para automação de captação e atendimento jurídico, sem dependência de ManyChat.

## 📁 Estrutura Criada

```
apps/portal-backend/
├── app/api/meta/
│   ├── webhook/route.ts          # Webhook principal da Meta
│   └── test/route.ts             # Endpoint de testes
├── lib/meta/
│   ├── webhook-processor.ts      # Processador de eventos
│   ├── theme-detector.ts         # Detecção de temas jurídicos
│   ├── link-generator.ts         # Geração de links contextuais
│   ├── whatsapp-service.ts       # Integração WhatsApp Cloud API
│   └── logging.ts                # Sistema de logging
├── app/api/noemia/chat/
│   └── route-meta.ts             # Endpoint NoemIA com contexto Meta
└── .env.meta.example             # Variáveis de ambiente
```

## 🔧 Configuração inicial

### 1. Variáveis de Ambiente
Copie `.env.meta.example` para `.env.local` e configure:

```bash
# Webhook da Meta
META_APP_SECRET=seu_app_secret_aqui
META_VERIFY_TOKEN=seu_verify_token_aqui

# WhatsApp Business API
META_WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
META_WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
META_WHATSAPP_BUSINESS_ACCOUNT_ID=seu_business_account_id_aqui

# Instagram API
META_INSTAGRAM_APP_ID=seu_instagram_app_id_aqui
META_INSTAGRAM_APP_SECRET=seu_instagram_app_secret_aqui
META_INSTAGRAM_ACCESS_TOKEN=seu_instagram_access_token_aqui
```

### 2. Configurar Webhook na Meta
1. Acesse o Facebook Developers
2. Configure seu app com Webhook
3. URL do webhook: `https://seu-dominio.com/api/meta/webhook`
4. Token de verificação: use `META_VERIFY_TOKEN`
5. Selecione eventos:
   - Instagram Direct Messages
   - Instagram Comments
   - WhatsApp Business Messages

## 🚀 Funcionalidades Implementadas

### 1. 📥 Webhook da Meta (`/api/meta/webhook`)
**GET**: Verificação do webhook
**POST**: Recebimento de eventos

**Eventos suportados:**
- Instagram Direct Messages
- Instagram Comments  
- WhatsApp Business Messages

### 2. 🎯 Detector de Temas Jurídicos
**Palavras-chave por área:**
- **Aposentadoria**: inss, benefício, aposentadoria, loas, bpc
- **Bancário**: banco, empréstimo, desconto, fraude, cartão
- **Família**: divórcio, pensão, guarda, união estável
- **Consumidor**: consumidor, produto, defeito, nota fiscal
- **Civil**: contrato, obrigação, dano, indenização

### 3. 🔗 Gerador de Links Contextuais
**Função principal**: `generateContextLink(params)`

**Exemplos:**
```javascript
// Link para triagem com tema
generateContextLink({
  tema: 'aposentadoria',
  origem: 'instagram',
  campanha: 'reels1'
})
// Resultado: https://advnoemia.com.br/triagem.html?tema=aposentadoria&origem=instagram&campanha=reels1
```

### 4. 📱 WhatsApp Cloud API
**Funções disponíveis:**
- `sendWhatsAppMessage(phone, message)` - Mensagem de texto
- `sendWhatsAppTemplate(phone, template)` - Mensagem template
- `sendWhatsAppInteractive(phone, body, buttons)` - Mensagem interativa

### 5. 🤝 Integração com NoemIA
Endpoint `/api/noemia/chat/route-meta` suporta contexto da Meta:

```javascript
// Payload com contexto Meta
{
  message: "Preciso de ajuda com aposentadoria",
  metaContext: {
    tema: "aposentadoria",
    origem: "instagram",
    campanha: "reels1",
    sessionId: "sess_123"
  }
}
```

## 🔄 Fluxo Completo

```
1. Comentário/Direct no Instagram
   ↓
2. Webhook Meta recebe evento
   ↓
3. Detecta tema jurídico
   ↓
4. Gera link contextual
   ↓
5. Envia resposta automática com link
   ↓
6. Usuário clica e vai para triagem/NoemIA
   ↓
7. Contexto preservado até WhatsApp
   ↓
8. Agendamento de consulta
```

## 📊 Exemplos de Uso

### Instagram Comment → Triagem
```javascript
// Comentário: "Como faço para me aposentar?"
// Detectado: tema = "aposentadoria"
// Link gerado: /triagem.html?tema=aposentadoria&origem=instagram&campanha=comentario
```

### Instagram Direct → NoemIA
```javascript
// Direct: "Tenho problema com banco"
// Detectado: tema = "bancario"  
// Link gerado: /noemia.html?tema=bancario&origem=instagram&campanha=direct
```

### WhatsApp → Consulta
```javascript
// WhatsApp: "Olá, preciso de ajuda"
// Resposta: Link contextual + instruções
// Contexto preservado para agendamento
```

## 🧪 Testes

### Endpoint de Testes: `/api/meta/test`

**GET** - Testa detecção de tema:
```
GET /api/meta/test?text=aposentadoria&origem=instagram
```

**POST** - Simula webhook:
```javascript
POST /api/meta/test
{
  "type": "instagram_direct",
  "text": "Preciso de ajuda com aposentadoria"
}
```

## 📈 Logs e Monitoramento

### Eventos Registrados:
- `webhook_received` - Webhook recebido
- `instagram_direct_processed` - Direct processado
- `instagram_comment_processed` - Comentário processado
- `whatsapp_message_processed` - Mensagem WhatsApp processada
- `conversion_*` - Eventos de conversão

### Logs de Performance:
- Tempo de processamento
- Taxa de sucesso na detecção
- Taxa de cliques nos links
- Taxa de conversão

## 🔒 Segurança

### Validações Implementadas:
- ✅ Verificação de assinatura HMAC-SHA256
- ✅ Token de verificação do webhook
- ✅ Sanitização de dados de entrada
- ✅ Rate limiting (recomendado)
- ✅ CORS configurado

### Recomendações:
- Usar HTTPS obrigatoriamente
- Configurar rate limiting
- Monitorar logs de segurança
- Rotacionar tokens regularmente

## 🚀 Deploy

### 1. Configurar Variáveis de Ambiente
```bash
# Produção
NODE_ENV=production
META_APP_SECRET=production_secret
META_VERIFY_TOKEN=production_verify_token
# ... outras variáveis
```

### 2. Configurar Webhook na Meta
- URL: `https://seu-dominio.com/api/meta/webhook`
- Modo: Production
- Eventos: Instagram + WhatsApp

### 3. Testar Integração
```bash
# Testar webhook
curl -X POST https://seu-dominio.com/api/meta/test \
  -H "Content-Type: application/json" \
  -d '{"type": "instagram_direct", "text": "teste"}'
```

## 📱 WhatsApp Business Setup

### 1. Criar App no Meta for Developers
- Selecionar "Business"
- Adicionar "WhatsApp" product
- Configurar phone number

### 2. Obter Credenciais
- Access Token (permanent ou temporary)
- Phone Number ID
- Business Account ID

### 3. Enviar Mensagens Template
```javascript
await sendWhatsAppTemplate('5584996248241', 'welcome_message', {
  name: 'Cliente',
  service: 'consultoria jurídica'
});
```

## 🔄 Próximos Passos

### Integrações Futuras:
1. **Instagram Graph API** - Postar stories automaticamente
2. **Meta Ads** - Integrar campanhas pagas
3. **WhatsApp Flows** - Fluxos conversacionais avançados
4. **Analytics Avançado** - Dashboards em tempo real
5. **AI Avançada** - GPT-4 integration personalizado

### Automações:
1. **Respostas Proativas** - Baseadas em comportamento
2. **Nutrição de Leads** - Follow-up automático
3. **Agendamento Inteligente** - Disponibilidade em tempo real
4. **Classificação de Urgência** - Priorização automática

## 🛠️ Troubleshooting

### Problemas Comuns:

**Webhook não recebe eventos:**
- Verificar URL de callback
- Confirmar token de verificação
- Checar logs de erro

**Assinatura inválida:**
- Verificar META_APP_SECRET
- Confirmar encoding do payload
- Testar com webhook test tools

**WhatsApp não envia:**
- Verificar access token
- Confirmar phone number ID
- Checar status do número

**Tema não detectado:**
- Analisar palavras-chave
- Ajustar algoritmo de detecção
- Adicionar sinônimos

### Debug Tools:
```javascript
// Testar detecção manualmente
console.log(detectThemeFromText("meu empréstimo no banco"));

// Testar geração de link
console.log(generateContextLink({ tema: 'bancario', origem: 'test' }));

// Verificar logs
await getLogsByPeriod(new Date(Date.now() - 86400000), new Date());
```

## 📞 Suporte

### Documentação Adicional:
- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)

### Contato Técnico:
- Logs detalhados no console
- Endpoint `/api/meta/test` para debug
- Sistema de health check implementado

---

**Status:** ✅ **ESTRUTURA PRONTA**  
**Próxima Fase:** Configuração oficial na Meta e testes de produção
