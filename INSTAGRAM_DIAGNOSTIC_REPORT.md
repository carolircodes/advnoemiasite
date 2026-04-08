# FASE 3: DIAGNÓSTICO REAL DO INSTAGRAM OFICIAL

## 1. AUDITORIA FUNCIONAL DO WEBHOOK OFICIAL

### GET de Verificação (linhas 107-118)
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}
```

### POST Recebe Raw Body (linha 123)
```typescript
const body = await request.text();
```

### Assinatura Validada (linhas 126-137)
```typescript
const signature = request.headers.get("x-hub-signature-256");

if (!verifySignature(body, signature || "")) {
  console.log("INSTAGRAM_SIGNATURE_INVALID");
} else {
  console.log("INSTAGRAM_SIGNATURE_VALID");
}
```

### Sender Extraído (linhas 151, 169)
```typescript
// Estrutura messaging
messaging.sender?.id

// Estrutura changes  
message.from?.id
```

### Texto Extraído (linhas 152, 170)
```typescript
// Estrutura messaging
messaging.message?.text

// Estrutura changes
message.text
```

### Resposta Fixa Definida (linhas 156, 174)
```typescript
"Olá! Recebi sua mensagem e já vou te ajudar."
```

### Graph API Chamada (linha 47)
```typescript
const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
```

## 2. MAPA DE VARIÁVEIS DE AMBIENTE

### META_VERIFY_TOKEN
- **Obrigatória**: Sim (para GET verification)
- **Usada em**: GET (linha 110)
- **Se errada**: GET retorna 403, webhook não é ativado
- **Default**: "noeminha_verify_2026"

### META_APP_SECRET  
- **Obrigatória**: Sim (para assinatura HMAC)
- **Usada em**: verifySignature() (linha 26)
- **Se errada**: Assinatura sempre inválida, mas NÃO bloqueia (só loga)
- **Default**: "noeminha_app_secret_2026"

### INSTAGRAM_ACCESS_TOKEN
- **Obrigatória**: Sim (para enviar respostas)
- **Usada em**: sendInstagramMessage() (linha 42)
- **Se errada**: Token missing log, não envia resposta
- **Sem default**: Must be configured

## 3. ASSINATURA EM MODO SOMBRA

### Raw Body Correto?
**SIM** - Usa `await request.text()` que captura body exato

### Header Lido?
**SIM** - Lê `x-hub-signature-256` (header padrão Meta)

### Secret Usado?
**APP_SECRET** - Variável `META_APP_SECRET`

### Risco de Body Alterado?
**NÃO** - Body capturado antes de qualquer parse JSON

### Assinatura Inválida: Implementação vs Config?
**MAIS PROVÁVEL CONFIGURAÇÃO** - Código está correto, mas:
- Secret pode estar diferente na Meta
- Meta pode não estar enviando assinatura
- Webhook pode não estar ativo na Meta

## 4. PONTO EXATO DE FALHA (MAIS PROVÁVEL)

### **B. Meta não chama o webhook**

**Justificativa**:
1. WhatsApp funciona (mesma infra, prova que backend OK)
2. Código Instagram está funcional e bem estruturado
3. Assinatura em modo sombra (não bloqueia)
4. Logs estratégicos vão mostrar se POST chega

### Outras possibilidades em ordem:
- **E**: Token/permissão Instagram inválidos (se POST chega mas não envia)
- **D**: Falha Graph API (se sender/text extraídos mas API falha)
- **C**: Não extrai texto (se structure detectada mas sem text)
- **A**: Meta não chama (se nem "INSTAGRAM_POST_RECEIVED" aparece)

## 5. LOGS MÍNIMOS ESTRATÉGICOS APLICADOS

### Logs Adicionados:
- `INSTAGRAM_POST_RECEIVED` - POST recebido
- `INSTAGRAM_SIGNATURE_VALID` - Assinatura OK  
- `INSTAGRAM_SIGNATURE_INVALID` - Assinatura falha
- `INSTAGRAM_MESSAGE_STRUCTURE_DETECTED` - Estrutura encontrada
- `INSTAGRAM_SENDER_EXTRACTED` - ID do remetente
- `INSTAGRAM_TEXT_EXTRACTED` - Texto da mensagem
- `INSTAGRAM_ABOUT_TO_SEND` - Prestes a enviar
- `INSTAGRAM_GRAPH_API_STATUS` - Status HTTP da API
- `INSTAGRAM_GRAPH_API_RESPONSE` - Response da API
- `INSTAGRAM_RESPONSE_SENT` - Enviado com sucesso
- `INSTAGRAM_RESPONSE_FAILED` - Falha no envio

## 6. RELATÓRIO FINAL

### A. Fluxo Real Confirmado
```
Instagram DM -> Meta Webhook -> POST /api/meta/webhook ->
Parse Body -> Verify Signature -> Extract Message ->
Send Graph API -> Instagram DM Response
```

### B. Envs Obrigatórias
- `META_VERIFY_TOKEN` (verificação webhook)
- `META_APP_SECRET` (assinatura HMAC)  
- `INSTAGRAM_ACCESS_TOKEN` (envio respostas)

### C. Risco Atual da Assinatura
**BAIXO** - Está em modo sombra, só loga, não bloqueia

### D. Ponto Mais Provável da Falha
**Meta não está chamando o webhook** - Configuração na Meta

### E. Mudanças Exatas Aplicadas
- Logs estratégicos adicionados em 10 pontos críticos
- Padrão de nomenclatura `INSTAGRAM_*` para fácil filtragem
- Sem alteração de lógica, só observabilidade

### F. Checklist Exato de Teste

#### Passo 1: Verificar se POST chega
- Enviar DM para Instagram oficial
- Procurar log: `INSTAGRAM_POST_RECEIVED`
- **Se não aparecer**: Meta não está chamando webhook

#### Passo 2: Verificar assinatura  
- Se POST chegou, procurar: `INSTAGRAM_SIGNATURE_VALID` ou `INVALID`
- **Se INVALID**: Secret está diferente na Meta

#### Passo 3: Verificar estrutura
- Procurar: `INSTAGRAM_MESSAGE_STRUCTURE_DETECTED`
- **Se não aparecer**: Payload structure inesperada

#### Passo 4: Verificar extração
- Procurar: `INSTAGRAM_SENDER_EXTRACTED` + `INSTAGRAM_TEXT_EXTRACTED`
- **Se não aparecer**: Formato de mensagem diferente

#### Passo 5: Verificar envio
- Procurar: `INSTAGRAM_ABOUT_TO_SEND`
- **Se não aparecer**: Não chegou ao envio

#### Passo 6: Verificar API
- Procurar: `INSTAGRAM_GRAPH_API_STATUS` + `INSTAGRAM_GRAPH_API_RESPONSE`
- **Se status != 200**: Token ou permissão inválidos

## PRÓXIMA AÇÃO

1. **Testar agora**: Enviar DM para Instagram
2. **Verificar logs Vercel**: Filtrar por `INSTAGRAM_`
3. **Identificar ponto exato**: Onde o fluxo para
4. **Corrigir configuração específica**: Baseado no diagnóstico

O sistema está pronto para diagnóstico preciso!
