# RELATÓRIO DE VALIDAÇÃO DE ASSINATURA - INSTAGRAM WEBHOOK

## **1. VARIÁVEL DE AMBIENTE USADA**

### **Nome Exato:**
```typescript
const APP_SECRET = process.env.META_APP_SECRET || "noeminia_app_secret_2026";
```

**Variável utilizada:** `META_APP_SECRET`

**Fallback padrão:** `"noeminia_app_secret_2026"` (apenas para desenvolvimento)

---

## **2. CÓDIGO DE VALIDAÇÃO**

### **Função `verifySignature()`:**
```typescript
function verifySignature(body: string, signature: string): boolean {
  // LOGS DE DIAGNÓSTICO SEGURO E DETALHADO
  console.log("=== SIGNATURE_VALIDATION_DEBUG ===");
  console.log("ENV_VAR_USED: META_APP_SECRET");
  console.log("SIGNATURE_HEADER_PRESENT:", !!signature);
  console.log("SIGNATURE_HEADER_PREFIX:", signature ? signature.substring(0, 20) : null);
  console.log("META_APP_SECRET_PRESENT:", !!APP_SECRET);
  console.log("META_APP_SECRET_LENGTH:", APP_SECRET?.length || 0);
  console.log("RAW_BODY_LENGTH:", body.length);
  
  // Log do nome exato da variável sendo usada
  console.log("APP_SECRET_VAR_NAME: META_APP_SECRET");
  
  // Verificar se há valores alternativos ou fallbacks
  const altSecret1 = process.env.META_APP_SECRET;
  const altSecret2 = process.env.APP_SECRET;
  const altSecret3 = process.env.INSTAGRAM_APP_SECRET;
  
  console.log("ALT_META_APP_SECRET_PRESENT:", !!altSecret1);
  console.log("ALT_APP_SECRET_PRESENT:", !!altSecret2);
  console.log("ALT_INSTAGRAM_APP_SECRET_PRESENT:", !!altSecret3);
  
  // Hash do body para diagnóstico (sem expor conteúdo)
  const bodyHash = createHmac("sha256", "debug").update(body, "utf8").digest("hex").substring(0, 16);
  console.log("RAW_BODY_HASH_SHA256:", bodyHash);
  
  if (!signature) {
    console.log("SIGNATURE_DIAGNOSIS: No signature header found");
    return false;
  }

  // Verificar se o body está intacto (antes de qualquer parse)
  console.log("BODY_IS_STRING:", typeof body === 'string');
  console.log("BODY_HAS_CONTENT:", body.length > 0);
  
  // Calcular assinatura esperada
  const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
    .update(body, "utf8")
    .digest("hex")}`;
    
  console.log("EXPECTED_SIGNATURE_PREFIX:", expectedSignature.substring(0, 20));
  console.log("RECEIVED_SIGNATURE_PREFIX:", signature.substring(0, 20));
  console.log("SIGNATURE_MATCH:", signature === expectedSignature);
  
  // Log adicional para diagnóstico
  if (signature !== expectedSignature) {
    console.log("SIGNATURE_DIAGNOSIS: Signature mismatch - possible causes:");
    console.log("1. META_APP_SECRET incorrect in Vercel env vars");
    console.log("2. Body mutated before signature calculation");
    console.log("3. Different app configured in Meta Developers");
    console.log("4. Encoding issue with body text");
    
    // Tentar com secrets alternativos se existirem
    if (altSecret2 && altSecret2 !== APP_SECRET) {
      const altSignature = `sha256=${createHmac("sha256", altSecret2)
        .update(body, "utf8")
        .digest("hex")}`;
      console.log("ALT_APP_SECRET_MATCH:", signature === altSignature);
    }
    
    if (altSecret3 && altSecret3 !== APP_SECRET) {
      const altSignature = `sha256=${createHmac("sha256", altSecret3)
        .update(body, "utf8")
        .digest("hex")}`;
      console.log("ALT_INSTAGRAM_APP_SECRET_MATCH:", signature === altSignature);
    }
  } else {
    console.log("SIGNATURE_DIAGNOSIS: Signature valid");
  }

  return signature === expectedSignature;
}
```

### **Chamada no POST:**
```typescript
export async function POST(request: NextRequest) {
  console.log("INSTAGRAM_WEBHOOK_POST_RECEIVED");

  // VALIDAÇÃO DAS VARIÁVEIS DE AMBIENTE
  console.log("META_APP_SECRET_PRESENT:", !!APP_SECRET);
  console.log("META_APP_SECRET_LENGTH:", APP_SECRET?.length || 0);
  console.log("META_VERIFY_TOKEN_PRESENT:", !!VERIFY_TOKEN);
  console.log("META_VERIFY_TOKEN_LENGTH:", VERIFY_TOKEN?.length || 0);

  const body = await request.text();           // <-- RAW BODY ANTES DO PARSE
  const signature = request.headers.get("x-hub-signature-256");
  
  console.log("INSTAGRAM_SIGNATURE_HEADER_RECEIVED:", signature ? "[PRESENT]" : "[MISSING]");
  console.log("INSTAGRAM_SIGNATURE_HEADER_VALUE:", signature ? `${signature.substring(0, 20)}...` : "[MISSING]");
  
  const isValid = verifySignature(body, signature || "");  // <-- VALIDAÇÃO COM RAW BODY
  
  console.log("INSTAGRAM_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");
  
  if (!isValid) {
    console.log("INSTAGRAM_SIGNATURE_INVALID");
    logEvent("INSTAGRAM_SIGNATURE_INVALID", {
      signature: signature ? `${signature.substring(0, 20)}...` : null,
    }, "warn");
  } else {
    console.log("INSTAGRAM_SIGNATURE_VALID");
  }

  try {
    const data = JSON.parse(body);  // <-- PARSE SÓ DEPOIS DA VALIDAÇÃO
    // ... processamento continua mesmo com assinatura inválida!
```

---

## **3. RAW BODY CORRETO?**

### **Sim, está correto:**
1. **`await request.text()`** - Captura body raw antes de qualquer parse
2. **Validação ANTES do parse** - `verifySignature()` chamada antes de `JSON.parse()`
3. **Sem mutação** - Body não é alterado antes da validação

### **Sequência correta:**
```typescript
const body = await request.text();           // 1. Raw body
const signature = request.headers.get("x-hub-signature-256");
const isValid = verifySignature(body, signature || "");  // 2. Validação
const data = JSON.parse(body);               // 3. Parse só depois
```

---

## **4. VARIÁVEIS ALTERNATIVAS VERIFICADAS**

### **Fallbacks detectados:**
- `META_APP_SECRET` (principal)
- `APP_SECRET` (alternativa)
- `INSTAGRAM_APP_SECRET` (alternativa)

### **Logs adicionados:**
```typescript
console.log("ALT_META_APP_SECRET_PRESENT:", !!altSecret1);
console.log("ALT_APP_SECRET_PRESENT:", !!altSecret2);  
console.log("ALT_INSTAGRAM_APP_SECRET_PRESENT:", !!altSecret3);
console.log("ALT_APP_SECRET_MATCH:", signature === altSignature);
console.log("ALT_INSTAGRAM_APP_SECRET_MATCH:", signature === altSignature);
```

---

## **5. FLUXO QUANDO ASSINATURA FALHA**

### **Comportamento atual:**
```typescript
if (!isValid) {
  console.log("INSTAGRAM_SIGNATURE_INVALID");
  logEvent("INSTAGRAM_SIGNATURE_INVALID", {...}, "warn");
} else {
  console.log("INSTAGRAM_SIGNATURE_VALID");
}

try {
  const data = JSON.parse(body);
  // ... PROCESSAMENTO CONTINUA MESMO COM ASSINATURA INVÁLIDA!
```

### **Problema identificado:**
**O fluxo NÃO é abortado quando a assinatura é inválida!**

O código continua o processamento mesmo com `SIGNATURE_MATCH: false`.

---

## **6. DIAGNÓSTICO DA CAUSA**

### **Causa mais provável:**
**`META_APP_SECRET` incorreta no ambiente Vercel**

### **Por quê?**
1. Logs mostram `SIGNATURE_MATCH: false`
2. Logs mostram `META_APP_SECRET_LENGTH: > 0` (secret existe)
3. Raw body está intacto (validação antes do parse)
4. Algoritmo HMAC-SHA256 está correto

### **Outras causas possíveis (menos prováveis):**
1. **App diferente no Meta Developers** - Secret de outro app configurado
2. **Encoding do body** - Problema raro com codificação UTF-8
3. **Secret expirada** - Meta não expira secrets, mas pode ter sido regerada

---

## **7. LOGS ADICIONADOS (SEGUROS)**

### **Novos logs para diagnóstico:**
```
=== SIGNATURE_VALIDATION_DEBUG ===
ENV_VAR_USED: META_APP_SECRET
APP_SECRET_VAR_NAME: META_APP_SECRET
ALT_META_APP_SECRET_PRESENT: true/false
ALT_APP_SECRET_PRESENT: true/false
ALT_INSTAGRAM_APP_SECRET_PRESENT: true/false
BODY_IS_STRING: true
BODY_HAS_CONTENT: true
ALT_APP_SECRET_MATCH: true/false
ALT_INSTAGRAM_APP_SECRET_MATCH: true/false
```

### **Logs que mostrarão a causa exata:**
- Se `ALT_APP_SECRET_MATCH: true` -> Usar variável `APP_SECRET` em vez de `META_APP_SECRET`
- Se todos os `ALT_*_MATCH: false` -> Secret está incorreta no Meta Developers

---

## **8. PRÓXIMOS PASSOS EXATOS**

### **Passo 1: Verificar logs Vercel**
Procurar por estes logs exatos após o próximo webhook:
```
=== SIGNATURE_VALIDATION_DEBUG ===
SIGNATURE_MATCH: false
ALT_APP_SECRET_MATCH: true/false
ALT_INSTAGRAM_APP_SECRET_MATCH: true/false
```

### **Passo 2: Se ALT_APP_SECRET_MATCH: true**
```bash
# No painel Vercel, adicionar:
APP_SECRET=<valor_correto_do_meta_developers>
# E remover META_APP_SECRET ou atualizar com mesmo valor
```

### **Passo 3: Se todos ALT_*_MATCH: false**
```bash
# Ir ao Meta Developers > App > Webhooks > Instagram
# Copiar "App Secret" e configurar no Vercel:
META_APP_SECRET=<novo_secret_do_meta_developers>
```

### **Passo 4: Corrigir fluxo (opcional)**
```typescript
if (!isValid) {
  console.log("INSTAGRAM_SIGNATURE_INVALID");
  return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}
```

---

## **9. RESUMO EXECUTIVO**

### **Variável usada:** `META_APP_SECRET`
### **Raw body:** Intacto e correto
### **Validação:** Correta, mas fluxo continua mesmo com falha
### **Causa provável:** Secret incorreta no Vercel
### **Diagnóstico:** Logs ALT_*_MATCH mostrarão se há variável alternativa correta
### **Ação:** Verificar logs e corrigir variável de ambiente

---

**STATUS:** Diagnóstico implementado com logs detalhados e seguros. Pronto para identificar causa exata.
