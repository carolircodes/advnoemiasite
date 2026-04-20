# Fase 12 - Omnichannel, operacao e loops fechados

## O que foi consolidado

- Taxonomia unica para canal, source, medium, campaign, campaign family, campaign objective, tema juridico, content format, entry surface, conversion surface, primary touch, assisted touches, follow-up origin, scheduling origin e closing origin.
- Motor explicito de roteamento por contexto em `lib/services/context-routing.ts`.
- Leitura executiva omnichannel em `lib/services/omnichannel-intelligence.ts`.
- Timeline unificada de jornada em `lib/services/journey-timeline.ts`.
- Intake publico enriquecido com `routingDecision` e `journeyTaxonomy` dentro de `metadata`.

## Flags novas

Adicionar no ambiente do portal quando quiser controle fino:

```env
CHANNEL_ENABLE_PHASE12_JOURNEY_ORCHESTRATION=true
CHANNEL_ENABLE_PHASE12_EXECUTIVE_DASHBOARD=true
CHANNEL_ENABLE_PHASE12_EXTERNAL_DISPATCH_PREPARATION=true
```

## Como a taxonomia deve ser usada

- Sempre preservar `source`, `medium` e `campaign` legados.
- Novos integradores devem preencher, quando possivel:
  - `source`
  - `medium`
  - `campaign`
  - `campaignFamily`
  - `campaignObjective`
  - `theme` ou `topic`
  - `contentId`
  - `contentStage`
  - `page` ou `entrySurface`
  - `preferredContactChannel`
- Quando a origem vier incompleta, a normalizacao faz fallback sem quebrar compatibilidade.

## Loops fechados nesta camada

- Conteudo -> triagem -> lead -> agenda -> conversao
- Canal -> origem -> CTA -> CRM -> follow-up
- Score -> prontidao -> roteamento -> acao recomendada
- Social -> site/artigo -> lead -> inbox/CRM
- Automacao -> fila -> status -> dashboard

## Checklist de ativacao de novo canal

- Definir `source`, `medium` e `campaign`.
- Mapear `channel`, `entrySurface` e `primaryTouch`.
- Garantir logs e status de falha inteligiveis.
- Respeitar cooldown, duplicidade e consentimento quando houver follow-up.
- Validar como o canal aparecera na intelligence e na timeline.

## Checklist de rollout

- Rodar `npm run typecheck --workspace portal-backend`
- Rodar `npm run test --workspace portal-backend`
- Rodar `npm run lint --workspace portal-backend`
- Revisar `/internal/advogada/inteligencia`
- Revisar `/internal/advogada/clientes/[id]`
- Confirmar se eventos publicos continuam registrando intake sem regressao

## Pendencias externas esperadas

- Credenciais reais para canais pagos ou providers externos continuam fora do repositario.
- A base interna ja deixa mapeamento, taxonomia e trilhas prontas para ativacao posterior.
