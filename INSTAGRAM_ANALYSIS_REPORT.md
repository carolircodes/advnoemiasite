# INSTAGRAM WEBHOOK ANÁLISE COMPLETA - POR QUE NÃO RESPONDE

## 1. ANÁLISE DO ARQUIVO OFICIAL

### Arquivo: `apps/portal-backend/app/api/meta/webhook/route.ts`

### A. ONDE O POST RETORNA 200 (LINHA 209)
```typescript
console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
return NextResponse.json({ received: true }, { status: 200 });
```
**PROBLEMA**: Retorna 200 SEMPRE que não dá erro, mesmo que não processe nenhuma mensagem.

### B. ONDE DETECTA ESTRUTURA DO PAYLOAD

#### Estrutura messaging (LINHAS 148-170)
```typescript
for (const messaging of entry.messaging || []) {
  if (!messaging.message?.text) {
    console.log("EVENT_IGNORED_NO_MESSAGE: messaging structure without message.text");
    continue;
  }
  // ... validações
}
```

#### Estrutura changes (LINHAS 173-204)
```typescript
for (const change of entry.changes || []) {
  if (change.field !== "messages") {
    console.log("EVENT_IGNORED_UNSUPPORTED_STRUCTURE: changes field not 'messages'", { field: change.field });
    continue;
  }
  // ... validações
}
```

### C. ONDE EXTRAI SENDER ID

#### messaging (LINHA 164)
```typescript
console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.sender.id);
```

#### changes (LINHA 196)
```typescript
console.log("INSTAGRAM_SENDER_EXTRACTED:", message.from.id);
```

### D. ONDE EXTRAI TEXT/MESSAGE

#### messaging (LINHA 165)
```typescript
console.log("INSTAGRAM_TEXT_EXTRACTED:", messaging.message.text);
```

#### changes (LINHA 197)
```typescript
console.log("INSTAGRAM_TEXT_EXTRACTED:", message.text);
```

### E. ONDE DECIDE IGNORAR OU PROCESSAR

#### Logs de decisão ADICIONADOS:
- `EVENT_IGNORED_NO_MESSAGE` - Sem message.text
- `EVENT_IGNORED_MISSING_SENDER` - Sem sender.id/from.id  
- `EVENT_IGNORED_NO_TEXT` - Texto vazio
- `EVENT_IGNORED_UNSUPPORTED_STRUCTURE` - field != "messages"

### F. ONDE CHAMA GRAPH API (LINHA 166-169, 199-202)
```typescript
await sendInstagramMessage(
  messaging.sender.id, // ou message.from.id
  "Olá! Recebi sua mensagem e já vou te ajudar."
);
```

### G. ONDE TRATA ERRO GRAPH API (LINHAS 71-84)
```typescript
if (!response.ok) {
  console.log("INSTAGRAM_RESPONSE_FAILED");
  logEvent("INSTAGRAM_RESPONSE_FAILED", { ... }, "error");
  return false;
}
```

## 2. VERIFICAÇÃO DE LOGS ESTRATÉGICOS

### ✅ LOGS EXISTEM NO ARQUIVO ATUAL:

1. **INSTAGRAM_POST_RECEIVED** (LINHA 121) ✅
2. **INSTAGRAM_MESSAGE_STRUCTURE_DETECTED** (LINHAS 162, 179) ✅  
3. **INSTAGRAM_SENDER_EXTRACTED** (LINHAS 164, 196) ✅
4. **INSTAGRAM_TEXT_EXTRACTED** (LINHAS 165, 197) ✅
5. **INSTAGRAM_ABOUT_TO_SEND** (LINHA 54) ✅
6. **INSTAGRAM_GRAPH_API_RESPONSE** (LINHA 69) ✅
7. **INSTAGRAM_RESPONSE_SENT** (LINHA 86) ✅
8. **INSTAGRAM_RESPONSE_FAILED** (LINHA 72) ✅

### ✅ LOGS DE DECISÃO ADICIONADOS:

9. **EVENT_IGNORED_NO_MESSAGE** (LINHAS 150, 184) ✅
10. **EVENT_IGNORED_MISSING_SENDER** (LINHAS 154, 188) ✅
11. **EVENT_IGNORED_NO_TEXT** (LINHAS 158, 192) ✅
12. **EVENT_IGNORED_UNSUPPORTED_STRUCTURE** (LINHA 175) ✅

## 3. GRAPH API ANÁLISE COMPLETA

### URL EXATA USADA (LINHA 47)
```typescript
const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
```

### PAYLOAD EXATO MONTADO (LINHAS 49-52)
```typescript
const payload = {
  recipient: { id: senderId },
  message: { text: messageText },
};
```

### CAMPOS OBRIGATÓRIOS ESPERADOS
- `recipient.id` - ID do usuário no Instagram
- `message.text` - Texto da resposta
- `access_token` - Token de acesso válido com permissões

### TOKEN USADO
- `INSTAGRAM_ACCESS_TOKEN` (variável de ambiente)
- **Se ausente**: Log `INSTAGRAM_TOKEN_MISSING` (LINHA 43)

### O QUE ACONTECE SE API RESPONDER ERRO
- Log `INSTAGRAM_RESPONSE_FAILED` (LINHA 72)
- Retorna `false` da função `sendInstagramMessage`
- **NÃO interrompe o fluxo principal** - continua para próxima mensagem

## 4. DIAGNÓSTICO: POR QUE RETORNA 200 MAS NÃO RESPONDE

### A. FLUXO ATUAL IDENTIFICADO
```
POST recebido → Parse JSON → Verifica object === "instagram" 
→ Loop entries → Se não encontrar estrutura válida → 
"PROCESSED SUCCESSFULLY" → Retorna 200
```

### B. PONTO EXATO ONDE O FLUXO MORRE
**O webhook está recebendo mas não encontrando nenhuma estrutura válida de mensagem.**

### C. PROBLEMA É PARSING (MAIS PROVÁVEL)
**Evidência**: Se chegasse ao `sendInstagramMessage`, teríamos logs:
- `INSTAGRAM_ABOUT_TO_SEND`
- `INSTAGRAM_GRAPH_API_STATUS` 
- `INSTAGRAM_RESPONSE_SENT` ou `INSTAGRAM_RESPONSE_FAILED`

**Se esses logs não aparecem, o problema está no parsing/estrutura.**

## 5. MUDANÇAS EXATAS APLICADAS

### Logs de decisão adicionados em 4 pontos críticos:
1. **LINHA 150**: `EVENT_IGNORED_NO_MESSAGE` (messaging sem text)
2. **LINHA 154**: `EVENT_IGNORED_MISSING_SENDER` (messaging sem sender.id)
3. **LINHA 158**: `EVENT_IGNORED_NO_TEXT` (messaging com texto vazio)
4. **LINHA 175**: `EVENT_IGNORED_UNSUPPORTED_STRUCTURE` (changes field != messages)
5. **LINHA 184**: `EVENT_IGNORED_NO_MESSAGE` (changes sem text)
6. **LINHA 188**: `EVENT_IGNORED_MISSING_SENDER` (changes sem from.id)
7. **LINHA 192**: `EVENT_IGNORED_NO_TEXT` (changes com texto vazio)

### Validações adicionadas:
- `.trim()` para detectar textos vazios
- Logs específicos por estrutura (messaging vs changes)

## 6. CHECKLIST EXATO PARA TESTAR

### Passo 1: Enviar DM para Instagram
- Enviar mensagem simples: "teste webhook"

### Passo 2: Verificar logs em ordem
1. **INSTAGRAM_POST_RECEIVED** ✅ (confirma recebimento)
2. **PAYLOAD_OBJECT**: deve ser "instagram" ✅
3. **ENTRY_RAW**: verificar estrutura real do payload
4. **EVENT_IGNORED_***: identificar qual estrutura está sendo ignorada
5. **INSTAGRAM_MESSAGE_STRUCTURE_DETECTED**: se encontrar estrutura válida
6. **INSTAGRAM_SENDER_EXTRACTED + INSTAGRAM_TEXT_EXTRACTED**: se extrair dados
7. **INSTAGRAM_ABOUT_TO_SEND**: se chamar Graph API
8. **INSTAGRAM_GRAPH_API_STATUS**: resultado da API

### Passo 3: Análise baseada nos logs

#### Se aparecer `EVENT_IGNORED_*`:
- **PROBLEMA**: Estrutura do payload diferente do esperado
- **SOLUÇÃO**: Ajustar parsing para estrutura real

#### Se aparecer `INSTAGRAM_ABOUT_TO_SEND` mas não `INSTAGRAM_RESPONSE_SENT`:
- **PROBLEMA**: Token ou permissões Graph API
- **SOLUÇÃO**: Verificar `INSTAGRAM_ACCESS_TOKEN` e permissões

#### Se não aparecer nenhum log após `ENTRY_RAW`:
- **PROBLEMA**: object != "instagram" ou entry array vazio
- **SOLUÇÃO**: Verificar configuração do webhook na Meta

### Passo 4: Verificar variáveis de ambiente
```bash
# No Vercel, verificar se existem:
META_VERIFY_TOKEN
META_APP_SECRET  
INSTAGRAM_ACCESS_TOKEN
```

## 7. CONCLUSÃO

**O webhook está funcionando (retorna 200) mas não processa mensagens porque a estrutura do payload não corresponde ao esperado.**

**Próximo passo**: Enviar DM e analisar os logs `EVENT_IGNORED_*` para identificar a estrutura real que o Instagram está enviando.
