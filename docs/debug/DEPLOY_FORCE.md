# 🚀 Deploy Forçado - Comandos Exatos

## 📋 **Comandos para Deploy Imediato**

### **1. Commit e Push**:
```bash
# Adicionar tudo
git add .

# Commit
git commit -m "Fix API routes - minimal test route and middleware"

# Push
git push origin main
```

### **2. Verificar no Vercel**:
```
1. Abrir: https://vercel.com/advnoemiasite
2. Verificar: Deployments → Latest
3. Se build falhar → ver Build Logs
4. Se build OK → testar URLs
```

### **3. Testar Imediatamente**:
```bash
# Teste 1: API básica
curl -v "https://advnoemia.com.br/api/test"

# Teste 2: Página principal
curl -v "https://advnoemia.com.br/"

# Teste 3: Verificação webhook
curl -v "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test123"
```

## 🚨 **Se Continuar 404**

### **Opção A: Redeploy Manual no Vercel**:
```
1. Vercel → Deployments
2. Clicar nos 3 pontinhos → Redeploy
3. Aguardar deploy
4. Testar novamente
```

### **Opção B: Verificar Build Logs**:
```
Vercel → Deployments → Latest → Build Logs
Procurar por:
- TypeScript errors
- Module not found errors
- Build failed
```

### **Opção C: Limpar Cache Vercel**:
```
Vercel → Settings → Functions → Clear Cache
Redeploy manual
```

## 🎯 **Resultado Esperado**

### **Se Funcionar**:
```
curl "https://advnoemia.com.br/api/test"
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 7

API OK
```

### **Se Ainda 404**:
```
HTTP/1.1 404 Not Found
Content-Type: text/html
```

## 📞 **Suporte Imediato**

### **Verificar Logs no Vercel**:
```
Vercel → Functions → api/test → Logs
Deve mostrar: Function executed
```

### **Verificar Build no Vercel**:
```
Vercel → Deployments → Latest → Build Logs
Deve mostrar: Build completed
```

## 🚀 **Executar Agora**:

```bash
# 1. Fazer commit
git add .
git commit -m "Fix API routes - minimal test route"
git push origin main

# 2. Abrir Vercel
# https://vercel.com/advnoemiasite

# 3. Testar
curl "https://advnoemia.com.br/api/test"
```

**Faça isso agora mesmo!**
