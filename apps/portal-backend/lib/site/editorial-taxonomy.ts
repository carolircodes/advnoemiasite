export type EditorialTopic =
  | "previdenciario"
  | "consumidor_bancario"
  | "familia"
  | "civil";

export type EditorialFunnelStage = "awareness" | "consideration" | "decision";

export type EditorialTopicDefinition = {
  topic: EditorialTopic;
  slug: string;
  label: string;
  title: string;
  hubTitle: string;
  hubDescription: string;
  strategicAngle: string;
  serviceTitle: string;
  serviceDescription: string;
  serviceLongDescription: string;
  serviceHref: string;
  hubHref: string;
  triageHref: string;
  primaryIntent: string;
  secondaryIntent: string;
  authoritySignals: string[];
  subtopics: string[];
  searchIntents: string[];
  conversionCtaLabel: string;
  relatedEntryPoints: string[];
};

const TOPIC_DEFINITIONS: EditorialTopicDefinition[] = [
  {
    topic: "previdenciario",
    slug: "previdenciario",
    label: "Previdenciario",
    title: "Direito previdenciario",
    hubTitle: "Hub previdenciario",
    hubDescription:
      "Negativas, revisoes e descontos indevidos organizados como trilha de leitura e entrada qualificada.",
    strategicAngle:
      "Transformar demanda previdenciaria em leitura profunda, triagem e consulta com mais contexto.",
    serviceTitle: "Atendimento previdenciario com triagem e leitura estrategica do caso",
    serviceDescription:
      "Pagina de entrada para aposentadoria negada, revisao de beneficio e descontos indevidos no INSS, com leitura clara e caminho para triagem.",
    serviceLongDescription:
      "A camada previdenciaria agora funciona como money page editorial: explica os cenarios de maior intencao, organiza subtemas e leva o visitante para triagem ou atendimento com mais criterio.",
    serviceHref: "/atuacao/previdenciario",
    hubHref: "/artigos/tema/previdenciario",
    triageHref: "/#triagem-inicial?tema=previdenciario",
    primaryIntent: "resolver negativa, revisao ou desconto indevido em beneficio",
    secondaryIntent: "entender se o historico do beneficio justifica consulta ou analise inicial",
    authoritySignals: [
      "Aposentadoria negada pelo INSS",
      "Revisao de aposentadoria",
      "Desconto indevido no beneficio"
    ],
    subtopics: [
      "aposentadoria negada",
      "revisao de beneficio",
      "desconto indevido no INSS",
      "documentacao previdenciaria"
    ],
    searchIntents: [
      "decisao",
      "consideracao",
      "investigativa"
    ],
    conversionCtaLabel: "Enviar caso previdenciario para triagem",
    relatedEntryPoints: ["/", "/artigos", "/#atendimento"]
  },
  {
    topic: "consumidor_bancario",
    slug: "consumidor-bancario",
    label: "Consumidor bancario",
    title: "Consumidor bancario",
    hubTitle: "Hub consumidor bancario",
    hubDescription:
      "Conteudos sobre descontos, consignado e negativacao com passagem clara para triagem.",
    strategicAngle:
      "Levar dores bancarias recorrentes para proximos passos mais claros, sem ruido nem promessa vazia.",
    serviceTitle: "Atendimento para descontos indevidos, consignado e negativacao",
    serviceDescription:
      "Pagina de entrada para quem precisa entender cobrancas bancarias indevidas, consignado nao reconhecido ou nome negativado.",
    serviceLongDescription:
      "Esta pagina organiza a demanda bancario-consumerista em torno das dores com maior intencao de busca e maior chance de conversao qualificada para triagem.",
    serviceHref: "/atuacao/consumidor-bancario",
    hubHref: "/artigos/tema/consumidor-bancario",
    triageHref: "/#triagem-inicial?tema=consumidor-bancario",
    primaryIntent: "parar desconto, contestar consignado ou reagir a negativacao indevida",
    secondaryIntent: "entender provas e contexto antes de falar com a equipe",
    authoritySignals: [
      "Emprestimo consignado indevido",
      "Nome negativado indevidamente",
      "Desconto indevido em conta"
    ],
    subtopics: [
      "desconto indevido em conta",
      "emprestimo consignado indevido",
      "negativacao indevida",
      "historico bancario e evidencias"
    ],
    searchIntents: [
      "decisao",
      "consideracao",
      "transacional"
    ],
    conversionCtaLabel: "Organizar problema bancario na triagem",
    relatedEntryPoints: ["/", "/artigos", "/#atendimento"]
  },
  {
    topic: "familia",
    slug: "familia",
    label: "Familia",
    title: "Direito de familia",
    hubTitle: "Hub familia",
    hubDescription:
      "Leituras estruturadas sobre divorcio e pensao com foco em organizacao e criterio.",
    strategicAngle:
      "Converter temas sensiveis em atendimento com mais confianca, contexto e clareza do proximo passo.",
    serviceTitle: "Atendimento em direito de familia com mais clareza no primeiro passo",
    serviceDescription:
      "Pagina de entrada para divorcio, revisao de pensao e outras situacoes familiares que pedem organizacao e direcao.",
    serviceLongDescription:
      "A camada de familia foi estruturada para acolher intencao sensivel sem virar pagina generica, conectando leitura, triagem e orientacao com mais contexto.",
    serviceHref: "/atuacao/familia",
    hubHref: "/artigos/tema/familia",
    triageHref: "/#triagem-inicial?tema=familia",
    primaryIntent: "entender divorcio, guarda ou revisao de pensao com mais seguranca",
    secondaryIntent: "sair da ansiedade inicial e chegar na equipe com contexto melhor organizado",
    authoritySignals: [
      "Divorcio e primeiros passos",
      "Revisao de pensao alimenticia",
      "Organizacao documental e rotina familiar"
    ],
    subtopics: [
      "divorcio",
      "revisao de pensao",
      "guarda e convivio",
      "contexto patrimonial e documental"
    ],
    searchIntents: [
      "consideracao",
      "investigativa",
      "decisao"
    ],
    conversionCtaLabel: "Comecar triagem familiar",
    relatedEntryPoints: ["/", "/artigos", "/#atendimento"]
  },
  {
    topic: "civil",
    slug: "civil",
    label: "Civil",
    title: "Direito civil",
    hubTitle: "Hub civil",
    hubDescription:
      "Contratos, descumprimentos e conflitos civis com leitura objetiva e CTA contextual.",
    strategicAngle:
      "Trazer para triagem casos civis que precisam sair do improviso e entrar em analise mais tecnica.",
    serviceTitle: "Atendimento civil para contratos e conflitos que pedem analise tecnica",
    serviceDescription:
      "Pagina de entrada para descumprimento contratual e outras situacoes civis que exigem leitura mais estruturada do caso.",
    serviceLongDescription:
      "A pagina civil funciona como entry point para buscas investigativas e decisorias, costurando artigos, orientacao inicial e triagem em um fluxo mais governado.",
    serviceHref: "/atuacao/civil",
    hubHref: "/artigos/tema/civil",
    triageHref: "/#triagem-inicial?tema=civil",
    primaryIntent: "entender descumprimento contratual e proximo passo juridico",
    secondaryIntent: "organizar evidencias, cronologia e risco antes de uma consulta",
    authoritySignals: [
      "Contrato descumprido",
      "Conflitos civis com impacto patrimonial",
      "Cronologia e provas do caso"
    ],
    subtopics: [
      "contrato descumprido",
      "inadimplemento",
      "evidencias e cronologia",
      "primeiro passo para conflito civil"
    ],
    searchIntents: [
      "consideracao",
      "decisao",
      "investigativa"
    ],
    conversionCtaLabel: "Levar caso civil para triagem",
    relatedEntryPoints: ["/", "/artigos", "/#atendimento"]
  }
];

export function getEditorialTopics() {
  return [...TOPIC_DEFINITIONS];
}

export function getEditorialTopicBySlug(slug: string) {
  return TOPIC_DEFINITIONS.find((topic) => topic.slug === slug) || null;
}

export function getEditorialTopicByTopic(topic: EditorialTopic) {
  return TOPIC_DEFINITIONS.find((entry) => entry.topic === topic) || null;
}

export function getEditorialServicePages() {
  return TOPIC_DEFINITIONS.map((topic) => ({
    slug: topic.slug,
    topic: topic.topic,
    title: topic.serviceTitle,
    description: topic.serviceDescription,
    longDescription: topic.serviceLongDescription,
    href: topic.serviceHref,
    hubHref: topic.hubHref,
    triageHref: topic.triageHref,
    primaryIntent: topic.primaryIntent,
    secondaryIntent: topic.secondaryIntent,
    authoritySignals: topic.authoritySignals,
    subtopics: topic.subtopics,
    searchIntents: topic.searchIntents,
    conversionCtaLabel: topic.conversionCtaLabel
  }));
}

export function getEditorialServicePageBySlug(slug: string) {
  return getEditorialServicePages().find((page) => page.slug === slug) || null;
}
