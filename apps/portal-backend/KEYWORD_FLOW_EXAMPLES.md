# Fluxo Completo: Comentário -> DM Automática -> NoemIA

## Exemplo 1: Aposentadoria

### Passo 1: Comentário no Post
```
Usuário comenta: "posso me aposentar?"
```

### Passo 2: Detecção e DM Automática
```
DM enviado: "Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?"
```

### Passo 3: Contexto da Sessão
```json
{
  "source": "keyword_automation",
  "keyword": "aposentadoria",
  "theme": "previdenciario",
  "area": "previdenciário",
  "comment_id": "comment_123",
  "media_id": "media_789",
  "lead_temperature": "warm"
}
```

### Passo 4: Resposta do Usuário
```
Usuário responde: "Ainda não, nunca fiz pedido"
```

### Passo 5: Resposta da NoemIA
```
NoemIA: "Entendi... Faz sentido você ainda não ter feito pedido. O que pouca gente sabe é que o momento certo de agir faz toda a diferença. Você já contribuiu por quanto tempo com o INSS?"
```

---

## Exemplo 2: Banco

### Passo 1: Comentário no Post
```
Usuário comenta: "o banco está cobrando errado"
```

### Passo 2: Detecção e DM Automática
```
DM enviado: "Vi que você comentou sobre banco! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse problema com o banco vem acontecendo?"
```

### Passo 3: Contexto da Sessão
```json
{
  "source": "keyword_automation",
  "keyword": "banco",
  "theme": "bancario",
  "area": "bancário",
  "comment_id": "comment_456",
  "media_id": "media_789",
  "lead_temperature": "warm"
}
```

### Passo 4: Resposta do Usuário
```
Usuário responde: "Já faz 3 meses que começou"
```

### Passo 5: Resposta da NoemIA
```
NoemIA: "Perfeito... 3 meses já é tempo suficiente para agir. O que poucos entendem é que agir agora pode mudar completamente o resultado. Você já tentou conversar diretamente com o banco sobre isso?"
```

---

## Exemplo 3: Pensão

### Passo 1: Comentário no Post
```
Usuário comenta: "não recebo pensão dos meus filhos"
```

### Passo 2: Detecção e DM Automática
```
DM enviado: "Vi que você comentou sobre pensão! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe algum acordo ou decisão judicial sobre a pensão?"
```

### Passo 3: Contexto da Sessão
```json
{
  "source": "keyword_automation",
  "keyword": "pensão",
  "theme": "familia",
  "area": "família",
  "comment_id": "comment_789",
  "media_id": "media_789",
  "lead_temperature": "warm"
}
```

### Passo 4: Resposta do Usuário
```
Usuário responde: "Não tem nada formalizado"
```

### Passo 5: Resposta da NoemIA
```
NoemIA: "Entendi... Faz sentido não ter nada formalizado ainda. Dependendo da situação, pode existir um direito que ainda não foi reconhecido. Seus filhos são menores de idade ou já maiores?"
```

---

## Exemplo 4: Divórcio

### Passo 1: Comentário no Post
```
Usuário comenta: "quero fazer divórcio"
```

### Passo 2: Detecção e DM Automática
```
DM enviado: "Vi que você comentou sobre divórcio! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Vocês já estão separados ou ainda moram juntos?"
```

### Passo 3: Contexto da Sessão
```json
{
  "source": "keyword_automation",
  "keyword": "divórcio",
  "theme": "familia",
  "area": "família",
  "comment_id": "comment_012",
  "media_id": "media_789",
  "lead_temperature": "warm"
}
```

### Passo 4: Resposta do Usuário
```
Usuário responde: "Já nos separamos, mas moramos juntos ainda"
```

### Passo 5: Resposta da NoemIA
```
NoemIA: "Entendi... Essa situação é mais comum do que parece. O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo vocês estão separados de fato?"
```

---

## Exemplo 5: Contrato

### Passo 1: Comentário no Post
```
Usuário comenta: "quebraram contrato comigo"
```

### Passo 2: Detecção e DM Automática
```
DM enviado: "Vi que você comentou sobre contrato! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O contrato foi escrito ou verbal?"
```

### Passo 3: Contexto da Sessão
```json
{
  "source": "keyword_automation",
  "keyword": "contrato",
  "theme": "civil",
  "area": "cível",
  "comment_id": "comment_345",
  "media_id": "media_789",
  "lead_temperature": "warm"
}
```

### Passo 4: Resposta do Usuário
```
Usuário responde: "Era um contrato escrito"
```

### Passo 5: Resposta da NoemIA
```
NoemIA: "Perfeito... Contrato escrito dá mais segurança. O que pouca gente sabe é que existem diferentes caminhos para resolver isso. Você já tentou negociar uma solução amigável?"
```

---

## Logs do Fluxo Completo

### Exemplo de Logs para Aposentadoria

```json
{
  "timestamp": "2026-04-09T12:00:00.000Z",
  "level": "info",
  "event": "KEYWORD_FLOW_TRIGGERED",
  "data": {
    "commentId": "comment_123",
    "userId": "user_456",
    "username": "joao_silva",
    "commentText": "posso me aposentar?",
    "mediaId": "media_789"
  }
}

{
  "timestamp": "2026-04-09T12:00:01.000Z",
  "level": "info",
  "event": "KEYWORD_DETECTED",
  "data": {
    "keyword": "aposentadoria",
    "theme": "previdenciario",
    "area": "previdenciário",
    "commentText": "posso me aposentar?"
  }
}

{
  "timestamp": "2026-04-09T12:00:02.000Z",
  "level": "info",
  "event": "AUTO_DM_SENT",
  "data": {
    "commentId": "comment_123",
    "userId": "user_456",
    "keyword": "aposentadoria",
    "message": "Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?"
  }
}

{
  "timestamp": "2026-04-09T12:00:03.000Z",
  "level": "info",
  "event": "KEYWORD_SESSION_CREATED",
  "data": {
    "sessionId": "session_789",
    "userId": "user_456",
    "keyword": "aposentadoria",
    "theme": "previdenciario",
    "area": "previdenciário"
  }
}

{
  "timestamp": "2026-04-09T12:00:04.000Z",
  "level": "info",
  "event": "KEYWORD_FLOW_COMPLETED",
  "data": {
    "commentId": "comment_123",
    "userId": "user_456",
    "keyword": "aposentadoria",
    "theme": "previdenciario",
    "dmSent": true,
    "sessionCreated": true
  }
}
```

---

## Vantagens do Fluxo Refinado

### 1. Perguntas Específicas
- **Antes**: "Quer saber mais?" (genérico)
- **Depois**: "Você já fez algum pedido no INSS?" (específico)

### 2. Maior Taxa de Resposta
- Perguntas específicas geram mais engajamento
- Usuário se sente compreendido
- Contexto já estabelecido

### 3. Qualificação Imediata
- Lead já classificado como "warm"
- Tema jurídico identificado
- Contexto salvo para continuidade

### 4. Transição Suave
- DM inicial parece continuação natural
- NoemIA continua com contexto preservado
- Experiência fluida para o usuário

---

## Métricas Esperadas

### Conversão
- **Taxa de resposta**: 60-80% (vs 30-40% genérico)
- **Qualificação**: 100% leads "warm"
- **Continuidade**: 70-90% prosseguem conversa

### Tempo
- **Resposta inicial**: Imediata
- **Contexto preservado**: 100%
- **Handoff para NoemIA**: < 1 segundo

### Experiência
- **Satisfação**: Alta (perguntas relevantes)
- **Engajamento**: Sustentado
- **Conversão**: Aumentada

---

## Configuração de Teste

### Como Testar o Fluxo

1. **Comentar em post**: Use palavra-chave específica
2. **Verificar DM**: Receber mensagem específica
3. **Responder**: Dar continuidade à conversa
4. **Validar contexto**: NoemIA deve usar tema

### Palavras-Chave para Teste

- `aposentadoria` -> "Você já fez algum pedido no INSS?"
- `banco` -> "Há quanto tempo esse problema com o banco vem acontecendo?"
- `pensão` -> "Já existe algum acordo ou decisão judicial sobre a pensão?"
- `divórcio` -> "Vocês já estão separados ou ainda moram juntos?"
- `contrato` -> "O contrato foi escrito ou verbal?"

---

**Status**: Production Ready  
**Versão**: 2.0 (Refinado)  
**Última atualização**: 2026-04-09
