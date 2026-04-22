# NoemIA Governance

Source of truth da camada NoemIA no backend.

## Dominios canonicos

- `public_site_chat`
  - uso: chat publico do site
  - objetivo: acolhimento, triagem e conducao inicial
  - proibido: agir como camada interna ou despejar contexto bruto no modelo

- `portal_support`
  - uso: suporte contextual para usuario autenticado ou continuidade de relacao
  - objetivo: clareza operacional e continuidade
  - proibido: linguagem comercial agressiva

- `commercial_conversion`
  - uso: WhatsApp, Instagram, Facebook DM, Telegram privado e fluxos de qualificacao
  - objetivo: entender momento comercial, qualificar e conduzir para consulta quando legitimo
  - permitido: side effects conservadores como enriquecimento comercial e persistencia de triagem

- `internal_operational`
  - uso: assistencia interna para equipe
  - objetivo: leitura executiva, proxima acao e risco
  - proibido: responder como atendimento ao publico

- `channel_comment`
  - uso: comentarios publicos em rede social
  - objetivo: resposta curta, segura e convite para o privado
  - proibido: consultoria detalhada em publico

## Source of truth por responsabilidade

- orchestration: [lib/ai/noemia-core.ts](../lib/ai/noemia-core.ts)
- domain resolution: [lib/ai/noemia-domains.ts](../lib/ai/noemia-domains.ts)
- context minimization: [lib/ai/noemia-context-governance.ts](../lib/ai/noemia-context-governance.ts)
- prompt assembly: [lib/ai/system-prompt.ts](../lib/ai/system-prompt.ts)
- model provider boundary: [lib/ai/noemia-provider.ts](../lib/ai/noemia-provider.ts)
- ai observability: [lib/ai/noemia-observability.ts](../lib/ai/noemia-observability.ts)

## Politica de contexto

- contexto enviado ao modelo deve ser minimizado e legivel, nunca dump bruto de objetos arbitrarios
- o builder oficial nao deve usar `JSON.stringify(context)` como mecanismo principal de prompting
- `clientContext` deve entrar como resumo de relacionamento, nao como espelho da base
- ids tecnicos, `external_user_id`, payloads completos e blocos sensiveis nao devem ser enviados ao modelo sem justificativa explicita

## Side effects

- inferencia do modelo nao e source of truth para side effects
- side effects permitidos hoje:
  - `pipeline_auto_update` em dominio `commercial_conversion`
  - `triage_persisted` em dominios `public_site_chat` e `commercial_conversion`
- qualquer novo side effect precisa ser explicitado no dominio e na observabilidade

## Observabilidade minima

Todo fluxo NoemIA relevante deve produzir sinais com:

- `domain`
- `policyMode`
- `promptVersion`
- `contextSummary`
- `source`
- `usedFallback`
- `classification`

Eventos principais atuais:

- `NOEMIA_CORE_STARTED`
- `NOEMIA_MODEL_REQUESTED`
- `NOEMIA_MODEL_SUCCEEDED`
- `NOEMIA_MODEL_FALLBACK`
- `NOEMIA_CORE_FAILED`
- `NOEMIA_COMMENT_MODEL_REQUESTED`
- `NOEMIA_COMMENT_MODEL_SUCCEEDED`
- `NOEMIA_COMMENT_MODEL_FALLBACK`
- `NOEMIA_COMMENT_FAILED`

## Regra de evolucao

Antes de adicionar novo canal, agente ou automacao:

1. escolher dominio canonico ou criar novo dominio explicitamente
2. declarar politica de contexto minima
3. declarar side effects permitidos
4. registrar prompt version
5. produzir observabilidade equivalente

Se uma mudanca reacoplar prompt, contexto, regra de negocio e side effect no mesmo ponto, ela esta indo contra a governanca da Fase 4.
