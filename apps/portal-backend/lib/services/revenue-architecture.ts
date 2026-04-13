import "server-only";

export type RevenueMoment = "now" | "next" | "future";
export type RevenueLayer =
  | "core_legal_service"
  | "consultation"
  | "continuity"
  | "educational_adjacent"
  | "community"
  | "digital_product"
  | "recurring_future";

export type RevenueScope = "main_brand" | "future_subbrand";
export type RevenueOfferKind =
  | "consultation"
  | "analysis"
  | "continuity"
  | "return"
  | "education"
  | "community"
  | "digital_product"
  | "membership";

export type RevenueOffer = {
  code: string;
  name: string;
  shortLabel: string;
  description: string;
  kind: RevenueOfferKind;
  layer: RevenueLayer;
  moment: RevenueMoment;
  scope: RevenueScope;
  defaultAmount: number | null;
  checkoutTitle: string;
  checkoutDescription: string;
  paymentSuccessTitle: string;
  paymentSuccessDetail: string;
  paymentPendingDetail: string;
  paymentFailureDetail: string;
  nextStepLabel: string;
  destinationLabel: string;
  premiumPositioning: string;
};

type RevenueArchitectureItem = {
  layer: RevenueLayer;
  title: string;
  summary: string;
  moment: RevenueMoment;
  scope: RevenueScope;
  nowFocus: boolean;
};

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const revenueArchitecture: RevenueArchitectureItem[] = [
  {
    layer: "core_legal_service",
    title: "Receita nuclear do escritorio",
    summary:
      "Honorarios e servicos juridicos principais. Continua sendo o centro economico e de marca do imperio.",
    moment: "now",
    scope: "main_brand",
    nowFocus: true
  },
  {
    layer: "consultation",
    title: "Receita de consulta",
    summary:
      "Entrada premium mais clara para monetizacao imediata, com valor, contexto e continuidade operacional.",
    moment: "now",
    scope: "main_brand",
    nowFocus: true
  },
  {
    layer: "continuity",
    title: "Receita de continuidade e retorno",
    summary:
      "Retornos, revisoes, analises complementares e continuidade estruturada sem depender de improviso comercial.",
    moment: "next",
    scope: "main_brand",
    nowFocus: true
  },
  {
    layer: "educational_adjacent",
    title: "Receita educacional adjacente",
    summary:
      "Materiais premium, orientacoes estruturadas e caminhos educativos conectados ao tema juridico principal.",
    moment: "next",
    scope: "future_subbrand",
    nowFocus: false
  },
  {
    layer: "community",
    title: "Receita de comunidade",
    summary:
      "Base para grupo premium, acompanhamento coletivo e pertencimento, sem misturar com a operacao juridica central.",
    moment: "future",
    scope: "future_subbrand",
    nowFocus: false
  },
  {
    layer: "digital_product",
    title: "Produtos digitais",
    summary:
      "Catalogo futuro de guias, kits e jornadas fechadas de compra e consumo.",
    moment: "future",
    scope: "future_subbrand",
    nowFocus: false
  },
  {
    layer: "recurring_future",
    title: "Assinaturas e camadas recorrentes",
    summary:
      "Estrutura futura para membership, recorrencia e relacao continuada com o ecossistema.",
    moment: "future",
    scope: "future_subbrand",
    nowFocus: false
  }
];

export const revenueOffers: RevenueOffer[] = [
  {
    code: "consultation_initial",
    name: "Consulta estrategica inicial",
    shortLabel: "Consulta inicial",
    description:
      "Encontro individual para leitura juridica qualificada, definicao de estrategia e proximo passo seguro.",
    kind: "consultation",
    layer: "consultation",
    moment: "now",
    scope: "main_brand",
    defaultAmount: envNumber("CONSULTATION_VALUE", 297),
    checkoutTitle: "Consulta estrategica inicial",
    checkoutDescription:
      "Pagamento da consulta individual para analise do caso e orientacao inicial com clareza.",
    paymentSuccessTitle: "Consulta confirmada",
    paymentSuccessDetail:
      "Seu pagamento foi confirmado e a jornada segue para organizacao da consulta e preparo do atendimento.",
    paymentPendingDetail:
      "Seu pagamento foi iniciado. Assim que a confirmacao acontecer, a consulta entra na trilha de continuidade.",
    paymentFailureDetail:
      "O pagamento da consulta nao foi concluido. O fluxo continua pronto para recuperacao ou apoio humano.",
    nextStepLabel: "Organizar consulta",
    destinationLabel: "Consulta premium",
    premiumPositioning:
      "Oferta principal de entrada paga, com framing de clareza, seguranca e decisao."
  },
  {
    code: "case_analysis_premium",
    name: "Analise premium do caso",
    shortLabel: "Analise premium",
    description:
      "Leitura tecnica aprofundada para casos que pedem avaliacao mais estruturada antes da execucao completa.",
    kind: "analysis",
    layer: "core_legal_service",
    moment: "now",
    scope: "main_brand",
    defaultAmount: envNumber("ANALYSIS_VALUE", 497),
    checkoutTitle: "Analise premium do caso",
    checkoutDescription:
      "Pagamento da analise aprofundada para consolidar documentos, contexto e estrategia juridica.",
    paymentSuccessTitle: "Analise confirmada",
    paymentSuccessDetail:
      "A analise foi confirmada e o caso entra em preparo tecnico com continuidade clara no portal e no cockpit.",
    paymentPendingDetail:
      "A analise esta com pagamento em andamento. O sistema segue acompanhando a confirmacao para liberar o proximo passo.",
    paymentFailureDetail:
      "A analise ainda nao teve pagamento confirmado. O fluxo permanece pronto para recuperacao organizada.",
    nextStepLabel: "Iniciar analise",
    destinationLabel: "Analise juridica",
    premiumPositioning:
      "Oferta nuclear para casos que pedem profundidade antes do fechamento do servico principal."
  },
  {
    code: "strategic_continuity",
    name: "Continuidade estrategica",
    shortLabel: "Continuidade",
    description:
      "Camada de continuidade para quem ja iniciou atendimento e precisa de nova conducao, ajuste ou avancos controlados.",
    kind: "continuity",
    layer: "continuity",
    moment: "next",
    scope: "main_brand",
    defaultAmount: envNumber("CONTINUITY_VALUE", 347),
    checkoutTitle: "Continuidade estrategica",
    checkoutDescription:
      "Pagamento da continuidade do acompanhamento com retorno orientado e nova definicao de proximo passo.",
    paymentSuccessTitle: "Continuidade confirmada",
    paymentSuccessDetail:
      "A continuidade foi confirmada e o sistema ja pode organizar retorno, agenda e acompanhamento.",
    paymentPendingDetail:
      "O pagamento da continuidade foi iniciado e segue em monitoramento ate a confirmacao.",
    paymentFailureDetail:
      "A continuidade ainda nao foi confirmada. O fluxo segue preparado para recuperacao com contexto.",
    nextStepLabel: "Organizar continuidade",
    destinationLabel: "Continuidade premium",
    premiumPositioning:
      "Oferta para ampliar receita de relacao e reduzir perda entre consulta, retorno e nova decisao."
  },
  {
    code: "return_session",
    name: "Retorno orientado",
    shortLabel: "Retorno",
    description:
      "Sessao objetiva para revisar andamento, pendencias e proxima decisao do caso ja acompanhado.",
    kind: "return",
    layer: "continuity",
    moment: "next",
    scope: "main_brand",
    defaultAmount: envNumber("RETURN_SESSION_VALUE", 197),
    checkoutTitle: "Retorno orientado",
    checkoutDescription:
      "Pagamento do retorno para revisar o caso, confirmar status e orientar o movimento seguinte.",
    paymentSuccessTitle: "Retorno confirmado",
    paymentSuccessDetail:
      "O retorno foi confirmado e a equipe pode seguir para agenda, preparo e nova leitura do caso.",
    paymentPendingDetail:
      "O pagamento do retorno foi iniciado. O sistema acompanha a confirmacao sem perder o contexto.",
    paymentFailureDetail:
      "O retorno ainda nao foi confirmado. A jornada permanece pronta para nova tentativa ou apoio humano.",
    nextStepLabel: "Agendar retorno",
    destinationLabel: "Retorno premium",
    premiumPositioning:
      "Oferta de reengajamento com menor friccao e melhor retencao de receita relacional."
  },
  {
    code: "education_guidance_pack",
    name: "Guia premium de orientacao",
    shortLabel: "Guia premium",
    description:
      "Produto educacional futuro para orientar contexto, linguagem e preparo inicial sem substituir servico juridico.",
    kind: "education",
    layer: "educational_adjacent",
    moment: "future",
    scope: "future_subbrand",
    defaultAmount: null,
    checkoutTitle: "Guia premium de orientacao",
    checkoutDescription:
      "Oferta futura para consumo educacional organizado e coerente com a marca principal.",
    paymentSuccessTitle: "Acesso liberado",
    paymentSuccessDetail:
      "O material foi liberado e pode ser consumido dentro do ecossistema premium.",
    paymentPendingDetail:
      "A liberacao segue aguardando confirmacao do pagamento.",
    paymentFailureDetail:
      "O pagamento do material nao foi concluido.",
    nextStepLabel: "Liberar acesso",
    destinationLabel: "Area educacional",
    premiumPositioning:
      "Receita adjacente futura, com identidade propria e sem contaminar o core juridico."
  }
];

export function getRevenueOfferByCode(code: string | null | undefined) {
  if (!code) {
    return revenueOffers[0];
  }

  return revenueOffers.find((offer) => offer.code === code) || revenueOffers[0];
}

export function getRevenueOfferByIntent(intentionType: string | null | undefined) {
  switch ((intentionType || "").trim()) {
    case "analysis":
    case "analise":
      return getRevenueOfferByCode("case_analysis_premium");
    case "continuity":
    case "continuidade":
      return getRevenueOfferByCode("strategic_continuity");
    case "return":
    case "retorno":
      return getRevenueOfferByCode("return_session");
    default:
      return getRevenueOfferByCode("consultation_initial");
  }
}

export function listRevenueOffersByMoment(moment: RevenueMoment) {
  return revenueOffers.filter((offer) => offer.moment === moment);
}

export function getRevenueLayerLabel(layer: RevenueLayer) {
  const labels: Record<RevenueLayer, string> = {
    core_legal_service: "Receita nuclear do escritorio",
    consultation: "Receita de consulta",
    continuity: "Receita de continuidade",
    educational_adjacent: "Receita educacional adjacente",
    community: "Receita de comunidade",
    digital_product: "Produtos digitais",
    recurring_future: "Receita recorrente futura"
  };

  return labels[layer];
}
