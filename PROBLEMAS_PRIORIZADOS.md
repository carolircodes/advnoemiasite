# Problemas Priorizados

## Critérios

Cada item abaixo traz:

- problema
- severidade
- impacto técnico
- impacto no negócio
- evidência
- sugestão de correção

## 1. Webhook do Telegram sem autenticação visível

- Severidade: `crítica`
- Impacto técnico: permite processamento de payloads sem prova de origem; aumenta superfície para abuso, spam e poluição operacional.
- Impacto no negócio: risco de automações erradas, ruído operacional, resposta indevida e incidente de segurança.
- Evidência: `apps/portal-backend/app/api/telegram/webhook/route.ts:5-26`
- Sugestão: exigir secret/token no path ou header, validar origem, registrar assinatura/nonce e aplicar rate limit.

## 2. Artefatos sensíveis de pagamento versionados no Git

- Severidade: `crítica`
- Impacto técnico: expõe payloads, token e dados de teste em repositório versionado.
- Impacto no negócio: risco reputacional, fragilidade de compliance e cultura insegura de handling de credenciais/dados.
- Evidência:
  - `git ls-files` confirma versionamento de `apps/portal-backend/mp-card-token.json`, `apps/portal-backend/mp-payment.json`, `apps/portal-backend/mp-test-user.json`
  - `apps/portal-backend/mp-payment.json:1`
- Sugestão: remover do versionamento, rotacionar o que for aplicável, criar política de fixtures sanitizadas e scanner de segredos no CI.

## 3. Arquitetura mistura marketing, portal, growth, IA e ecossistema no mesmo app

- Severidade: `alta`
- Impacto técnico: alto acoplamento, deploy mais arriscado, evolução mais lenta, maior blast radius.
- Impacto no negócio: dificulta escalar produto, SEO, aquisição e operação sem regressões.
- Evidência:
  - `apps/portal-backend/docs/PORTAL_PRODUCT.md:11-16`
  - `apps/portal-backend/docs/PORTAL_PRODUCT.md:109-110`
- Sugestão: separar progressivamente domínio de marketing/editorial, portal autenticado e workers/eventos.

## 4. SEO editorial praticamente inexistente para a ambição declarada

- Severidade: `alta`
- Impacto técnico: ausência de malha editorial, taxonomia e indexação estruturada.
- Impacto no negócio: limita crescimento orgânico, autoridade temática e aquisição recorrente.
- Evidência:
  - `apps/portal-backend/app/sitemap.ts:5-21`
  - `/triagem` é redirect e não página editorial real em `apps/portal-backend/app/triagem/page.tsx:20-25`
- Sugestão: criar arquitetura dedicada de conteúdo com taxonomy, author pages, hubs, clusters, internal linking e sitemaps segmentados.

## 5. Projeto ainda não está pronto para subdomínio de artigos forte

- Severidade: `alta`
- Impacto técnico: faltam entidades, pipeline editorial, governança cross-domain e analytics por conteúdo.
- Impacto no negócio: risco de criar estrutura bonita, mas fraca em SEO e difícil de operar.
- Evidência:
  - ausência de CMS/modelagem editorial no app
  - sitemap mínimo
  - inexistência de rotas de artigos, autores, categorias e tags no App Router principal
- Sugestão: priorizar primeiro arquitetura de conteúdo; decidir subpasta vs subdomínio depois do core editorial.

## 6. Expansão do “ecossistema” antes da consolidação do core

- Severidade: `alta`
- Impacto técnico: aumenta complexidade de schema, superfície de manutenção e custo cognitivo.
- Impacto no negócio: consome foco em estruturas ainda não monetizadas/operadas de fato.
- Evidência: `apps/portal-backend/supabase/migrations/20260414150000_phase12_ecosystem_platform_foundation.sql:1-120`
- Sugestão: congelar expansão estrutural do ecossistema até consolidar portal, growth, CRM, conteúdo e operação.

## 7. Pouca disciplina de testes e ausência de CI

- Severidade: `alta`
- Impacto técnico: regressões passam com facilidade, confiança baixa para refatorar.
- Impacto no negócio: cada avanço aumenta risco operacional e custo de manutenção.
- Evidência:
  - só 4 testes em `apps/portal-backend/tests`
  - ausência de script `test` e `lint` em `apps/portal-backend/package.json:8-27`
  - `.github` inexistente no repositório
- Sugestão: instituir CI mínima com build, typecheck, lint, testes de domínio e smoke tests de rotas críticas.

## 8. Repositório com baixa governança e poluição operacional

- Severidade: `alta`
- Impacto técnico: dificulta navegação, onboarding, auditoria e manutenção.
- Impacto no negócio: reduz velocidade de equipe e aumenta erros por contexto difuso.
- Evidência:
  - `94` arquivos na raiz
  - dezenas de relatórios `.md`, `.html` estáticos, scripts e diagnósticos misturados à aplicação
- Sugestão: separar `docs/`, `archive/`, `legacy-static/` e manter a raiz enxuta.

## 9. Complexidade excessiva em arquivos centrais de conversa/IA

- Severidade: `alta`
- Impacto técnico: baixa legibilidade, alto risco de regressão, difícil modularização.
- Impacto no negócio: torna lenta a evolução de automação multicanal e difícil treinar equipe.
- Evidência:
  - `apps/portal-backend/lib/ai/noemia-core.ts`
  - `apps/portal-backend/lib/services/channel-conversation-router.ts`
- Sugestão: separar engine, policy, orchestration, persistence, handoff, monetization e analytics em módulos menores e testáveis.

## 10. Sinais de schema drift e compatibilidade legado em área crítica

- Severidade: `alta`
- Impacto técnico: o código já convive com colunas faltantes e payloads alternativos; risco de divergência entre ambientes.
- Impacto no negócio: incidentes difíceis de diagnosticar em produção e migrações menos confiáveis.
- Evidência: lógica de fallback em `apps/portal-backend/lib/services/conversation-persistence.ts`
- Sugestão: endurecer governança de schema, eliminar modos legados e tornar migrations + validações bloqueantes.

## 11. Duplicação de tipo/interface no mesmo arquivo

- Severidade: `média`
- Impacto técnico: piora manutenção e legibilidade; sinal de evolução sem limpeza.
- Impacto no negócio: acelera dívida técnica e confusão entre times.
- Evidência: `apps/portal-backend/lib/services/conversation-persistence.ts:7-24` e `:50-84`
- Sugestão: consolidar interface única e separar tipos por domínio.

## 12. Logging inconsistente e excessivamente ad hoc

- Severidade: `média`
- Impacto técnico: observabilidade desigual, ruído, dificuldade de busca/alerta.
- Impacto no negócio: investigação de incidentes fica mais lenta.
- Evidência:
  - `apps/portal-backend/lib/services/anti-spam-guard.ts:31-118`
  - múltiplos `console.*` em serviços e componentes
- Sugestão: padronizar logger estruturado, níveis, correlation IDs e política por domínio.

## 13. Intake público coleta IP e user-agent sem política visível de retenção/minimização

- Severidade: `média`
- Impacto técnico: amplia dados pessoais armazenados.
- Impacto no negócio: aumenta sensibilidade LGPD e custo de governança de dados.
- Evidência: `apps/portal-backend/app/api/public/triage/route.ts:23-38`
- Sugestão: revisar base legal, retenção, hashing/masking e necessidade real desses campos.

## 14. Ausência de rate limiting real em endpoints públicos e webhooks

- Severidade: `média`
- Impacto técnico: maior vulnerabilidade a abuso, spam e custo desnecessário.
- Impacto no negócio: piora estabilidade e risco reputacional.
- Evidência: não foi encontrada camada explícita de rate limit nas rotas públicas auditadas.
- Sugestão: aplicar rate limiting por IP/origem/canal em edge ou gateway.

## 15. Modelo de conteúdo e comunidade ainda é fundação, não operação

- Severidade: `média`
- Impacto técnico: há schema para conteúdo/comunidade, mas sem maturidade de governança.
- Impacto no negócio: pode gerar falsa sensação de prontidão para cursos, membership e comunidade.
- Evidência: tabelas de ecossistema amplas sem evidência equivalente de UI/CMS/ops maduras.
- Sugestão: tratar essas áreas como roadmap, não como base pronta.

## 16. Home pública concentra jornada, mas ainda não há máquina de aquisição orgânica

- Severidade: `média`
- Impacto técnico: funnel existe, malha de conteúdo não.
- Impacto no negócio: aquisição fica dependente demais de mídia/social/atendimento.
- Evidência:
  - home com schema e CTA em `apps/portal-backend/app/page.tsx:16-40`
  - sitemap sem arquitetura de conteúdo em `apps/portal-backend/app/sitemap.ts:5-21`
- Sugestão: expandir SEO como produto separado, não apenas como home melhorada.

## 17. App mobile agora seria precipitado

- Severidade: `média`
- Impacto técnico: forçaria congelamento prematuro de APIs e domínios ainda instáveis.
- Impacto no negócio: custo alto antes da maturidade web/SEO/CRM/comunidade.
- Evidência:
  - acoplamento atual entre marketing, portal, IA e ecossistema
  - ausência de estrutura mobile-first para push/offline/analytics
- Sugestão: postergar app para fase final do roadmap.

## 18. Rotas públicas e portal compartilham um layout global potencialmente confuso para indexação

- Severidade: `média`
- Impacto técnico: risco de comportamento SEO inconsistente se metadata filha não sobrescrever corretamente.
- Impacto no negócio: páginas públicas podem ficar subindexadas.
- Evidência:
  - `apps/portal-backend/app/layout.tsx:19-22`
  - home sobrescreve para indexável em `apps/portal-backend/app/page.tsx:20-23`
- Sugestão: separar layouts público e autenticado com políticas de robots diferentes.

## 19. Scripts e nomenclatura “phase-driven” indicam evolução acelerada e difícil de sustentar

- Severidade: `média`
- Impacto técnico: difícil entender o que é estável, experimental ou legado.
- Impacto no negócio: reduz previsibilidade do roadmap.
- Evidência: `apps/portal-backend/package.json:12-20` e sequência de migrations `phase12/13/41/42`
- Sugestão: substituir naming histórico por domínios claros de negócio e módulos estáveis.

## 20. Repositório raiz ainda preserva estruturas antigas de site estático e legado operacional

- Severidade: `média`
- Impacto técnico: dificulta leitura da verdade operacional do sistema.
- Impacto no negócio: aumenta confusão sobre qual é o produto principal.
- Evidência:
  - `README.md` diz que o app principal é `apps/portal-backend`
  - raiz ainda contém `index.html`, `blog.html`, `triagem.html`, páginas jurídicas e muitos relatórios
- Sugestão: arquivar legado e deixar o produto principal dominante na estrutura.
