export type ExperimentSurface = "home" | "article" | "article_hub";

export type ExperimentVariant = {
  id: string;
  label: string;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
};

export type ExperimentDefinition = {
  id: string;
  label: string;
  surface: ExperimentSurface;
  variants: ExperimentVariant[];
};

const contextualCtaExperiment: ExperimentDefinition = {
  id: "phase11-contextual-cta",
  label: "CTA contextual de crescimento",
  surface: "article",
  variants: [
    {
      id: "diagnostico",
      label: "Diagnóstico",
      headline: "Entenda se este caso já merece triagem estratégica.",
      body:
        "Use a triagem guiada para organizar urgência, documentos e próximo passo antes de falar com a equipe.",
      primaryCta: "Solicitar análise inicial",
      secondaryCta: "Conversar com a NoemIA"
    },
    {
      id: "consulta",
      label: "Consulta",
      headline: "Se o seu caso se parece com isso, o próximo passo pode ser a consulta.",
      body:
        "A triagem já antecipa contexto, prioridade e prontidão comercial para a equipe não começar do zero.",
      primaryCta: "Avançar para triagem",
      secondaryCta: "Tirar dúvida inicial"
    }
  ]
};

const homeCtaExperiment: ExperimentDefinition = {
  id: "phase11-home-cro",
  label: "Hero CRO da home",
  surface: "home",
  variants: [
    {
      id: "clareza",
      label: "Clareza",
      headline: "Comece pelo caminho mais claro para o seu caso.",
      body:
        "A triagem guiada organiza contexto e evita que a primeira conversa comece sem direção.",
      primaryCta: "Iniciar triagem guiada",
      secondaryCta: "Falar com a NoemIA"
    },
    {
      id: "velocidade",
      label: "Velocidade",
      headline: "Acelere a primeira leitura jurídica sem perder contexto.",
      body:
        "Quando a urgência já existe, a triagem reduz atrito e deixa a equipe agir com mais critério.",
      primaryCta: "Começar atendimento agora",
      secondaryCta: "Entender o próximo passo"
    }
  ]
};

const experimentMap = new Map<string, ExperimentDefinition>(
  [contextualCtaExperiment, homeCtaExperiment].map((experiment) => [experiment.id, experiment])
);

function hashValue(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getExperimentDefinition(experimentId: string) {
  return experimentMap.get(experimentId) || null;
}

export function assignExperimentVariant(input: {
  experimentId: string;
  sessionId: string;
  surface: ExperimentSurface;
  topic?: string;
  contentId?: string;
}) {
  const experiment = getExperimentDefinition(input.experimentId);

  if (!experiment) {
    return null;
  }

  const seed = [
    experiment.id,
    input.sessionId,
    input.surface,
    input.topic || "sem-tema",
    input.contentId || "sem-conteudo"
  ].join(":");
  const index = hashValue(seed) % experiment.variants.length;

  return {
    experiment,
    variant: experiment.variants[index]
  };
}
