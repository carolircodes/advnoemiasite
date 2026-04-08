# AJUSTE FINAL PARA BYTES CRUS - WEBHOOK META/INSTAGRAM

## **TAREFA 1 - LEITURA DE BYTES CRUS IMPLEMENTADA**

### **ANTES (String):**
```typescript
const body = await request.text();
const isValid = verifySignature(body, signature || "");
```

### **DEPOIS (Buffer):**
```typescript
const rawBuffer = Buffer.from(await request.arrayBuffer());
const isValid = verifySignature(rawBuffer, signature || "");
```

**Resultado:** Agora captura bytes crus exatos da requisição

---

## **TAREFA 2 - HMAC COM BYTES CRUS IMPLEMENTADO**

### **ANTES (String):**
```typescript
function verifySignature(body: string, signature: string): boolean {
  const hmac = createHmac("sha256", selectedSecret);
  hmac.update(body, "utf8");
  const computedHash = hmac.digest("hex");
}
```

### **DEPOIS (Buffer):**
```typescript
function verifySignature(rawBuffer: Buffer, signature: string): boolean {
  const hmac = createHmac('sha256', selectedSecret);
  hmac.update(rawBuffer);
  const computedHash = hmac.digest('hex');
}
```

**Resultado:** HMAC calculado sobre bytes crus, sem encoding UTF-8

---

## **TAREFA 3 - FORMATO MANTIDO**

### **Formato Preservado:**
```typescript
const expectedSignature = `sha256=${computedHash}`;
```

**Resultado:** Formato `sha256=...` mantido

---

## **TAREFA 4 - PROCESSAMENTO APÓS VALIDAÇÃO**

### **Fluxo Correto:**
```typescript
// 1. Validar com bytes crus
const isValid = verifySignature(rawBuffer, signature || "");

if (!isValid) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}

// 2. Processar payload após validação
const bodyText = rawBuffer.toString('utf8');
const data = JSON.parse(bodyText);
```

**Resultado:** Payload processado apenas após validação bem-sucedida

---

## **TAREFA 5 - LOGS IMPLEMENTADOS**

### **Logs Adicionados:**
```typescript
console.log("RAW_BODY_BUFFER_LENGTH:", rawBuffer.length);
console.log("RAW_BODY_TEXT_LENGTH:", bodyText.length);
console.log("APP_SECRET_SOURCE_SELECTED:", selectedEnvName);
console.log("SIGNATURE_HEADER_PREFIX:", signature ? signature.substring(0, 20) : 'MISSING');
console.log("COMPUTED_SIGNATURE_PREFIX:", expectedSignature.substring(0, 20));
console.log("SIGNATURE_MATCH_EXACT:", signatureMatch);
```

---

## **TAREFA 6 - RELATÓRIO FINAL**

### **1. Trecho Exato Alterado:**

#### **Leitura de Bytes Crus (Linha 329):**
```typescript
const rawBuffer = Buffer.from(await request.arrayBuffer());
```

#### **HMAC com Bytes Crus (Linha 95-97):**
```typescript
const hmac = createHmac('sha256', selectedSecret);
hmac.update(rawBuffer);
const computedHash = hmac.digest('hex');
```

#### **Processamento Após Validação (Linha 353-354):**
```typescript
const bodyText = rawBuffer.toString('utf8');
const data = JSON.parse(bodyText);
```

### **2. HMAC Agora Usa Buffer/Bytes Crus:**
**SIM** - `createHmac('sha256', selectedSecret).update(rawBuffer)` usa bytes crus diretamente

### **3. Logs para Procurar Após o Deploy:**

#### **Caso de Sucesso (Validação Correta):**
```
RAW_BODY_BUFFER_LENGTH: [número]
RAW_BODY_TEXT_LENGTH: [número]
APP_SECRET_SOURCE_SELECTED: INSTAGRAM_APP_SECRET
SIGNATURE_HEADER_PREFIX: sha256=1a2b3c4d5e6f7...
COMPUTED_SIGNATURE_PREFIX: sha256=1a2b3c4d5e6f7...
SIGNATURE_MATCH_EXACT: true
META_WEBHOOK_DIAGNOSIS: Signature VALID
INSTAGRAM_SIGNATURE_VALIDATION_RESULT: VALID
INSTAGRAM_SIGNATURE_VALID - CONTINUING FLOW
```

#### **Caso de Erro (Ainda Mismatch):**
```
RAW_BODY_BUFFER_LENGTH: [número]
RAW_BODY_TEXT_LENGTH: [número]
APP_SECRET_SOURCE_SELECTED: INSTAGRAM_APP_SECRET
SIGNATURE_HEADER_PREFIX: sha256=1a2b3c4d5e6f7...
COMPUTED_SIGNATURE_PREFIX: sha256=9f8e7d6c5b4a3...
SIGNATURE_MATCH_EXACT: false
META_WEBHOOK_ABORT_REASON: Signature mismatch
INSTAGRAM_SIGNATURE_INVALID - ABORTING FLOW
```

#### **Caso de Secret Ausente:**
```
META_WEBHOOK_ABORT_REASON: No app secret configured
META_SECRET_CANDIDATES_STATUS: {
  INSTAGRAM_APP_SECRET: false,
  META_APP_SECRET: false,
  APP_SECRET: false,
  META_INSTAGRAM_APP_SECRET: false
}
```

---

## **RESUMO EXECUTIVO**

### **Mudança Crítica Implementada:**
- **Leitura:** `request.text()` → `Buffer.from(request.arrayBuffer())`
- **HMAC:** `update(body, "utf8")` → `update(rawBuffer)`
- **Processamento:** JSON.parse após validação (não antes)

### **Impacto Técnico:**
- **Zero:** Frontend, portal, layout, Supabase, NoemIA intactos
- **Mínimo:** Apenas validação de assinatura do webhook Meta

### **Status Atual:**
- **Código:** Usa bytes crus exatos da requisição
- **Validação:** HMAC calculado sem encoding intermediário
- **Prova:** Aguarda `SIGNATURE_MATCH_EXACT: true` nos logs

### **Próximo Passo:**
1. Deploy com bytes crus
2. Testar mensagem no Instagram
3. Verificar `SIGNATURE_MATCH_EXACT: true` nos logs

---

**CONCLUSÃO:** Webhook agora usa bytes crus exatos para HMAC. Eliminada última dúvida de encoding. Prova real virá dos logs de validação.
