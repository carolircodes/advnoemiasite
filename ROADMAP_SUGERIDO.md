# Roadmap Técnico Sugerido

## Fase 1: Corrigir fundamentos

Objetivo: parar de acumular risco escondido.

### Prioridades

1. corrigir segurança periférica
2. higienizar repositório e artefatos sensíveis
3. instituir disciplina mínima de engenharia
4. estabilizar core do portal

### Entregas

- proteger webhook do Telegram
- remover arquivos sensíveis do Git e implantar scanner de segredos
- criar CI mínima com build, typecheck, lint e testes
- criar scripts oficiais de `lint`, `typecheck` e `test`
- revisar endpoints públicos para rate limiting
- revisar coleta/retenção de IP e user-agent
- reduzir logging ad hoc e padronizar observabilidade
- organizar raiz do repositório e arquivar legado

## Fase 2: Fortalecer arquitetura

Objetivo: tornar a base sustentável para time e crescimento.

### Prioridades

1. separar domínios técnicos
2. reduzir acoplamento
3. endurecer governança de schema
4. modularizar IA e canais

### Entregas

- separar layout e política de metadata pública vs autenticada
- modularizar `noemia-core` e `channel-conversation-router`
- consolidar camada de conversa, handoff e comercial
- eliminar compatibilidades legadas desnecessárias
- tornar migrations e validação de schema mais rígidas
- definir boundaries entre:
  - portal jurídico core
  - growth/public intake
  - social channels
  - monetização
  - ecossistema expandido

## Fase 3: Preparar escala

Objetivo: construir infraestrutura de crescimento e operação confiável.

### Prioridades

1. CRM e funil confiáveis
2. analytics reais
3. conteúdo e SEO estruturados
4. automação robusta

### Entregas

- modelagem clara de jornada `origem -> lead -> consulta -> pagamento -> cliente`
- painéis por canal, conteúdo e conversão
- stack editorial real
- taxonomia de artigos, áreas, localidades, autores e hubs
- páginas SEO escaláveis
- sitemap segmentado
- schema markup avançado
- interlinking e governança editorial
- decidir arquitetura final de artigos:
  - preferência técnica inicial: subpasta
  - subdomínio apenas se houver operação madura

## Fase 4: Habilitar crescimento e novos produtos

Objetivo: expandir sem perder controle.

### Prioridades

1. monetização digital madura
2. conteúdo premium e biblioteca
3. comunidade e membership
4. só então iniciar app

### Entregas

- catálogo de produtos jurídicos e educacionais governado
- membership/assinatura com lifecycle operacional
- biblioteca jurídica e trilhas de conteúdo
- comunidade com onboarding, moderação e métricas
- integração entre conteúdo, CRM e monetização
- APIs estáveis para consumo externo/mobile
- push, mídia, sessão e analytics mobile-ready

## Entrada do app no roadmap

O app deve entrar **somente no final da Fase 4**.

Motivo:

- antes disso, o web ainda precisa consolidar core, SEO, conteúdo, CRM, monetização e operação
- app agora congelaria prematuramente uma base ainda em reorganização
- o custo de construir app sobre backend ainda mutável seria alto

## Estrutura sugerida para domínio/subdomínio no futuro

### Curto e médio prazo

- domínio principal: institucional + crescimento
- portal: `portal.advnoemia.com.br`
- artigos: preferencialmente `/artigos` no domínio principal até maturidade editorial

### Após maturidade editorial

Se houver razão estratégica real:

- `portal.advnoemia.com.br` para área autenticada
- `artigos.advnoemia.com.br` apenas com operação editorial madura
- futuros hubs separados só quando houver produto, operação e governança próprios
