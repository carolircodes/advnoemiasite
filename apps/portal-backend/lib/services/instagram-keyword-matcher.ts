import "server-only";

export type InstagramKeywordMatch = {
  matched: boolean;
  keyword: string | null;
  matchedAlias: string | null;
  topic: "bancario" | "previdenciario" | "familia" | "civil" | "geral";
  area: string;
  confidence: number;
  normalizedText: string;
};

type KeywordAlias = {
  keyword: string;
  aliases: string[];
  topic: InstagramKeywordMatch["topic"];
  area: string;
  confidence: number;
};

const INSTAGRAM_KEYWORD_ALIASES: KeywordAlias[] = [
  {
    keyword: "negativacao",
    aliases: [
      "negativacao",
      "negativacao indevida",
      "nome sujo",
      "serasa",
      "spc",
      "banco negativou",
      "banco negativou meu nome",
      "me negativou",
      "negativou meu nome"
    ],
    topic: "bancario",
    area: "consumidor_bancario",
    confidence: 0.92
  },
  {
    keyword: "juros",
    aliases: ["juros", "juros abusivos", "emprestimo", "cartao", "cartao de credito"],
    topic: "bancario",
    area: "consumidor_bancario",
    confidence: 0.82
  },
  {
    keyword: "aposentadoria",
    aliases: ["aposentadoria", "aposentar", "inss", "beneficio", "loas", "bpc"],
    topic: "previdenciario",
    area: "previdenciario",
    confidence: 0.82
  },
  {
    keyword: "familia",
    aliases: ["divorcio", "pensao", "guarda", "familia"],
    topic: "familia",
    area: "familia",
    confidence: 0.82
  },
  {
    keyword: "civil",
    aliases: ["contrato", "indenizacao", "dano moral", "dano material"],
    topic: "civil",
    area: "civil",
    confidence: 0.78
  }
];

export function normalizeInstagramKeywordText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAlias(normalizedText: string, alias: string) {
  const normalizedAlias = normalizeInstagramKeywordText(alias);

  if (!normalizedAlias) {
    return false;
  }

  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "u");

  return pattern.test(normalizedText);
}

export function matchInstagramKeywordAutomation(commentText: string): InstagramKeywordMatch {
  const normalizedText = normalizeInstagramKeywordText(commentText);

  for (const mapping of INSTAGRAM_KEYWORD_ALIASES) {
    for (const alias of mapping.aliases) {
      if (matchesAlias(normalizedText, alias)) {
        return {
          matched: true,
          keyword: mapping.keyword,
          matchedAlias: normalizeInstagramKeywordText(alias),
          topic: mapping.topic,
          area: mapping.area,
          confidence: mapping.confidence,
          normalizedText
        };
      }
    }
  }

  return {
    matched: false,
    keyword: null,
    matchedAlias: null,
    topic: "geral",
    area: "geral",
    confidence: 0,
    normalizedText
  };
}
