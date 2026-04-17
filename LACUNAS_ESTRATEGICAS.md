# Lacunas Estratégicas

## Escala técnica

Faltam hoje, de forma clara:

- separação real entre marketing, portal autenticado, workers e domínio de conteúdo
- fila externa robusta para automações mais pesadas
- observabilidade centralizada com alertas, correlação e painéis
- rate limiting e proteção antiabuso consistentes
- CI/CD mínima obrigatória
- suíte de testes de regressão para fluxos críticos
- governança de schema e migrações mais rígida

## Crescimento orgânico

Falta quase toda a fundação editorial escalável:

- entidade de artigo
- autores
- categorias
- tags
- séries
- hubs de conteúdo
- cluster pages
- páginas por área jurídica
- páginas por localidade
- páginas programáticas governadas
- interlinking intencional
- sitemap segmentado por tipo de conteúdo
- canonical strategy multi-domínio
- schema markup editorial
- analytics de SEO até lead/cliente

## Distribuição multicanal

Já existe presença de canais, mas faltam:

- governança unificada de eventos por canal
- tolerância a falhas e retries mais explícitos
- reconciliação confiável entre mensagens, leads e pipeline comercial
- política uniforme de autenticação de webhooks
- dashboards operacionais por canal
- detecção e prevenção de duplicidade cross-channel
- fallback humano e SLA claros

## CRM, relacionamento e captação

Falta consolidar:

- pipeline comercial claramente separado do pipeline jurídico
- lead scoring confiável e visível
- etapas de relacionamento configuráveis
- automações com governança por objetivo
- cadência de follow-up auditável
- painéis de conversão por origem/campanha/conteúdo
- visão de jornada completa `canal -> lead -> triagem -> consulta -> pagamento -> cliente`

## Comunidade

Embora haja fundação estrutural, faltam:

- produto de comunidade definido
- regras de moderação
- onboarding e lifecycle de membros
- métricas de engajamento
- integração operacional com suporte/CRM/conteúdo
- política de acesso por plano realmente operacional

## Monetização digital

Faltam elementos para transformar monetização em máquina:

- catálogo governado de produtos
- pricing strategy integrada a analytics
- checkout e pós-compra com observabilidade forte
- recorrência/membership operacional
- fulfilment de produtos digitais maduro
- métricas de LTV, payback, conversão por oferta e recuperação
- esteira de conteúdo pago com governança editorial

## Cursos, bibliotecas e produtos jurídicos

Faltam:

- CMS/estrutura editorial para acervo jurídico
- taxonomia por tema, nível, formato e objetivo
- trilhas de conteúdo
- controle real de acesso
- player/consumo e progresso com UX madura
- material downloadable com governança
- rotinas de atualização jurídica e versionamento editorial

## Subdomínio exclusivo para artigos

Para um subdomínio de artigos funcionar de verdade, ainda falta:

- decidir se o ganho operacional compensa a perda potencial de transferência direta de autoridade frente à subpasta
- definir stack editorial dedicada
- modelar taxonomia editorial
- padronizar templates de artigo, categoria, tag, autor, série e hub
- desenhar canonical, hreflang se necessário, sitemap e robots segmentados
- estabelecer interlinking entre domínio principal e conteúdo
- medir indexação, CTR, conversão por cluster e autoridade temática

Conclusão estratégica:

- **hoje o projeto não tem base editorial madura para subdomínio**
- se o objetivo é ganhar SEO mais rápido, **subpasta é a melhor opção inicial**
- se a decisão for subdomínio por branding/operação, primeiro precisa existir uma operação editorial madura

## Prontidão real para app

Antes de iniciar um app, ainda faltam:

- backend estabilizado e desacoplado
- APIs externas mais consistentes e versionáveis
- auth/papéis/sessões revisados para mobile
- política de mídia e documentos para mobile
- push notifications
- analytics mobile
- offline parcial bem desenhado
- governança de conteúdo e comunidade amadurecida
- catálogo/produtos/assinaturas operacionais

Conclusão:

- iniciar app agora seria prematuro
- o app deve entrar só depois da consolidação web, conteúdo, monetização e operação

## Lacuna central de posicionamento

O projeto quer ser ao mesmo tempo:

- portal jurídico
- máquina de captação
- hub de IA
- CRM de relacionamento
- operação multicanal
- ecossistema de conteúdo
- base de comunidade
- plataforma de monetização
- futuro app

A maior lacuna estratégica não é técnica isolada. É **sequência e foco**.

Hoje falta uma hierarquia clara:

1. consolidar o core jurídico e operacional
2. consolidar growth/SEO/conteúdo
3. consolidar monetização e comunidade
4. só depois expandir para app/ecossistema completo
