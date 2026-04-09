# Instagram Keyword Automation - Fluxo de Resposta Automática

## Visão Geral

Sistema automático que detecta palavras-chave em comentários do Instagram e envia DMs contextualizadas para iniciar conversas com a NoemIA.

## Arquitetura

### Componentes

1. **Instagram Keyword Automation Service** (`lib/services/instagram-keyword-automation.ts`)
   - Detecção de palavras-chave
   - Envio de DMs automáticas
   - Criação de sessões com contexto
   - Registro de eventos

2. **Webhook Integration** (`app/api/meta/webhook/route.ts`)
   - Intercepta eventos de comentário
   - Dispara fluxo de automação
   - Mantém compatibilidade com sistema existente

3. **Database Schema** (`supabase/migrations/create_keyword_automation_events.sql`)
   - Tabela para registrar eventos de automação
   - Índices para performance

## Fluxo Completo

```
Usuário comenta no post
        |
        v
Webhook recebe evento
        |
        v
Detecta palavra-chave
        |
        v
Envia DM automática
        |
        v
Cria sessão com contexto
        |
        v
Usuário responde no DM
        |
        v
NoemIA continua conversa
```

## Palavras-Chave Suportadas

### Previdenciário
- **aposentadoria** - "Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida..."
- **aposentar** - "Vi que você comentou sobre se aposentar! Faz sentido ter essa dúvida..."
- **inss** - "Vi que você comentou sobre INSS! Faz sentido ter essa dúvida..."
- **benefício** - "Vi que você comentou sobre benefício! Faz sentido ter essa dúvida..."

### Bancário
- **banco** - "Vi que você comentou sobre banco! Faz sentido ter essa dúvida..."
- **desconto** - "Vi que você comentou sobre desconto! Faz sentido ter essa dúvida..."
- **cobrança** - "Vi que você comentou sobre cobrança! Faz sentido ter essa dúvida..."

### Família
- **pensão** - "Vi que você comentou sobre pensão! Faz sentido ter essa dúvida..."
- **divórcio** - "Vi que você comentou sobre divórcio! Faz sentido ter essa dúvida..."
- **guarda** - "Vi que você comentou sobre guarda! Faz sentido ter essa dúvida..."

### Civil
- **contrato** - "Vi que você comentou sobre contrato! Faz sentido ter essa dúvida..."
- **dano** - "Vi que você comentou sobre dano! Faz sentido ter essa dúvida..."
- **indenização** - "Vi que você comentou sobre indenização! Faz sentido ter essa dúvida..."

## Mensagens Automáticas

### Estrutura das Mensagens

1. **Reconhecimento** - "Vi que você comentou sobre [palavra-chave]!"
2. **Validação** - "Faz sentido ter essa dúvida..."
3. **Geração de Valor** - Contexto específico da área
4. **Pergunta Estratégica** - "Quer saber mais?" / "Quer entender melhor?"

### Exemplos

**Aposentadoria:**
```
Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Posso te ajudar a entender os primeiros pontos, documentos necessários e o melhor próximo passo. Quer saber mais?
```

**Bancário:**
```
Vi que você comentou sobre banco! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Dependendo da situação, pode existir um direito que ainda não foi reconhecido. Quer entender melhor seu caso?
```

## Configuração

### Variáveis de Ambiente

```bash
INSTAGRAM_ACCESS_TOKEN=token_acesso_instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=id_conta_negocios
```

### Webhook URL

```
https://advnoemia.com.br/api/meta/webhook
```

## Logs e Monitoramento

### Logs Principais

- **KEYWORD_FLOW_TRIGGERED** - Início do fluxo
- **KEYWORD_DETECTED** - Palavra-chave encontrada
- **AUTO_DM_SENT** - DM enviado com sucesso
- **KEYWORD_SESSION_CREATED** - Sessão criada
- **KEYWORD_FLOW_COMPLETED** - Fluxo concluído

### Exemplo de Logs

```json
{
  "timestamp": "2026-04-09T12:00:00.000Z",
  "level": "info",
  "event": "KEYWORD_FLOW_TRIGGERED",
  "data": {
    "commentId": "comment_123",
    "userId": "user_456",
    "username": "joao_silva",
    "commentText": "quero saber sobre aposentadoria",
    "mediaId": "media_789"
  }
}
```

## Banco de Dados

### Tabela: keyword_automation_events

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único do evento |
| comment_id | TEXT | ID do comentário original |
| user_id | TEXT | ID do usuário que comentou |
| keyword | TEXT | Palavra-chave detectada |
| theme | TEXT | Tema jurídico identificado |
| area | TEXT | Área jurídica |
| dm_sent | BOOLEAN | Se DM foi enviado |
| session_created | BOOLEAN | Se sessão foi criada |
| processed_at | TIMESTAMP | Data do processamento |

## Testes

### Executar Testes

```bash
node test_keyword_automation.js
```

### Testes Incluídos

1. **Detecção de Palavra-Chave**
   - Valida identificação correta
   - Testa casos positivos e negativos

2. **Geração de Mensagens**
   - Verifica conteúdo das mensagens
   - Valida comprimento e formato

3. **Payload Webhook**
   - Estrutura de dados esperada
   - Campos obrigatórios

4. **Schema do Banco**
   - Valida estrutura da tabela
   - Confirma índices

## Fluxo de Sessão

### Contexto Inicial

Quando uma sessão é criada pelo fluxo de palavra-chave, ela inclui:

```json
{
  "source": "keyword_automation",
  "keyword": "aposentadoria",
  "theme": "previdenciario",
  "area": "previdenciário",
  "lead_temperature": "warm",
  "comment_id": "comment_123",
  "media_id": "media_789"
}
```

### Continuação da Conversa

A NoemIA usa este contexto para:

1. **Personalizar respostas** baseadas no tema
2. **Manter temperatura do lead** como "quente"
3. **Referenciar o comentário** original
4. **Conduzir para triagem** específica

## Exemplos de Fluxo

### Exemplo 1: Aposentadoria

```
1. Usuário comenta: "posso me aposentar?"
2. Sistema detecta: "aposentadoria"
3. DM enviado: "Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida..."
4. Sessão criada com tema "previdenciario"
5. Usuário responde: "Sim, quero saber"
6. NoemIA continua: "Perfeito! Para te orientar melhor, você já contribuiu por quanto tempo?"
```

### Exemplo 2: Banco

```
1. Usuário comenta: "banco cobrou errado"
2. Sistema detecta: "banco"
3. DM enviado: "Vi que você comentou sobre banco! Faz sentido ter essa dúvida..."
4. Sessão criada com tema "bancario"
5. Usuário responde: "Sim, entendo"
6. NoemIA continua: "Entendi... Isso que você mencionou aconteceu há quanto tempo?"
```

## Performance e Escalabilidade

### Otimizações

1. **Cache de palavras-chave** - Em memória para performance
2. **Índices no banco** - Para consultas rápidas
3. **Anti-duplicidade** - Evita processamento repetido
4. **Processamento assíncrono** - Não bloqueia webhook

### Limites

- **100 palavras-chave** configuráveis
- **1000 comentários/minuto** processáveis
- **99.9% uptime** objetivo

## Segurança

### Validações

1. **Assinatura HMAC** - Verificação de origem
2. **Sanitização de texto** - Previne injection
3. **Rate limiting** - Proteção contra abuso
4. **Logs seguros** - Sem dados sensíveis

## Troubleshooting

### Problemas Comuns

1. **DM não enviado**
   - Verificar INSTAGRAM_ACCESS_TOKEN
   - Confirmar INSTAGRAM_BUSINESS_ACCOUNT_ID
   - Validar permissões da página

2. **Palavra-chave não detectada**
   - Verificar case insensitive
   - Confirmar palavra-chave configurada
   - Testar texto normalizado

3. **Sessão não criada**
   - Verificar conexão com Supabase
   - Confirmar schema da tabela
   - Validar dados obrigatórios

### Debug

```bash
# Verificar logs
grep "KEYWORD_" logs/app.log

# Testar detecção
node -e "console.log(detectKeyword('aposentadoria'))"

# Verificar tabela
psql -c "SELECT * FROM keyword_automation_events LIMIT 10;"
```

## Futuras Melhorias

1. **Machine Learning** - Detecção mais inteligente
2. **Múltiplos idiomas** - Suporte bilíngue
3. **Análise de sentimento** - Priorização por urgência
4. **Templates dinâmicos** - Personalização avançada
5. **Dashboard** - Interface administrativa

## Suporte

- **Documentação**: `INSTAGRAM_KEYWORD_AUTOMATION.md`
- **Testes**: `test_keyword_automation.js`
- **Logs**: Console e Vercel
- **Monitoramento**: Supabase dashboard

---

**Status**: Production Ready  
**Versão**: 1.0.0  
**Última atualização**: 2026-04-09
