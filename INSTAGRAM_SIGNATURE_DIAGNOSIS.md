# DIAGNÓSTICO DA ASSINATURA INVÁLIDA DO INSTAGRAM

## ✅ 1. ANÁLISE DO ARQUIVO OFICIAL

### Arquivo: `apps/portal-backend/app/api/meta/webhook/route.ts`

### A. ONDE LÊ O HEADER (LINHA 147)
```typescript
const signature = request.headers.get("x-hub-signature-256");
```

### B. ONDE LÊ O RAW BODY (LINHA 146)
```typescript
const body = await request.text();
```

### C. ONDE CALCULA O HMAC (LINHAS 40-42)
```typescript
const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
  .update(body, "utf8")
  .digest("hex")}`;
```

### D. QUAL ENV USA COMO SECRET (LINHA 5)
```typescript
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";
```

### E. COMO COMPARA (LINHA 53)
```typescript
return signature === expectedSignature;
```

## ✅ 2. LOGS DE DIAGNÓSTICO SEGURO ADICIONADOS

### Logs implementados (linhas 25-53):

#### Header e assinatura:
- `SIGNATURE_HEADER_PRESENT` - Boolean se header existe
- `SIGNATURE_HEADER_PREFIX` - Primeiros 20 chars do header
- `SIGNATURE_HEADER_NAME` - Nome exato do header esperado
- `SIGNATURE_HEADER_VALUE` - [PRESENT] ou [MISSING]

#### Environment:
- `META_APP_SECRET_PRESENT` - Boolean se secret existe
- `META_APP_SECRET_LENGTH` - Comprimento do secret

#### Body:
- `RAW_BODY_LENGTH` - Tamanho do body recebido
- `RAW_BODY_HASH_SHA256` - Hash do body (sem expor conteúdo)

#### Comparação:
- `EXPECTED_SIGNATURE_PREFIX` - Primeiros 20 chars da assinatura esperada
- `SIGNATURE_MATCH` - Boolean se assinaturas batem
- `SIGNATURE_DIAGNOSIS` - Mensagem explicativa do resultado

## ✅ 3. CONFIRMAÇÃO DO APP SECRET

### O webhook do Instagram usa:
- **App Meta específico** configurado no Facebook Developers
- **App Secret** desse mesmo app
- **Verify Token** desse mesmo app

### Variáveis esperadas:
```bash
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=<app_secret_do_mesmo_app>
INSTAGRAM_ACCESS_TOKEN=<token_de_acesso>
```

### ⚠️ RISCO IDENTIFICADO:
**Se o `META_APP_SECRET` salvo for de outro app Meta, a assinatura nunca vai bater!**

## 🎯 4. DIAGNÓSTICO ESPERADO

### Passo 1: Enviar DM para Instagram
```
Mensagem: "teste assinatura"
```

### Passo 2: Verificar logs em ordem

#### Logs que devem aparecer:
1. `INSTAGRAM_POST_RECEIVED` ✅
2. `SIGNATURE_HEADER_NAME: x-hub-signature-256` ✅
3. `SIGNATURE_HEADER_VALUE: [PRESENT]` ✅
4. `SIGNATURE_HEADER_PRESENT: true` ✅
5. `SIGNATURE_HEADER_PREFIX: sha256=abcd1234...` ✅
6. `META_APP_SECRET_PRESENT: true` ✅
7. `META_APP_SECRET_LENGTH: 32` (ou outro) ✅
8. `RAW_BODY_LENGTH: 1234` ✅
9. `RAW_BODY_HASH_SHA256: a1b2c3d4e5f6...` ✅
10. `EXPECTED_SIGNATURE_PREFIX: sha256=efgh5678...` ✅
11. `SIGNATURE_MATCH: false` ❌ (se secret errado)
12. `SIGNATURE_DIAGNOSIS: Signature mismatch - possible APP_SECRET incorrect` ❌

### Análise dos resultados:

#### Se `SIGNATURE_HEADER_VALUE: [MISSING]`:
- **Problema**: Meta não está enviando assinatura
- **Causa**: Configuração do webhook na Meta
- **Solução**: Verificar configuração do webhook

#### Se `SIGNATURE_HEADER_PREFIX` diferente de `EXPECTED_SIGNATURE_PREFIX`:
- **Problema**: `META_APP_SECRET` incorreto
- **Causa**: Secret de outro app Meta
- **Solução**: Atualizar `META_APP_SECRET` no Vercel

#### Se `META_APP_SECRET_PRESENT: false`:
- **Problema**: Variável não configurada
- **Solução**: Adicionar `META_APP_SECRET` no Vercel

## 🔧 5. AJUSTES PRONTOS PARA APLICAR

### Caso 1: Secret incorreto
Se logs mostrarem secret errado:
```bash
# No Vercel Environment Variables:
META_APP_SECRET=<app_secret_correto_do_instagram_app>
```

### Caso 2: Header ausente
Se Meta não enviar assinatura:
```typescript
// Temporário para teste:
if (!signature) {
  console.log("SIGNATURE_DIAGNOSIS: No signature - allowing for debug");
  return true; // Temporário
}
```

### Caso 3: Implementação incorreta
Se implementação estiver errada:
```typescript
// Verificar encoding e algoritmo:
const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
  .update(body, "utf8")  // Confirmar utf8
  .digest("hex")}`;       // Confirmar hex
```

## 📋 6. CHECKLIST FINAL

### Antes do teste:
- [ ] Deploy com novos logs
- [ ] `META_APP_SECRET` configurado no Vercel
- [ ] Webhook ativo na Meta

### Durante o teste:
- [ ] Enviar DM: "teste assinatura"
- [ ] Verificar logs de diagnóstico
- [ ] Identificar ponto exato da falha

### Análise pós-teste:

#### Se `SIGNATURE_MATCH: false`:
- [ ] Comparar `SIGNATURE_HEADER_PREFIX` vs `EXPECTED_SIGNATURE_PREFIX`
- [ ] Verificar `META_APP_SECRET_LENGTH`
- [ ] Confirmar se secret é do app correto

#### Se `SIGNATURE_HEADER_VALUE: [MISSING]`:
- [ ] Verificar configuração webhook na Meta
- [ ] Confirmar se webhook está ativo

#### Se tudo OK:
- [ ] Remover logs de diagnóstico
- [ ] Manter apenas logs essenciais
- [ ] Testar resposta automática

## 🚀 7. PRÓXIMA AÇÃO

**1. Enviar DM agora**
**2. Analisar logs de diagnóstico**
**3. Identificar se problema é env ou implementação**
**4. Corrigir `META_APP_SECRET` se necessário**
**5. Validar assinatura e testar resposta**

O sistema agora tem diagnóstico completo para identificar exatamente por que a assinatura está inválida!
