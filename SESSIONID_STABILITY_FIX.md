# 🔧 SESSIONID ESTÁVEL - CORREÇÃO CRÍTICA IMPLEMENTADA

## 📋 ARQUIVOS ALTERADOS

### **1. Backend - Schema**
**Arquivo**: `apps/portal-backend/lib/domain/portal.ts`
**Alteração**: Adicionado campo opcional `sessionId`
```typescript
export const askNoemiaSchema = z.object({
  // ... campos existentes
  sessionId: z.string().trim().max(100).optional(),
  // ... resto do schema
});
```

### **2. Backend - Lógica de Geração**
**Arquivo**: `apps/portal-backend/lib/services/noemia.ts`
**Alteração**: Priorização de sessionId estável
```typescript
// ANTES (instável):
const sessionId = profile?.id || `visitor-${Buffer.from((currentPath || "site") + input.message).toString("base64").slice(0, 16)}`;

// AGORA (estável):
const sessionId = input.sessionId || profile?.id || `visitor-${Buffer.from((currentPath || "site") + input.message).toString("base64").slice(0, 16)}`;
```

**Ordem de Prioridade**:
1. `input.sessionId` (frontend estável)
2. `profile?.id` (cliente logado)
3. Fallback Base64 (apenas se nenhum dos dois)

### **3. Frontend - Geração e Persistência**
**Arquivo**: `assets/js/noemia-chat.js`
**Alterações**:
- Construtor: Inicializa `this.sessionId`
- Método `getOrCreateSessionId()`
- Método `generateUUID()`
- Payload atualizado com `sessionId`

---

## 🔧 IMPLEMENTAÇÃO DETALHADA

### **Geração de SessionId Estável**
```javascript
getOrCreateSessionId() {
  // Apenas para visitantes do site público
  if (this.environment !== 'public') {
    return null; // Portal usa profile.id
  }

  const storageKey = 'noemia_visitor_session_id';
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    // Gerar ID estável: visitor-UUID
    sessionId = 'visitor-' + this.generateUUID();
    localStorage.setItem(storageKey, sessionId);
    console.log('[NoemIA] Novo sessionId gerado:', sessionId);
  } else {
    console.log('[NoemIA] SessionId existente recuperado:', sessionId);
  }

  return sessionId;
}
```

### **UUID V4 Simples**
```javascript
generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### **Payload da API**
```javascript
// Formato público (site)
payload = {
  message: message,
  audience: audience,
  currentPath: window.location.pathname,
  history: history,
  sessionId: this.sessionId // ✅ Incluído
};
```

---

## 🎯 ESTABILIDADE POR CANAL

### **✅ Site Público (Visitantes)**
- **Antes**: `visitor-dGVzdA==` (muda a cada mensagem)
- **Agora**: `visitor-a8f3c2d1-b4e5-4a9c-8f7d-9e2c6b1a5f3` (persistente)
- **Armazenamento**: `localStorage['noemia_visitor_session_id']`
- **Duração**: Até limpeza manual do browser

### **✅ Portal (Clientes/Staff)**
- **Clientes**: `profile.id` (já era estável)
- **Staff**: `profile.id` (já era estável)
- **Mudança**: Nenhuma

### **✅ WhatsApp**
- **Fonte**: `message.from.id` (ID do WhatsApp)
- **Estabilidade**: Já era estável
- **Mudança**: Nenhuma

### **✅ Instagram**
- **Fonte**: `messaging.sender.id` (ID do Instagram)
- **Estabilidade**: Já era estável
- **Mudança**: Nenhuma

---

## 🔄 COMO FUNCIONA

### **Fluxo de Visitante no Site:**
1. **Primeira Mensagem**: Gera `visitor-UUID` → salva no localStorage
2. **Mensagens Seguintes**: Recupera mesmo ID do localStorage
3. **Backend**: Recebe `input.sessionId` estável
4. **SessionContext**: Usa mesmo `sessionId` para memória
5. **Painel de Leads**: Um lead por visitante (não duplica)

### **Exemplo Real:**
```javascript
// Primeira visita
localStorage['noemia_visitor_session_id'] = 'visitor-a8f3c2d1-b4e5-4a9c-8f7d-9e2c6b1a5f3'

// Mensagens seguintes (mesma sessão)
sessionId = 'visitor-a8f3c2d1-b4e5-4a9c-8f7d-9e2c6b1a5f3'
```

---

## ✅ BENFÍCIOS ALCANÇADOS

### **1. Eliminação de Duplicação**
- **Antes**: Cada mensagem = novo lead
- **Agora**: Um lead por visitante

### **2. Memória Contínua**
- SessionContext mantido entre mensagens
- Triagem não quebra
- Contexto preservado

### **3. Painel de Leads Limpo**
- Sem duplicação por mensagem
- Um lead real por pessoa
- Métricas corretas

### **4. Compatibilidade Mantida**
- Clientes logados: `profile.id` (sem mudança)
- WhatsApp/Instagram: IDs da plataforma (sem mudança)
- Apenas visitantes: novo sistema estável

---

## 🚀 CRITÉRIOS DE SUCESSO

✅ **Padronização**: SessionId estável em todos os canais  
✅ **Sem Duplicação**: Visitante gera apenas um lead  
✅ **Memória Contínua**: SessionContext preservado  
✅ **Compatibilidade**: Canais existentes inalterados  
✅ **Mínima Alteração**: Mudança focada e segura  
✅ **Fallback Mantido**: Base64 como último recurso  

**Sistema 100% estabilizado e pronto para produção! 🎯**
