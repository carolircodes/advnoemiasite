# Guia de Testes - NoemIA Operational System

## Visão Geral

Este guia contém instruções detalhadas para testar manualmente todos os fluxos implementados no sistema operacional da NoemIA.

## Pré-requisitos

1. **Ambiente configurado** com todas as variáveis de ambiente
2. **Acesso ao painel interno** como staff/admin
3. **Cliente de teste** criado no sistema
4. **Caso de teste** criado para o cliente

## FASE 1 - Teste da NoemIA Operacional

### 1.1 Teste com Dados Reais (Staff)

**Passos:**
1. Acesse `/internal/advogada`
2. Clique na NoemIA (assistente)
3. Faça as seguintes perguntas:
   - "Qual a minha agenda hoje?"
   - "Quais clientes precisam de atenção?"
   - "Quantos casos críticos temos?"
   - "Status dos processos"

**Resultados Esperados:**
- Respostas com dados reais do banco
- Números específicos (ex: "3 tarefas críticas")
- Links para páginas relevantes
- Sem mensagens genéricas

### 1.2 Teste de Fallback

**Passos:**
1. Configure `OPENAI_API_KEY` com valor inválido
2. Repita as perguntas acima

**Resultados Esperados:**
- Respostas inteligentes via fallback
- Dados operacionais ainda funcionando
- Mensagem amigável sobre indisponibilidade

## FASE 2 - Teste de Atualização de Casos

### 2.1 Criação de Novo Caso

**Passos:**
1. Acesse `/internal/casos`
2. Clique "Novo Caso"
3. Preencha:
   - Cliente: cliente de teste
   - Área: Previdenciário
   - Título: "Caso Teste Automatização"
   - Resumo: "Caso para testar notificações"
   - Prioridade: Normal
   - Status: Em Análise
   - **Marque:** Visível para cliente e Notificar cliente
4. Salve

**Resultados Esperados:**
- Caso criado com sucesso
- Notificações enfileiradas (email + WhatsApp)
- Log de auditoria criado
- Evento registrado no case_events

### 2.2 Atualização de Status

**Passos:**
1. Abra o caso criado
2. Vá para seção "Status"
3. Altere para "Aguardando Documentos"
4. Preencha nota interna: "Cliente precisa enviar RG e CPF"
5. **Marque:** Visível para cliente e Notificar cliente
6. Salve

**Resultados Esperados:**
- Status atualizado
- Notificações disparadas
- Histórico registrado
- Timeline atualizada

### 2.3 Registro de Evento Manual

**Passos:**
1. Vá para seção "Andamento"
2. Clique "Registrar Atualização"
3. Preencha:
   - Tipo: Andamento
   - Título: "Contato com cliente realizado"
   - Descrição: "Cliente informado sobre próximos passos"
   - Resumo Público: "Entramos em contato para alinhar próximos documentos"
   - **Marque:** Visível para cliente e Notificar cliente
4. Salve

**Resultados Esperados:**
- Evento registrado
- Notificações enviadas
- Timeline visível para cliente

## FASE 3 - Teste de Notificações

### 3.1 Verificação da Fila

**Passos:**
1. Acesse o Supabase (painel admin)
2. Vá para tabela `notifications_outbox`
3. Verifique registros criados

**Resultados Esperados:**
- Registros com status "pending"
- Canais "email" e "whatsapp"
- Payload correto com dados do caso

### 3.2 Processamento Manual

**Passos:**
1. Execute o processador de notificações:
   ```bash
   curl -X POST https://advnoemia.com.br/api/internal/notifications/process
   ```
2. Verifique status na tabela `notifications_outbox`

**Resultados Esperados:**
- Status mudando para "sent" ou "failed"
- Logs em `audit_logs`
- Email recebido (testar com email real)
- WhatsApp recebido (se cliente tiver WhatsApp)

### 3.3 Teste de Falha e Retry

**Passos:**
1. Configure `RESEND_API_KEY` inválido
2. Crie nova atualização de caso
3. Process notificações
4. Verifique status "failed"
5. Corrija a chave
6. Process novamente

**Resultados Esperados:**
- Tentativas incrementadas
- Retry automático após falha
- Status final "sent" após correção

## FASE 4 - Teste de WhatsApp

### 4.1 Configuração do Cliente

**Passos:**
1. Edite cliente de teste
2. Adicione telefone WhatsApp válido
3. Marque preferência de notificação WhatsApp

### 4.2 Envio de Mensagem

**Passos:**
1. Crie atualização de caso
2. Marque notificação WhatsApp
3. Verifique recebimento no WhatsApp

**Resultados Esperados:**
- Mensagem formatada profissionalmente
- Conteúdo específico do caso
- Assinatura do escritório

### 4.3 Teste de Erro

**Passos:**
1. Configure telefone inválido
2. Tente enviar notificação
3. Verifique log de erro

**Resultados Esperados:**
- Erro registrado em `notifications_outbox`
- Log estruturado criado
- Tentativa de retry programada

## FASE 5 - Teste de Templates

### 5.1 Templates de Email

**Passos:**
1. Verifique emails recebidos
2. Confirme formatação profissional
3. Verifique personalização (nome do cliente)

**Resultados Esperados:**
- Saudação personalizada
- Estrutura clara: saudação, atualização, próximos passos, encerramento
- Sem dados técnicos expostos

### 5.2 Templates de WhatsApp

**Passos:**
1. Verifique mensagens WhatsApp
2. Confirme formatação para mobile
3. Verifique assinatura

**Resultados Esperados:**
- Texto conciso e claro
- Formatação adequada para WhatsApp
- Informações de contato

## FASE 6 - Teste de Logs

### 6.1 Logs Estruturados

**Passos:**
1. Execute várias operações
2. Verifique console do servidor
3. Consulte tabela `structured_logs`

**Resultados Esperados:**
- Logs formatados com timestamps
- Contexto completo (user, client, case)
- Dados sensíveis mascarados

### 6.2 Logs de Segurança

**Passos:**
1. Tente acesso não autorizado
2. Verifique logs de segurança

**Resultados Esperados:**
- Eventos de segurança registrados
- IPs e tentativas documentadas
- Alertas configurados

## FASE 7 - Teste de Performance

### 7.1 Carga de Notificações

**Passos:**
1. Crie 10 casos diferentes
2. Atualize todos simultaneamente
3. Monitore tempo de processamento

**Resultados Esperados:**
- Processamento em lote eficiente
- Sem timeouts
- Logs de performance

### 7.2 Concorrência

**Passos:**
1. Múltiplos usuários atualizando casos
2. Verifique integridade dos dados
3. Monitore locks

**Resultados Esperados:**
- Sem corrupção de dados
- Logs de concorrência
- Performance estável

## FASE 8 - Teste de UX

### 8.1 Interface do Painel

**Passos:**
1. Navegue pelo painel de casos
2. Teste filtros e busca
3. Verifique textos e labels

**Resultados Esperados:**
- Textos profissionais e claros
- Filtros funcionando
- Interface responsiva

### 8.2 Feedback Visual

**Passos:**
1. Realize operações
2. Observe feedbacks visuais
3. Verifique mensagens de erro/sucesso

**Resultados Esperados:**
- Feedbacks imediatos
- Mensagens úteis
- Guia claro para usuário

## Checklist de Validação

### Funcionalidades Críticas
- [ ] NoemIA responde com dados reais
- [ ] Atualizações de casos funcionam
- [ ] Notificações email enviadas
- [ ] Notificações WhatsApp enviadas
- [ ] Fila de notificações processa
- [ ] Logs estruturados registrados
- [ ] UX profissional e clara

### Segurança
- [ ] Dados sensíveis mascarados
- [ ] Logs de segurança funcionando
- [ ] Autenticação respeitada
- [ ] Autorização verificada

### Performance
- [ ] Operações rápidas (< 3s)
- [ ] Notificações processadas em lote
- [ ] Sem memory leaks
- [ ] Logs não impactam performance

### Robustez
- [ ] Fallback da NoemIA funciona
- [ ] Retry de notificações funciona
- [ ] Erros não quebram sistema
- [ ] Recuperação automática

## Troubleshooting Comum

### NoemIA não responde
1. Verificar `OPENAI_API_KEY`
2. Verificar conexão com Supabase
3. Verificar logs de erro

### Notificações não enviam
1. Verificar `RESEND_API_KEY`
2. Verificar `META_WHATSAPP_ACCESS_TOKEN`
3. Verificar tabela `notifications_outbox`

### WhatsApp não funciona
1. Verificar número do cliente
2. Verificar preferências de notificação
3. Verificar status na Meta

### Logs não aparecem
1. Verificar `NODE_ENV=development`
2. Verificar configuração do serviço de logs
3. Verificar permissões do banco

## Relatório de Testes

Use este template para documentar resultados:

```
Data: __/__/____
Testador: ___________
Ambiente: Produção/Desenvolvimento

Resultados:
- NoemIA Operacional: [ ] Passou [ ] Falhou
- Atualização de Casos: [ ] Passou [ ] Falhou
- Notificações Email: [ ] Passou [ ] Falhou
- Notificações WhatsApp: [ ] Passou [ ] Falhou
- Fila de Processamento: [ ] Passou [ ] Falhou
- Logs Estruturados: [ ] Passou [ ] Falhou
- UX Profissional: [ ] Passou [ ] Falhou

Issues Encontrados:
1. 
2. 
3. 

Próximos Passos:
1. 
2. 
3. 
```

## Conclusão

Após executar todos os testes, o sistema deve estar pronto para produção com:
- NoemIA operacional com dados reais
- Automação completa de notificações
- Logs estruturados e segurança
- UX profissional e intuitiva
- Robustez e performance adequadas
