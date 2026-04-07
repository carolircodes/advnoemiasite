# Instagram Direct - Configuração Meta Webhook Checklist

## 1. Eventos Esperados pelo Código

### Tipos de Payload Suportados:
O código trata **TODAS** as estruturas de eventos do Instagram:

#### A) entry.messaging (Estrutura Clássica)
```typescript
if (entry.messaging) {
  for (const messaging of entry.messaging) {
    if (messaging.message?.text) {
      // Captura: messaging.sender.id, messaging.message.text, messaging.message.mid
    }
  }
}
```

#### B) entry.changes (Estrutura Mais Comum)
```typescript
if (entry.changes) {
  for (const change of entry.changes) {
    if (change.field === 'messages' && change.value?.messages) {
      for (const message of change.value.messages) {
        if (message.type === 'text' && message.from) {
          // Captura: message.from.id, message.text, message.id
        }
      }
    }
  }
}
```

#### C) entry.standby (Estrutura Alternativa)
```typescript
if (entry.standby) {
  for (const standby of entry.standby) {
    if (standby.message?.text && standby.sender?.id) {
      // Captura: standby.sender.id, standby.message.text, standby.message.mid
    }
  }
}
```

## 2. Campos OBRIGATÓRIOS na Meta

### Para receber DMs do Instagram Direct, você precisa ativar:

#### A) Webhook Fields (Campos do Webhook):
- [x] **messages** - OBRIGATÓRIO para DMs
- [ ] **messaging_postbacks** - Opcional (botões interativos)
- [ ] **messaging_optins** - Opcional (opt-in)
- [ ] **message_deliveries** - Opcional (confirmação de entrega)
- [ ] **message_reads** - Opcional (confirmação de leitura)

#### B) Webhook Permissions (Permissões):
- [x] **pages_messaging** - OBRIGATÓRIO para receber mensagens
- [x] **pages_show_list** - Opcional
- [x] **instagram_manage_messages** - OBRIGATÓRIO para Instagram
- [x] **instagram_basic** - Opcional

## 3. Resposta: Sem campo "messages" = Sem POST

### SIM! Se o campo "messages" não estiver assinado na Meta:
- Webhook valida com sucesso (GET)
- Mas **NENHUM POST chega** quando enviam DM
- Meta não envia eventos de campos não assinados
- Backend fica sem receber eventos mesmo com webhook validado

## 4. Log Absoluto Implementado

### Log no início absoluto do POST:
```typescript
console.log('\n' + '='.repeat(100));
console.log('POST RECEBIDO - QUALQUER EVENTO DO META');
console.log('Timestamp:', new Date().toISOString());
console.log('URL:', request.url);
console.log('Headers:', Object.fromEntries(request.headers.entries()));
console.log('Content-Type:', request.headers.get('content-type'));
console.log('User-Agent:', request.headers.get('user-agent'));
console.log('IP:', request.headers.get('x-forwarded-for'));
console.log('='.repeat(100) + '\n');
```

## 5. Checklist Objetivo - Meta Developer Console

### Webhook Configuration:
- [ ] **Webhook URL:** `https://advnoemia.com.br/api/meta/webhook`
- [ ] **Verify Token:** `noeminha_verify_2026`
- [ ] **Webhook Fields:**
  - [x] **messages** (OBRIGATÓRIO)
  - [ ] messaging_postbacks
  - [ ] messaging_optins
  - [ ] message_deliveries
  - [ ] message_reads

### Instagram Permissions:
- [ ] **Instagram App ID** configurado
- [ ] **Instagram Business Account** vinculado
- [ ] **instagram_manage_messages** (OBRIGATÓRIO)
- [ ] **instagram_basic** (opcional)
- [ ] **pages_messaging** (OBRIGATÓRIO)

### Page Settings:
- [ ] **Facebook Page** vinculada ao Instagram
- [ ] **Page Messaging** ativado
- [ ] **Page Access Token** com permissões de mensagem

## 6. Diagnóstico

### Se POST não chega:
1. **Verificar se "messages" está assinado** no webhook
2. **Verificar se "instagram_manage_messages"** está autorizado
3. **Verificar se Page está vinculada** ao Instagram Business Account
4. **Testar com Webhook Test** no Meta Developer Console

### Logs para monitorar:
- Procurar: `POST RECEBIDO - QUALQUER EVENTO DO META`
- Se não aparecer: problema está na configuração Meta
- Se aparecer: problema está no parsing do payload

## 7. Teste Manual

### URL de teste GET:
```
https://advnoemia.com.br/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test123
```

### Esperado nos logs:
```
POST RECEBIDO - QUALQUER EVENTO DO META
PROCESSING_INSTAGRAM_ENTRIES
FOUND_MESSAGING_OBJECT ou FOUND_CHANGES_OBJECT
INSTAGRAM_MESSAGE_EXTRACTED
```
