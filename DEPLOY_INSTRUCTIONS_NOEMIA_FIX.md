# Instruções de Deploy - Correção NoemIA Portal Interno

## PROBLEMA IDENTIFICADO
- **Local (localhost:3001)**: ✅ Funcionando (sem erro de configuração)
- **Produção (portal.advnoemia.com.br)**: ❌ Com erro "A Noemia ainda nao foi configurada..."

## CAUSA RAIZ
A produção está usando uma versão antiga do código com `throws` em `apps/portal-backend/lib/services/noemia.ts`

## ARQUIVOS CORRIGIDOS (JÁ APLICADOS)
1. **`apps/portal-backend/lib/services/noemia.ts`**
   - Linha 255: Removido `throw new Error("A Noemia ainda nao foi configurada...")`
   - Linha 244: Removido `throw new Error("Faca login como cliente...")`
   - Linha 248: Removido `throw new Error("Faca login com perfil interno...")`
   - Linhas 322, 338: Convertidos throws para retornos amigáveis

2. **`apps/portal-backend/app/api/noemia/chat/route.ts`**
   - Mantido fallback funcional
   - Removidos logs temporários

## PASSOS PARA DEPLOY

### 1. Configurar Variáveis de Ambiente no Vercel
Acessar: https://vercel.com/dashboard → Projeto do portal → Settings → Environment Variables

Adicionar/verificar:
```
NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br
NEXT_PUBLIC_SUPABASE_URL=[URL_DO_SUPABASE_PRODUÇÃO]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[CHAVE_PÚBLICA_PRODUÇÃO]
SUPABASE_SECRET_KEY=[CHAVE_SECRETA_PRODUÇÃO]
OPENAI_API_KEY=[CONFIGURAR_NO_VERCEL]
OPENAI_MODEL=gpt-4o-mini
```

### 2. Fazer Deploy do Código Corrigido
```bash
# Na pasta apps/portal-backend
cd apps/portal-backend

# Instalar dependências (se necessário)
npm install

# Fazer deploy para Vercel
vercel --prod
```

### 3. Verificar Deploy
Após o deploy, testar:
```bash
curl -X POST "https://portal.advnoemia.com.br/api/noemia/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Teste pós deploy","audience":"staff","history":[]}'
```

Resposta esperada (sem erro):
```json
{
  "ok": true,
  "audience": "visitor", 
  "answer": "Olá! Sou a NoemIA. No momento estou operando em modo de configuração. Como posso te ajudar hoje?"
}
```

### 4. Teste Final
Acessar: https://portal.advnoemia.com.br/internal/advogada
- Clicar em NoemIA
- Enviar pergunta
- **NÃO deve aparecer**: "A Noemia ainda nao foi configurada..."
- **DEVE aparecer**: Resposta amigável no painel

## RESULTADO ESPERADO
- ✅ Sem mensagem de erro de configuração
- ✅ NoemIA responde no painel interno
- ✅ Local e produção com comportamento idêntico
- ✅ Fallback inteligente quando OpenAI falhar

## CONTINGÊNCIA
Se a chave OpenAI tiver problemas de billing:
- Manter as correções aplicadas
- O sistema usará resposta amigável automaticamente
- Sempre funcionará, nunca mostrará erro

## VALIDAÇÃO
Só considerar concluído quando:
1. ✅ Local continua funcionando
2. ✅ Produção também funciona  
3. ✅ Mensagem antiga desapareceu da web
4. ✅ NoemIA responde em portal.advnoemia.com.br/internal/advogada
