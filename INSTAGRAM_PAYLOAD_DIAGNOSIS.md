# DIAGNÓSTICO FINAL DO PAYLOAD REAL DO INSTAGRAM

## ✅ 1. LOGS SEGUROS DA ESTRUTURA REAL ADICIONADOS

### Logs implementados no arquivo oficial `apps/portal-backend/app/api/meta/webhook/route.ts`:

#### Estrutura básica (linhas 143-145):
- `ENTRY_COUNT` - Número de entries no payload
- `ENTRY_KEYS` - Chaves do primeiro entry
- `FIRST_ENTRY_KEYS` - Chaves do primeiro entry (redundância para segurança)

#### Análise de estruturas (linhas 149-164):
- `MESSAGING_COUNT` - Quantidade de objetos messaging
- `CHANGES_COUNT` - Quantidade de objetos changes
- `CHANGE_FIELD` - Campo do primeiro change (ex: "messages")
- `CHANGE_VALUE_KEYS` - Chaves do value do change
- `MESSAGE_KEYS` - Chaves do primeiro messaging

#### Resumo completo (linhas 168-184):
- `EVENT_SUMMARY` - JSON completo com:
  - object: Tipo do objeto (ex: "instagram")
  - entryKeys: Todas as chaves do entry
  - hasMessaging: Boolean se existe messaging
  - hasChanges: Boolean se existe changes
  - changeField: Campo específico do change
  - changeValueKeys: Chaves do value
  - senderKeys: Chaves do sender (se existir)
  - recipientKeys: Chaves do recipient (se existir)
  - messageKeys: Chaves do message (se existir)
  - hasText: Boolean se existe texto em qualquer estrutura
  - hasMid: Boolean se existe message ID

## ✅ 2. LOGS DE SUCESSO APLICADOS

### Logs de estrutura e processamento:
- `INSTAGRAM_STRUCTURE_MATCHED` - Quando encontra estrutura válida
- `INSTAGRAM_MESSAGE_STRUCTURE_DETECTED` - Quando valida estrutura completa
- `INSTAGRAM_SENDER_EXTRACTED` - ID do remetente extraído
- `INSTAGRAM_TEXT_EXTRACTED` - Texto da mensagem extraído

### Logs da Graph API:
- `INSTAGRAM_ABOUT_TO_SEND` - Prestes a chamar API
- `INSTAGRAM_GRAPH_API_STATUS` - Status HTTP da resposta
- `INSTAGRAM_GRAPH_API_RESPONSE` - Response da API
- `INSTAGRAM_RESPONSE_SENT` - Enviado com sucesso
- `INSTAGRAM_RESPONSE_FAILED` - Falha no envio

## ✅ 3. SEGURANÇA IMPLEMENTADA

### NÃO EXPOSTO:
- ❌ Payload completo bruto
- ❌ Tokens de acesso
- ❌ Dados sensíveis completos
- ❌ User IDs completos
- ❌ Message IDs completos

### EXPONDO APENAS:
- ✅ Nomes de campos (keys)
- ✅ Contagens (counts)
- ✅ Booleanos de existência
- ✅ Estrutura de dados

## 🎯 4. FLUXO DE DIAGNÓSTICO ESPERADO

### Passo 1: Enviar DM para Instagram
```
Mensagem: "teste webhook"
```

### Passo 2: Verificar logs em ordem

#### Logs que devem aparecer:
1. `INSTAGRAM_POST_RECEIVED` ✅
2. `INSTAGRAM_SIGNATURE_VALID` ✅
3. `ENTRY_COUNT: 1` ✅
4. `ENTRY_KEYS: ["id", "time", "messaging"] ou ["id", "time", "changes"]` ✅
5. `EVENT_SUMMARY` com estrutura real ✅

#### Análise do EVENT_SUMMARY:
```json
{
  "object": "instagram",
  "entryKeys": ["id", "time", "messaging"],
  "hasMessaging": true,
  "hasChanges": false,
  "changeField": null,
  "changeValueKeys": [],
  "senderKeys": ["id"],
  "recipientKeys": ["id"],
  "messageKeys": ["text", "mid"],
  "hasText": true,
  "hasMid": true
}
```

### Passo 3: Identificar estrutura real

#### Se `hasMessaging: true`:
- Deve aparecer: `INSTAGRAM_STRUCTURE_MATCHED: messaging`
- Se não aparecer: Parser antigo não encontrou messaging

#### Se `hasChanges: true`:
- Deve aparecer: `INSTAGRAM_STRUCTURE_MATCHED: changes`
- Se `changeField != "messages"`: Aparece `EVENT_IGNORED_UNSUPPORTED_STRUCTURE`

### Passo 4: Verificar extração

#### Se estrutura encontrada:
- `INSTAGRAM_SENDER_EXTRACTED: [ID]`
- `INSTAGRAM_TEXT_EXTRACTED: "teste webhook"`
- `INSTAGRAM_ABOUT_TO_SEND`

#### Se estrutura não encontrada:
- `EVENT_IGNORED_*` com motivo específico

## 🔧 5. AJUSTES PRONTOS PARA APLICAR

### Caso 1: Estrutura messaging diferente
Se `EVENT_SUMMARY` mostrar keys diferentes:
```typescript
// Exemplo: se sender estiver em "from" em vez de "sender"
if (messaging.from?.id) {
  console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.from.id);
}
```

### Caso 2: Estrutura changes diferente
Se `changeField` não for "messages":
```typescript
// Ajustar para aceitar outros fields
if (change.field === "messages" || change.field === "message") {
  // Processar
}
```

### Caso 3: Texto em campo diferente
Se `hasText: false` mas mensagem existe:
```typescript
// Verificar outros campos de texto
const text = message.text || message.content || message.body;
```

## 📋 6. CHECKLIST FINAL DE TESTE

### Antes do teste:
- [ ] Deploy feito com novos logs
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook ativo na Meta

### Durante o teste:
- [ ] Enviar DM: "teste webhook"
- [ ] Verificar logs Vercel
- [ ] Identificar estrutura real no `EVENT_SUMMARY`

### Análise pós-teste:

#### Se aparecer `INSTAGRAM_ABOUT_TO_SEND`:
- [ ] Verificar `INSTAGRAM_GRAPH_API_STATUS`
- [ ] Se 200: Instagram deve responder
- [ ] Se !200: Verificar token/permissões

#### Se NÃO aparecer `INSTAGRAM_ABOUT_TO_SEND`:
- [ ] Verificar qual `EVENT_IGNORED_*` aparece
- [ ] Ajustar parser para estrutura real
- [ ] Fazer novo deploy
- [ ] Testar novamente

## 🚀 7. PRÓXIMA AÇÃO

**1. Enviar DM agora**
**2. Analisar `EVENT_SUMMARY`**
**3. Identificar estrutura real**
**4. Ajustar parser conforme necessário**
**5. Testar resposta automática**

O sistema está pronto para capturar a estrutura exata que o Instagram está enviando e ajustar o parser para responder corretamente!
