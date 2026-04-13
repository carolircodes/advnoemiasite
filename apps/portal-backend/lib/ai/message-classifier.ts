import type {
  ClassifiedIntent,
  LeadTemperature,
  LegalTheme
} from "./core-types";

export function detectUserIntent(message: string): string {
  const lowerMessage = message.toLowerCase();

  const legalAdviceKeywords = [
    "o que fazer",
    "como faço",
    "posso fazer",
    "devo fazer",
    "meu caso",
    "minha situação",
    "minha situacao",
    "meu problema",
    "minha dúvida",
    "minha duvida",
    "quais meus direitos",
    "o que a lei diz",
    "é crime",
    "e crime",
    "é ilegal",
    "e ilegal",
    "quanto custa",
    "quanto cobra",
    "valor da consulta",
    "consulta grátis",
    "consulta gratis",
    "posso me aposentar",
    "banco cobrou",
    "não paga pensão",
    "nao paga pensao",
    "demissão injusta",
    "demissao injusta",
    "herança",
    "heranca",
    "divórcio",
    "divorcio",
    "trabalhista",
    "previdenciário",
    "previdenciario",
    "bancário",
    "bancario"
  ];

  if (legalAdviceKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return "legal_advice_request";
  }

  if (lowerMessage.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|eai|opa)/)) {
    return "greeting";
  }

  if (
    lowerMessage.includes("agenda") ||
    lowerMessage.includes("consulta") ||
    lowerMessage.includes("compromisso")
  ) {
    return "agenda_request";
  }

  if (
    lowerMessage.includes("processo") ||
    lowerMessage.includes("caso") ||
    lowerMessage.includes("andamento")
  ) {
    return "case_request";
  }

  if (
    lowerMessage.includes("documento") ||
    lowerMessage.includes("arquivo") ||
    lowerMessage.includes("enviar")
  ) {
    return "document_request";
  }

  return "general_inquiry";
}

export function detectLegalTheme(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  const themes: Record<string, string[]> = {
    aposentadoria: [
      "aposentadoria",
      "aposentar",
      "inss",
      "benefício",
      "beneficio",
      "auxílio",
      "auxilio"
    ],
    bancario: [
      "banco",
      "empréstimo",
      "emprestimo",
      "juros",
      "cobrança",
      "cobranca",
      "financiamento",
      "desconto"
    ],
    familia: [
      "divórcio",
      "divorcio",
      "pensão",
      "pensao",
      "guarda",
      "filhos",
      "casamento",
      "separação",
      "separacao"
    ],
    consumidor: ["compra", "produto", "serviço", "servico", "defeito", "troca", "reparo"],
    trabalhista: [
      "trabalho",
      "demissão",
      "demissao",
      "rescisão",
      "rescisao",
      "verbas",
      "horas",
      "salário",
      "salario"
    ],
    previdenciario: [
      "previdenciário",
      "previdenciario",
      "previdência",
      "previdencia",
      "aposentadoria",
      "auxílio doença",
      "auxilio doença",
      "auxilio doenca"
    ]
  };

  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      return theme;
    }
  }

  return null;
}

export function classifyMessage(message: string): {
  theme: LegalTheme;
  intent: ClassifiedIntent;
  leadTemperature: LeadTemperature;
} {
  const lowerMessage = message.toLowerCase();

  let theme: LegalTheme = "geral";

  const themeKeywords: Record<Exclude<LegalTheme, "geral">, string[]> = {
    previdenciario: [
      "aposentadoria",
      "aposentar",
      "inss",
      "benefício",
      "beneficio",
      "auxílio",
      "auxilio",
      "previdência",
      "previdencia",
      "previdenciário",
      "previdenciario",
      "autismo",
      "bpc",
      "loas"
    ],
    bancario: [
      "banco",
      "empréstimo",
      "emprestimo",
      "juros",
      "cobrança",
      "cobranca",
      "financiamento",
      "desconto",
      "cartão",
      "cartao",
      "conta"
    ],
    familia: [
      "divórcio",
      "divorcio",
      "pensão",
      "pensao",
      "guarda",
      "filhos",
      "casamento",
      "separação",
      "separacao",
      "herança",
      "heranca",
      "testamento"
    ],
    civil: [
      "contrato",
      "dano",
      "indenização",
      "indenizacao",
      "responsabilidade",
      "negócio",
      "negocio",
      "compra",
      "venda"
    ]
  };

  for (const [themeName, keywords] of Object.entries(themeKeywords) as Array<
    [Exclude<LegalTheme, "geral">, string[]]
  >) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      theme = themeName;
      break;
    }
  }

  let intent: ClassifiedIntent = "curiosity";

  const curiosityKeywords = [
    "o que é",
    "o que e",
    "como funciona",
    "quanto tempo",
    "quais documentos",
    "posso",
    "tenho direito"
  ];
  const leadInterestKeywords = [
    "quero",
    "preciso",
    "meu caso",
    "minha situação",
    "minha situacao",
    "ajuda",
    "problema",
    "direito"
  ];
  const supportKeywords = [
    "status",
    "andamento",
    "processo",
    "consulta",
    "agendamento",
    "documento"
  ];
  const appointmentKeywords = [
    "agendar",
    "consulta",
    "horário",
    "horario",
    "marcar",
    "encontro",
    "falar com advogada"
  ];

  if (appointmentKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    intent = "appointment_interest";
  } else if (supportKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    intent = "support";
  } else if (leadInterestKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    intent = "lead_interest";
  } else if (curiosityKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    intent = "curiosity";
  }

  let leadTemperature: LeadTemperature = "cold";

  const hotKeywords = [
    "urgente",
    "perdi",
    "estou sendo",
    "preciso agora",
    "hoje",
    "imediatamente",
    "emergência",
    "emergencia"
  ];
  const warmKeywords = [
    "quero",
    "preciso",
    "meu caso",
    "minha situação",
    "minha situacao",
    "problema sério",
    "problema serio",
    "prejudicado"
  ];
  const urgencyIndicators = [
    "desconto indevido",
    "demissão injusta",
    "demissao injusta",
    "não paga pensão",
    "nao paga pensao",
    "perdi emprego",
    "ação executiva",
    "acao executiva"
  ];

  if (
    hotKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
    urgencyIndicators.some((keyword) => lowerMessage.includes(keyword))
  ) {
    leadTemperature = "hot";
  } else if (warmKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    leadTemperature = "warm";
  }

  return { theme, intent, leadTemperature };
}
