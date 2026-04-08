# Checklist de Validação - Correções do Webhook Instagram

## ARQUIVOS ALTERADOS

### 1. `apps/portal-backend/app/api/meta/webhook/route.ts`
**Status: ALTERADO** 

**Mudanças implementadas:**
- Adicionada variável `INSTAGRAM_BUSINESS_ACCOUNT_ID` (linha 7)
- Endpoint corrigido: `/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages` (linha 89)
- Payload otimizado: adicionado `messaging_type: "RESPONSE"` (linha 99)
- 15 logs específicos para debugging
- Validação de variáveis críticas antes do envio
- Tratamento robusto de erros

### 2. `test_instagram_webhook_corrections.js` (NOVO)
**Status: CRIADO**

Arquivo de teste para validar todas as correções implementadas.

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

### Obrigatórias (já existem no ambiente)
- [x] `META_VERIFY_TOKEN` - Verificação GET do webhook
- [x] `META_APP_SECRET` - Validação HMAC-SHA256 do POST  
- [x] `INSTAGRAM_ACCESS_TOKEN` - Token de acesso à API Graph
- [x] `INSTAGRAM_BUSINESS_ACCOUNT_ID` - ID da conta comercial (AGORA UTILIZADO)

## VALIDAÇÃO DE FUNCIONALIDADES

### A. GET do Webhook (Verificação)
- [x] Usa `META_VERIFY_TOKEN` corretamente
- [x] Retorna challenge quando modo=subscribe
- [x] Retorna 403 quando token inválido

### B. POST do Webhook (Recebimento)
- [x] Usa `META_APP_SECRET` para validar assinatura
- [x] Processa estruturas messaging e changes
- [x] Extrai sender_id e message_text corretamente
- [x] Logs detalhados para debugging

### C. Envio de Resposta (Graph API)
- [x] Usa `INSTAGRAM_ACCESS_TOKEN` para autenticação
- [x] **NOVO:** Usa `INSTAGRAM_BUSINESS_ACCOUNT_ID` no endpoint
- [x] **NOVO:** Endpoint: `/{BUSINESS_ACCOUNT_ID}/messages`
- [x] **NOVO:** Payload com `messaging_type: "RESPONSE"`
- [x] **NOVO:** Validação de variáveis antes do envio

## LOGS IMPLEMENTADOS

### Logs de Recebimento
1. `INSTAGRAM_WEBHOOK_POST_RECEIVED` - Início do POST
2. `META_APP_SECRET_PRESENT` - Presença do secret
3. `META_VERIFY_TOKEN_PRESENT` - Presença do token
4. `INSTAGRAM_SIGNATURE_HEADER_RECEIVED` - Header da assinatura
5. `INSTAGRAM_SIGNATURE_VALIDATION_RESULT` - Resultado da validação

### Logs de Processamento
6. `INSTAGRAM_SENDER_ID_EXTRACTED` - ID do remetente
7. `INSTAGRAM_MESSAGE_TEXT_EXTRACTED` - Texto da mensagem

### Logs de Envio
8. `INSTAGRAM_BUSINESS_ACCOUNT_ID_PRESENT` - Presença do Business ID
9. `INSTAGRAM_ACCESS_TOKEN_PRESENT` - Presença do Access Token
10. `INSTAGRAM_GRAPH_API_URL` - URL completa da API
11. `INSTAGRAM_GRAPH_API_PAYLOAD` - Payload JSON formatado
12. `INSTAGRAM_GRAPH_API_STATUS` - Status HTTP da resposta
13. `INSTAGRAM_GRAPH_API_RESPONSE_BODY` - Corpo da resposta

### Logs de Erro/Sucesso
14. `INSTAGRAM_SEND_MESSAGE_SUCCESS` - Envio bem-sucedido
15. `INSTAGRAM_SEND_MESSAGE_FAILED` - Falha no envio (com motivo)

## CHECKLIST DE TESTE

### No Vercel (Deploy)
- [ ] Fazer deploy das alterações
- [ ] Verificar se build funciona sem erros
- [ ] Confirmar variáveis de ambiente no Vercel

### Na Meta (Configuração)
- [ ] Webhook URL: `https://advnoemia.com.br/api/meta/webhook`
- [ ] Verify Token: `noeminha_verify_2026`
- [ ] Campo "messages" assinado
- [ ] Permissões `instagram_manage_messages` e `pages_messaging`

### Teste Funcional
1. **Teste GET (Verificação)**
   ```
   https://advnoemia.com.br/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminia_verify_2026&hub.challenge=test123
   ```
   - [ ] Deve retornar status 200 com o challenge
   - [ ] Logs devem mostrar validação correta

2. **Teste POST (Mensagem Real)**
   - [ ] Enviar mensagem no Instagram Direct
   - [ ] Verificar logs no Vercel
   - [ ] Confirmar presença dos 15 logs esperados
   - [ ] Verificar se resposta foi enviada ao usuário

### Análise de Logs
- [ ] `INSTAGRAM_WEBHOOK_POST_RECEIVED` aparece?
- [ ] `INSTAGRAM_SIGNATURE_VALIDATION_RESULT: VALID`?
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID_PRESENT: true`?
- [ ] `INSTAGRAM_GRAPH_API_URL` mostra Business ID correto?
- [ ] `INSTAGRAM_SEND_MESSAGE_SUCCESS` ou erro detalhado?

## POSSÍVEIS PROBLEMAS E SOLUÇÕES

### Se logs não aparecem
- **Problema:** Webhook não está sendo chamado
- **Solução:** Verificar URL na Meta e configuração de campos

### Se `INSTAGRAM_SIGNATURE_VALIDATION_RESULT: INVALID`
- **Problema:** `META_APP_SECRET` incorreto
- **Solução:** Verificar variável no Vercel

### Se `INSTAGRAM_SEND_MESSAGE_FAILED: BUSINESS_ACCOUNT_ID missing`
- **Problema:** `INSTAGRAM_BUSINESS_ACCOUNT_ID` não configurado
- **Solução:** Adicionar variável no Vercel

### Se `INSTAGRAM_GRAPH_API_STATUS: 401`
- **Problema:** `INSTAGRAM_ACCESS_TOKEN` inválido ou expirado
- **Solução:** Gerar novo token na Meta

### Se `INSTAGRAM_GRAPH_API_STATUS: 400`
- **Problema:** Endpoint ou payload incorreto
- **Solução:** Verificar Business ID e estrutura do payload

## RESULTADO ESPERADO

Ao final deste processo, o Instagram Direct deve:
1. Receber mensagens normalmente
2. Processar eventos com logs detalhados
3. Responder automaticamente com "Olá! Recebi sua mensagem e já vou te ajudar."
4. Registrar todos os passos nos logs para debugging

## MONITORAMENTO

Após implementação, monitorar:
- Taxa de respostas enviadas
- Erros na Graph API
- Performance do webhook
- Logs de falha para diagnóstico rápido

---

**Status:** PRONTO PARA DEPLOY E TESTE
**Prioridade:** ALTA - Correção crítica de endpoint
**Impacto:** Restabelece respostas automáticas do Instagram
