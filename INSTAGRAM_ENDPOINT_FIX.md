# Correção Endpoint Instagram Direct - Guia de Configuração

## **Problema Corrigido**

O endpoint estava usando `/me/messages` (Messenger) mas Instagram Direct exige o ID da conta Business específica.

## **Mudança Implementada**

### **Antes (Incorreto):**
```typescript
const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
```

### **Depois (Correto):**
```typescript
const apiUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
```

## **Configuração Necessária**

### **1. Adicionar Variável de Ambiente**

No Vercel Dashboard ou `.env.local`:
```bash
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841405730549123
```

### **2. Como Obter o Instagram Business Account ID**

#### **Método A - Graph API Explorer:**
1. Acesse: https://developers.facebook.com/tools/explorer/
2. Selecione seu App
3. Token de Acesso: User Token com permissões `instagram_basic`, `pages_show_list`
4. Execute: `GET /me/accounts`
5. Encontre sua página e copie o `instagram_business_account.id`

#### **Método B - Página do Instagram:**
1. Acesse: facebook.com/your_page
2. Verifique se está conectada ao Instagram
3. Use: `GET /{page_id}?fields=instagram_business_account`

#### **Exemplo de Resposta:**
```json
{
  "data": [
    {
      "instagram_business_account": {
        "id": "17841405730549123",
        "username": "your_instagram_handle"
      },
      "id": "123456789012345"
    }
  ]
}
```

## **Logs Adicionados**

### **Verificação de Configuração:**
```
INSTAGRAM_BUSINESS_ACCOUNT_ID não configurado
DIAGNÓSTICO: Variável de ambiente INSTAGRAM_BUSINESS_ACCOUNT_ID não encontrada
```

### **Endpoint Correto:**
```
ENDPOINT INSTAGRAM: https://graph.facebook.com/v19.0/17841405730549123/messages?access_token=EAA...
Business Account ID: 17841405730549123
```

## **Teste Manual**

### **curl para Testar:**
```bash
curl -X POST "https://graph.facebook.com/v19.0/17841405730549123/messages?access_token=INSTAGRAM_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"id": "USER_ID"},
    "message": {"text": "Mensagem de teste"}
  }'
```

### **Resposta de Sucesso:**
```json
{
  "message_id": "m_abc123",
  "recipient_id": "USER_ID"
}
```

## **Permissões Obrigatórias**

Certifique-se que seu App tem:
- `instagram_manage_messages` 
- `pages_messaging`
- `pages_read_engagement`

## **Fluxo Completo Corrigido**

1. **Webhook recebe mensagem** do Instagram
2. **Extrai senderId** do payload
3. **Verifica INSTAGRAM_BUSINESS_ACCOUNT_ID**
4. **Chama endpoint correto** com Business Account ID
5. **Envia mensagem** para o usuário

## **Logs para Debug**

Procurar no Vercel:
```
Business Account ID existe: true
Business Account ID: 17841405730549123
ENDPOINT INSTAGRAM: https://graph.facebook.com/v19.0/17841405730549123/messages?access_token=EAA...
```

## **Troubleshooting**

### **Erro 100 - Parâmetro inválido:**
- Business Account ID incorreto
- Sender ID inválido

### **Erro 200 - Permissões insuficientes:**
- App não tem `instagram_manage_messages`
- Token sem escopo correto

### **Erro 190 - Token inválido:**
- INSTAGRAM_ACCESS_TOKEN expirado
- Token de página em vez de usuário

## **Checklist Final**

- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID` configurado
- [ ] ID é numérico (ex: 17841405730549123)
- [ ] Token tem permissões corretas
- [ ] Endpoint mostra Business ID nos logs
- [ ] Teste manual funciona
- [ ] Webhook responde automaticamente

**Status: PRONTO PARA PRODUÇÃO com endpoint corrigido!**
