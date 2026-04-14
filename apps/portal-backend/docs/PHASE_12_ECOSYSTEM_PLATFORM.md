# Fase 12 - Plataforma de Escala, Recorrencia e Expansao Premium

## Objetivo

Transformar o projeto de uma maquina confiavel de atendimento juridico em uma plataforma premium de valor continuo, sem contaminar o core juridico nem desorganizar o command center.

## Arquitetura oficial do ecossistema

### Core juridico protegido

- Operacao juridica principal
- Consulta, analise, retorno e continuidade juridica
- Casos, clientes, documentos, agenda, pagamentos, leads, command center e auditoria

Essas camadas continuam no dominio juridico principal e nao devem ser usadas como base improvisada para plano, comunidade, trilha ou produto educacional.

### Ecossistema adjacente

- Catalogo premium do ecossistema
- Planos, beneficios e recorrencia
- Conteudo premium e educacional
- Comunidade premium
- Produtos digitais
- Materiais premium

Essas camadas agora vivem em tabelas, workspaces, semanticas e telemetria proprios.

### Verticais futuras isoladas

- Trilhas certificadas
- Subprodutos coerentes
- Eventuais submarcas futuras

Entram depois, reaproveitando a fundacao da Fase 12 sem invadir o core.

## Separacoes arquiteturais obrigatorias

### Separacao de dados

- Tabelas `ecosystem_*` concentram catalogo, planos, beneficios, assinaturas, acessos, conteudo, progresso e comunidade.
- Tabelas juridicas continuam responsaveis apenas pelo core do atendimento.

### Separacao de estados

- Pagamento juridico transacional continua em `payments`.
- Recorrencia premium vive em `ecosystem_subscriptions`.
- Acesso continuo vive em `ecosystem_access_grants`.

### Separacao de experiencia

- `legal_client`: area juridica do cliente
- `plans_benefits`: planos e beneficios
- `premium_content`: conteudo premium
- `community`: comunidade
- `ecosystem_hub`: hub consolidado do ecossistema

## O que entra agora

- Fundacao de catalogo
- Fundacao de planos e beneficios
- Fundacao de assinatura e status recorrente
- Fundacao de acesso por grant
- Fundacao de conteudo premium com trilhas, modulos, unidades, assets e progresso
- Fundacao de comunidade com membership e estados
- Telemetria oficial de expansao
- Leitura executiva da plataforma premium

## O que fica para depois

- Cobranca recorrente automatizada
- Liberacao comercial massiva de assinatura
- Comunidade com interacao completa
- Certificacao operacional completa
- Submarca publica definitiva

## Evento e telemetria oficial da expansao

- `product_viewed`
- `product_selected`
- `plan_viewed`
- `subscription_interest`
- `subscription_started`
- `subscription_active`
- `subscription_paused`
- `subscription_canceled`
- `content_unlocked`
- `content_started`
- `content_completed`
- `member_joined`
- `member_active`
- `retention_signal`
- `churn_risk`
- `expansion_revenue_signal`
- `recurring_revenue_signal`

Esses eventos devem ser lidos como camada executiva propria da expansao, nunca como ruido dentro da leitura operacional do atendimento juridico.

## Regra de marca

- O core juridico continua sendo a referencia de confianca.
- O ecossistema premium compartilha marca, mas declara fronteira e linguagem propria.
- Submarca futura so deve surgir quando o catalogo, recorrencia e experiencia premium ja estiverem maduros.
