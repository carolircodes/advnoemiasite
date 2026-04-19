import { readFile } from "fs/promises";
import path from "path";

export type ArticleTopic =
  | "previdenciario"
  | "consumidor_bancario"
  | "familia"
  | "civil";

export type ArticleEntry = {
  slug: string;
  sourceFile: string;
  title: string;
  description: string;
  excerpt: string;
  topic: ArticleTopic;
  categoryLabel: string;
  funnelStage: "awareness" | "consideration" | "decision";
  strategicPriority: "core" | "cluster";
  publishedAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  readingMinutes: number;
};

type ArticleContent = ArticleEntry & {
  contentHtml: string;
};

export type ArticleTopicHub = {
  topic: ArticleTopic;
  slug: string;
  title: string;
  description: string;
  strategicAngle: string;
  serviceHref: string;
};

const ARTICLE_AUTHOR = "Noemia Paixao Advocacia";

const ARTICLES: ArticleEntry[] = [
  {
    slug: "aposentadoria-negada-inss",
    sourceFile: "aposentadoria-negada-inss.html",
    title: "Aposentadoria negada pelo INSS: o que fazer agora?",
    description:
      "Entenda os proximos passos depois de uma negativa do INSS e quando buscar orientacao juridica com estrategia.",
    excerpt:
      "Receber uma negativa do INSS nao encerra automaticamente o caso. O primeiro passo e entender a razao do indeferimento com clareza.",
    topic: "previdenciario",
    categoryLabel: "Previdenciario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["aposentadoria", "inss", "negativa de beneficio"],
    readingMinutes: 4
  },
  {
    slug: "contrato-descumprido",
    sourceFile: "contrato-descumprido.html",
    title: "Contrato descumprido: como agir com mais seguranca",
    description:
      "Veja como organizar os primeiros passos quando um contrato e descumprido e quais sinais pedem orientacao juridica.",
    excerpt:
      "Quando uma das partes descumpre o que foi combinado, agir no impulso pode piorar o problema. Clareza juridica evita ruido.",
    topic: "civil",
    categoryLabel: "Civil",
    funnelStage: "consideration",
    strategicPriority: "cluster",
    publishedAt: "2026-04-02T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["contrato", "inadimplemento", "direito civil"],
    readingMinutes: 4
  },
  {
    slug: "desconto-indevido-conta",
    sourceFile: "desconto-indevido-conta.html",
    title: "Desconto indevido em conta: o que observar",
    description:
      "Entenda o que fazer quando surgem descontos inesperados em conta e como reunir contexto antes de agir.",
    excerpt:
      "Descontos indevidos em conta podem ter origem diversa. O mais importante e identificar o historico e preservar evidencias.",
    topic: "consumidor_bancario",
    categoryLabel: "Consumidor bancario",
    funnelStage: "consideration",
    strategicPriority: "cluster",
    publishedAt: "2026-04-03T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["desconto indevido", "banco", "conta corrente"],
    readingMinutes: 4
  },
  {
    slug: "desconto-indevido-inss",
    sourceFile: "desconto-indevido-inss.html",
    title: "Desconto indevido no INSS: quando merece revisao",
    description:
      "Guia inicial para entender descontos indevidos no beneficio e buscar orientacao com mais criterio.",
    excerpt:
      "Nem todo desconto no beneficio e legitimo. Entender a origem e o registro do desconto muda completamente a leitura do caso.",
    topic: "previdenciario",
    categoryLabel: "Previdenciario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-04T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["beneficio", "inss", "desconto indevido"],
    readingMinutes: 4
  },
  {
    slug: "divorcio-primeiros-passos",
    sourceFile: "divorcio-primeiros-passos.html",
    title: "Divorcio: quais sao os primeiros passos?",
    description:
      "Veja como organizar os primeiros passos do divorcio com clareza, sem agir no impulso e sem perder contexto importante.",
    excerpt:
      "Filhos, patrimonio e rotina pedem leitura cuidadosa. O divorcio comeca melhor quando o contexto e organizado logo no inicio.",
    topic: "familia",
    categoryLabel: "Familia",
    funnelStage: "consideration",
    strategicPriority: "core",
    publishedAt: "2026-04-05T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["divorcio", "familia", "guarda"],
    readingMinutes: 4
  },
  {
    slug: "emprestimo-consignado-indevido",
    sourceFile: "emprestimo-consignado-indevido.html",
    title: "Emprestimo consignado indevido: sinais de alerta",
    description:
      "Aprenda a reconhecer sinais de emprestimo consignado indevido e a organizar os proximos passos com seguranca.",
    excerpt:
      "Quando o consignado aparece sem contexto claro, reunir provas e entender o historico e mais importante do que agir no susto.",
    topic: "consumidor_bancario",
    categoryLabel: "Consumidor bancario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-06T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["consignado", "emprestimo", "banco"],
    readingMinutes: 4
  },
  {
    slug: "nome-negativado-indevidamente",
    sourceFile: "nome-negativado-indevidamente.html",
    title: "Nome negativado indevidamente: como reagir",
    description:
      "Orientacao inicial para quem descobriu uma negativacao indevida e precisa agir com clareza e rastreabilidade.",
    excerpt:
      "Uma negativacao indevida mexe com credito, reputacao e rotina. Antes de qualquer medida, vale entender a origem e os registros.",
    topic: "consumidor_bancario",
    categoryLabel: "Consumidor bancario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-07T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["negativacao", "consumidor", "credito"],
    readingMinutes: 4
  },
  {
    slug: "revisao-aposentadoria-2026",
    sourceFile: "revisao-aposentadoria-2026.html",
    title: "Revisao de aposentadoria em 2026: quando faz sentido analisar",
    description:
      "Entenda em quais cenarios vale revisar uma aposentadoria e quais dados precisam ser verificados antes.",
    excerpt:
      "Revisao nao e formula magica. O caminho serio comeca pela analise tecnica do historico e dos criterios aplicados ao beneficio.",
    topic: "previdenciario",
    categoryLabel: "Previdenciario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-08T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["revisao", "aposentadoria", "beneficio"],
    readingMinutes: 4
  },
  {
    slug: "revisao-pensao-alimenticia",
    sourceFile: "revisao-pensao-alimenticia.html",
    title: "Revisao de pensao alimenticia: o que observar",
    description:
      "Guia inicial para entender quando uma revisao de pensao alimenticia pode fazer sentido.",
    excerpt:
      "Mudancas reais de contexto costumam ser o centro da analise. O ponto e entender o que mudou e como isso se prova.",
    topic: "familia",
    categoryLabel: "Familia",
    funnelStage: "consideration",
    strategicPriority: "cluster",
    publishedAt: "2026-04-09T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: ARTICLE_AUTHOR,
    tags: ["pensao alimenticia", "familia", "revisao"],
    readingMinutes: 4
  }
];

const ARTICLES_ROOT = path.resolve(process.cwd(), "..", "..", "artigos");
const TOPIC_HUBS: ArticleTopicHub[] = [
  {
    topic: "previdenciario",
    slug: "previdenciario",
    title: "Hub previdenciario",
    description:
      "Negativas, revisoes e descontos indevidos organizados como trilha de leitura e entrada qualificada.",
    strategicAngle:
      "Transformar demanda previdenciaria em leitura profunda, triagem e consulta com mais contexto.",
    serviceHref: "/#triagem-inicial?tema=previdenciario"
  },
  {
    topic: "consumidor_bancario",
    slug: "consumidor-bancario",
    title: "Hub consumidor bancario",
    description:
      "Conteudos sobre descontos, consignado e negativacao com passagem clara para triagem.",
    strategicAngle:
      "Levar dores bancarias recorrentes para proximos passos mais claros, sem ruido nem promessa vazia.",
    serviceHref: "/#triagem-inicial?tema=consumidor-bancario"
  },
  {
    topic: "familia",
    slug: "familia",
    title: "Hub familia",
    description:
      "Leituras estruturadas sobre divorcio e pensao com foco em organizacao e criterio.",
    strategicAngle:
      "Converter temas sensiveis em atendimento com mais confianca, contexto e clareza do proximo passo.",
    serviceHref: "/#triagem-inicial?tema=familia"
  },
  {
    topic: "civil",
    slug: "civil",
    title: "Hub civil",
    description:
      "Contratos, descumprimentos e conflitos civis com leitura objetiva e CTA contextual.",
    strategicAngle:
      "Trazer para triagem casos civis que precisam sair do improviso e entrar em analise mais tecnica.",
    serviceHref: "/#triagem-inicial?tema=civil"
  }
];

function extractMatch(source: string, expression: RegExp) {
  const match = source.match(expression);
  return match?.[1]?.trim() || "";
}

function normalizeHtmlContent(html: string) {
  return html
    .replace(/<div class="cta-box"[\s\S]*?<\/div>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getAllArticles() {
  return [...ARTICLES].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt)
  );
}

export function getFeaturedArticles(limit = 3) {
  return getAllArticles().slice(0, limit);
}

export function getTopicHubs() {
  return [...TOPIC_HUBS];
}

export function getTopicHubBySlug(slug: string) {
  return TOPIC_HUBS.find((hub) => hub.slug === slug) || null;
}

export function getArticlesByTopic(topic: ArticleTopic) {
  return getAllArticles().filter((article) => article.topic === topic);
}

export function getRelatedArticles(article: ArticleEntry, limit = 3) {
  return getAllArticles()
    .filter((candidate) => candidate.slug !== article.slug && candidate.topic === article.topic)
    .sort((left, right) => {
      if (left.strategicPriority !== right.strategicPriority) {
        return left.strategicPriority === "core" ? -1 : 1;
      }

      if (left.funnelStage !== right.funnelStage) {
        const order = { awareness: 0, consideration: 1, decision: 2 };
        return order[left.funnelStage] - order[right.funnelStage];
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, limit);
}

export function getNextBestArticles(article: ArticleEntry, limit = 2) {
  const desiredStage =
    article.funnelStage === "awareness"
      ? "consideration"
      : article.funnelStage === "consideration"
        ? "decision"
        : "decision";

  return getAllArticles()
    .filter(
      (candidate) =>
        candidate.slug !== article.slug &&
        candidate.topic === article.topic &&
        candidate.funnelStage === desiredStage
    )
    .slice(0, limit);
}

export function getArticleBySlug(slug: string) {
  return ARTICLES.find((article) => article.slug === slug) || null;
}

export async function getArticleContentBySlug(slug: string): Promise<ArticleContent | null> {
  const article = getArticleBySlug(slug);

  if (!article) {
    return null;
  }

  const sourcePath = path.join(ARTICLES_ROOT, article.sourceFile);
  const rawHtml = await readFile(sourcePath, "utf8");
  const contentHtml = normalizeHtmlContent(
    extractMatch(rawHtml, /<div class="article-content">([\s\S]*?)<\/div>\s*<\/article>/i)
  );

  return {
    ...article,
    title: extractMatch(rawHtml, /<h1>([\s\S]*?)<\/h1>/i) || article.title,
    description:
      extractMatch(rawHtml, /<meta name="description" content="([^"]+)"/i) ||
      article.description,
    contentHtml
  };
}
