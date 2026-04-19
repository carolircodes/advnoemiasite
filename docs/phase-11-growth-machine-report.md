# Fase 11 - Maquina de crescimento, conversao e dominacao editorial

## Objetivo

Transformar a base consolidada da Fase 10 em uma camada real de growth, CRO, RevOps e inteligencia editorial sem reabrir o core tecnico. A fase focou em conectar conteudo, triagem, score, CRM operacional e dashboards internos em uma mesma maquina de captacao e decisao.

## O que foi implementado

### Lead scoring e intencao

- nova migration `20260419110000_phase11_growth_machine.sql`
- persistencia de:
  - `lead_score`
  - `lead_temperature`
  - `lifecycle_stage`
  - `score_explanation`
  - `experiment_context`
  - `preferred_contact_channel`
  - `readiness_level`
  - `appointment_interest`
- heuristica transparente em `apps/portal-backend/lib/growth/lead-scoring.ts`
- score calculado ja no envio da triagem publica e reaproveitado no CRM operacional

### Conversao contextual e CRO

- componente reutilizavel `apps/portal-backend/components/contextual-conversion-panel.tsx`
- variantes leves e deterministicamente atribuidas por sessao via `lib/growth/experiments.ts`
- integracao de copy/CTA contextual em:
  - home
  - indice de artigos
  - artigo individual
  - hub tematico
- tracking de impressao de variante com `experiment_variant_viewed`

### Triagem mais inteligente

- `apps/portal-backend/components/triage-form.tsx` ganhou:
  - canal preferido
  - prontidao comercial
  - interesse em agendamento
  - UF
  - prompt contextual por tema juridico
- `apps/portal-backend/lib/services/public-intake.ts` agora:
  - normaliza os campos novos
  - calcula score
  - persiste score/lifecycle/experimento
  - registra `lead_created`
  - registra `lead_qualified` quando cabivel
  - registra `appointment_started` quando a entrada ja mostra prontidao

### Growth editorial

- `lib/site/article-content.ts` ganhou:
  - `funnelStage`
  - `strategicPriority`
  - hubs tematicos
  - related articles
  - next best article
- novo hub por tema em `app/artigos/tema/[topic]/page.tsx`
- `app/sitemap.ts` agora inclui os hubs editoriais
- artigos passam a empurrar leitura, cluster e conversao no mesmo fluxo

### RevOps e operacao comercial

- `lib/services/growth-item-context.ts` agora expõe score, lifecycle e prontidao do intake
- `lib/services/operational-panel.ts` passa a enviar score, SLA e explicacao resumida para o painel
- `app/internal/advogada/operacional/page.tsx` exibe:
  - score do lead
  - lifecycle stage
  - SLA operacional sugerido
  - sinais de prontidao
  - explicacao resumida do score

### Dashboard de growth e decisao

- `lib/services/acquisition-analytics.ts` agora agrega:
  - leads quentes/urgentes
  - score medio
  - distribuicao por temperatura
  - prontidao por nivel
  - performance de variantes/experimentos
  - artigos por leads qualificados e quentes
- `app/internal/analytics/page.tsx` agora mostra:
  - score e prontidao
  - variantes/experimentos
  - conteudos com mais qualificacao

### Governanca da camada de growth

- novo smoke `npm run smoke:phase11`
- CI atualizado para rodar o smoke da Fase 11
- lint expandido para:
  - `components/contextual-conversion-panel.tsx`
  - `components/triage-form.tsx`
  - `lib/growth`
  - `scripts/smoke-phase11.ts`
- testes novos em `tests/phase11-hardening.test.ts`

## Eventos, score e flags novos

### Eventos

- `article_hub_viewed`
- `article_hub_cta_clicked`
- `experiment_variant_viewed`
- `lead_created` efetivamente disparado no intake publico
- `lead_qualified` disparado conforme score
- `appointment_started` disparado conforme prontidao/intencao

### Score

- faixas:
  - `cold`
  - `warm`
  - `hot`
  - `urgent`
- lifecycle:
  - `new_inquiry`
  - `qualified_interest`
  - `consultation_candidate`
  - `urgent_triage`

### Experimentos

- `phase11-home-cro`
- `phase11-contextual-cta`

## Como validar localmente

```powershell
npm run lint
npm run typecheck
npm run test
npm run smoke:phase10
npm run smoke:phase11
npm run build
```

## O que ainda permanece manual ou externo

- prova final de convergencia duravel em ambiente real com acesso administrativo Supabase
- aplicacao da migration `20260418120000_phase3_durable_abuse_controls.sql` em todos os ambientes relevantes
- rotacoes externas/manual de segredos de canais e providers
- leitura de performance dos experimentos ainda depende de volume real em producao

## Riscos remanescentes

- as heuristicas de score sao transparentes e seguras, mas ainda precisam de calibracao com dados reais de volume e conversao
- a camada de experimentacao e propositalmente leve; futuras expansoes devem continuar simples para nao criar debt de plataforma
- permanece a divida de lint fora do perimetro backend/growth tocado nesta fase

## Proximos passos recomendados

1. Calibrar score e variantes com dados reais das primeiras semanas de uso.
2. Fechar rotinas de follow-up automatico por abandono e agendamento nao concluido usando a infraestrutura ja consolidada.
3. Expandir hubs editoriais prioritarios conforme temas que gerarem mais lead qualificado.
4. Promover a leitura de score e qualidade para os rituais comerciais do time.
