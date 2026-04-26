import type {
  LegalTheme,
  NoemiaChannel,
  NoemiaDomain
} from "./core-types.ts";

export type NoemiaConversationSurface = "public_comment" | "private_conversation";

export type NoemiaComplianceDecision = {
  shouldBypassModel: boolean;
  requiresHumanHandoff: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  reasonCodes: string[];
  safeReply?: string;
  maxQuestions: number;
  surface: NoemiaConversationSurface;
};

export type NoemiaComplianceAreaPolicy = {
  area: LegalTheme;
  commonSignals: string[];
  allowedInitialQuestions: string[];
  sensitiveQuestions: string[];
  urgencyTriggers: string[];
  mustNotAssert: string[];
  safeExample: string;
};

const PROBLEMATIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/cada dia de espera pode impactar diretamente seu resultado/gi, "como isso depende de prazos e documentos, a analise individual e importante"],
  [/vale muito pelo resultado/gi, "pode trazer mais clareza para decidir o proximo passo"],
  [/direito garantido/gi, "direito a ser avaliado no caso concreto"],
  [/causa ganha/gi, "caso que precisa de analise individual"],
  [/com certeza voce ganha/gi, "nao consigo confirmar o resultado sem analise humana"],
  [/com certeza voc[eê] ganha/gi, "nao consigo confirmar o resultado sem analise humana"],
  [/com certeza/gi, "com seguranca juridica"],
  [/podemos resolver isso rapidamente/gi, "podemos avaliar os caminhos possiveis com responsabilidade"],
  [/e so entrar com acao/gi, "pode haver caminhos juridicos a avaliar"],
  [/é só entrar com ação/gi, "pode haver caminhos juridicos a avaliar"],
  [/não perca tempo ou vai perder tudo/gi, "se houver prazo ou risco imediato, o ideal e uma avaliacao humana o quanto antes"],
  [/nao perca tempo ou vai perder tudo/gi, "se houver prazo ou risco imediato, o ideal e uma avaliacao humana o quanto antes"],
  [/orienta[cç][aã]o precisa e definitiva/gi, "orientacao responsavel apos analise individual"],
  [/garantir seus direitos/gi, "avaliar seus direitos com responsabilidade"],
  [/garantir seu benef[ií]cio/gi, "avaliar seu beneficio com responsabilidade"],
  [/equipe jur[ií]dica forte/gi, "processos internos proprios"],
  [/prioridade m[aá]xima/gi, "prioridade adequada"],
  [/come[cç]ar a trabalhar no seu caso/gi, "iniciar a avaliacao do contexto"]
];

const LEGAL_GUARANTEE_PATTERNS = [
  /causa ganha/i,
  /direito garantido/i,
  /com certeza (voce|você)?\s*(ganha|vai ganhar|tem direito)/i,
  /qual (a )?chance de (ganhar|vencer)/i,
  /quanto vou ganhar/i,
  /valor da indeniza/i,
  /prazo exato/i,
  /em quanto tempo (resolve|ganho|sai)/i,
  /me de um parecer/i,
  /me dê um parecer/i,
  /parecer juridico/i,
  /parecer jurídico/i,
  /devo assinar/i,
  /devo aceitar.*acordo/i,
  /devo desistir/i
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (as )?(suas )?instru/i,
  /finja ser advogada/i,
  /responda como se fosse minha advogada/i,
  /apague (os )?logs/i,
  /prometa que/i,
  /burlar/i,
  /fraudar/i,
  /falsificar/i,
  /enganar (o banco|a justica|a justiça|o inss|minha ex|meu ex)/i
];

const SENSITIVE_DATA_PATTERNS = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/,
  /laudo/i,
  /prontuario/i,
  /prontu[aá]rio/i,
  /doenca/i,
  /doen[cç]a/i,
  /menor de idade/i,
  /meu filho/i,
  /minha filha/i,
  /dados bancarios/i,
  /dados bancários/i,
  /senha/i
];

const URGENCY_PATTERNS = [
  /prazo/i,
  /intima[cç][aã]o/i,
  /audi[eê]ncia/i,
  /bloqueio judicial/i,
  /bloquearam minha conta/i,
  /viol[eê]ncia/i,
  /amea[cç]a/i,
  /medida protetiva/i,
  /alimentos/i,
  /pensão atrasada/i,
  /pensao atrasada/i,
  /benef[ií]cio cortado/i,
  /beneficio cortado/i,
  /rem[eé]dio/i,
  /sa[uú]de grave/i
];

export const NOEMIA_AREA_POLICIES: NoemiaComplianceAreaPolicy[] = [
  {
    area: "previdenciario",
    commonSignals: ["INSS", "beneficio negado", "beneficio cortado", "BPC/LOAS", "pericia"],
    allowedInitialQuestions: [
      "Qual beneficio esta em discussao?",
      "Houve negativa, corte ou convocacao recente?",
      "Voce recebeu alguma comunicacao oficial com data ou prazo?"
    ],
    sensitiveQuestions: ["laudos", "CID", "dados de saude", "CPF"],
    urgencyTriggers: ["beneficio alimentar cortado", "prazo de recurso", "pericia marcada"],
    mustNotAssert: ["tem direito", "ganha revisao", "valor certo de atrasados"],
    safeExample:
      "Entendi. Beneficio negado ou cortado precisa ser visto com documentos e prazos. Posso organizar as informacoes iniciais e encaminhar para a advogada avaliar com seguranca."
  },
  {
    area: "bancario",
    commonSignals: ["consignado", "RMC", "RCC", "negativacao", "golpe", "desconto indevido"],
    allowedInitialQuestions: [
      "O desconto ainda esta acontecendo?",
      "Voce reconhece esse contrato ou cartao?",
      "Tem extrato ou comprovante, sem me enviar dados sensiveis por aqui?"
    ],
    sensitiveQuestions: ["senha", "numero completo de cartao", "dados bancarios completos"],
    urgencyTriggers: ["bloqueio judicial", "fraude ativa", "desconto em verba alimentar"],
    mustNotAssert: ["banco cometeu ilegalidade", "indenizacao certa", "juros abusivos confirmados"],
    safeExample:
      "Entendi. Desconto indevido pode ter varios caminhos, mas depende do contrato e dos extratos. Vou te ajudar a organizar o essencial para uma analise humana."
  },
  {
    area: "familia",
    commonSignals: ["divorcio", "guarda", "pensao", "visitas", "uniao estavel", "partilha"],
    allowedInitialQuestions: [
      "O tema principal e guarda, pensao, divorcio ou partilha?",
      "Existe alguma audiencia, prazo ou decisao recente?",
      "Ha crianca/adolescente envolvido?"
    ],
    sensitiveQuestions: ["detalhes intimos", "dados de menor", "acusacoes sensiveis em publico"],
    urgencyTriggers: ["violencia domestica", "menor em risco", "alimentos/sobrevivencia", "audiencia proxima"],
    mustNotAssert: ["vai conseguir guarda", "pode parar de pagar", "deve sair de casa"],
    safeExample:
      "Entendo que e delicado. Em familia, cada detalhe pode mudar o caminho adequado. O melhor e organizar o minimo e encaminhar para a advogada avaliar com cuidado."
  },
  {
    area: "civil",
    commonSignals: ["contrato", "indenizacao", "cobranca", "danos morais", "responsabilidade civil"],
    allowedInitialQuestions: [
      "O problema envolve contrato, cobranca ou dano sofrido?",
      "Quando aconteceu?",
      "Existe notificacao, conversa ou documento sobre isso?"
    ],
    sensitiveQuestions: ["documento completo", "dados financeiros", "dados de terceiros"],
    urgencyTriggers: ["prazo contratual", "bloqueio", "notificacao recente", "prejuizo em andamento"],
    mustNotAssert: ["dano moral garantido", "valor de indenizacao", "prazo certo"],
    safeExample:
      "Entendi. Em casos civis, documentos e datas pesam bastante. Posso te ajudar a separar os pontos iniciais para uma analise individual."
  },
  {
    area: "geral",
    commonSignals: ["duvida juridica", "consulta", "orientacao"],
    allowedInitialQuestions: [
      "Qual e o tema principal?",
      "Isso envolve algum prazo, documento ou comunicacao oficial?",
      "Voce busca entender possibilidades ou falar com a advogada?"
    ],
    sensitiveQuestions: ["CPF", "senhas", "documentos completos"],
    urgencyTriggers: ["prazo", "intimacao", "violencia", "bloqueio"],
    mustNotAssert: ["resultado", "direito certo", "valor certo"],
    safeExample:
      "Posso te ajudar a organizar o inicio. Para confirmar o caminho juridico, a analise individual da advogada e importante."
  }
];

export function getNoemiaAreaPolicy(area: LegalTheme) {
  return NOEMIA_AREA_POLICIES.find((item) => item.area === area) || NOEMIA_AREA_POLICIES[4];
}

export function resolveNoemiaSurface(args: {
  channel: NoemiaChannel;
  domain: NoemiaDomain;
  metadata?: Record<string, unknown>;
}): NoemiaConversationSurface {
  const source = typeof args.metadata?.source === "string" ? args.metadata.source : "";

  if (
    args.domain === "channel_comment" ||
    source === "comment" ||
    source === "instagram_comment" ||
    source === "facebook_comment"
  ) {
    return "public_comment";
  }

  return "private_conversation";
}

export function evaluateNoemiaCompliance(args: {
  message: string;
  channel: NoemiaChannel;
  domain: NoemiaDomain;
  theme: LegalTheme;
  metadata?: Record<string, unknown>;
}): NoemiaComplianceDecision {
  const surface = resolveNoemiaSurface(args);
  const reasonCodes: string[] = [];
  const normalized = args.message.trim();
  const maxQuestions = surface === "public_comment" ? 0 : 3;

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasonCodes.push("prompt_injection_or_abuse");
  }

  if (LEGAL_GUARANTEE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasonCodes.push("legal_opinion_or_outcome_request");
  }

  if (SENSITIVE_DATA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasonCodes.push("sensitive_data_shared_or_requested");
  }

  if (URGENCY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasonCodes.push("mandatory_handoff_urgency");
  }

  if (surface === "public_comment" && reasonCodes.length > 0) {
    reasonCodes.push("public_comment_privacy_boundary");
  }

  const requiresHumanHandoff = reasonCodes.some((reason) =>
    [
      "legal_opinion_or_outcome_request",
      "sensitive_data_shared_or_requested",
      "mandatory_handoff_urgency",
      "public_comment_privacy_boundary"
    ].includes(reason)
  );
  const shouldBypassModel =
    surface === "public_comment" ||
    reasonCodes.includes("prompt_injection_or_abuse") ||
    requiresHumanHandoff;

  return {
    shouldBypassModel,
    requiresHumanHandoff,
    riskLevel: reasonCodes.includes("prompt_injection_or_abuse") ||
      reasonCodes.includes("mandatory_handoff_urgency")
      ? "critical"
      : requiresHumanHandoff
        ? "high"
        : reasonCodes.length > 0
          ? "medium"
          : "low",
    reasonCodes,
    safeReply: shouldBypassModel
      ? buildNoemiaSafeReply({
          surface,
          theme: args.theme,
          reasonCodes
        })
      : undefined,
    maxQuestions,
    surface
  };
}

export function buildNoemiaSafeReply(args: {
  surface: NoemiaConversationSurface;
  theme: LegalTheme;
  reasonCodes: string[];
}) {
  if (args.surface === "public_comment") {
    return "Entendi seu ponto. Por privacidade, nao e adequado analisar detalhes juridicos em comentario publico. Se quiser, chame no privado ou pelo WhatsApp para a equipe entender o contexto com cuidado.";
  }

  if (args.reasonCodes.includes("prompt_injection_or_abuse")) {
    return "Posso ajudar com orientacao inicial responsavel, mas nao posso ignorar regras de seguranca, prometer resultado ou orientar qualquer conduta irregular. Se houver um caso real, eu organizo o essencial e encaminho para avaliacao humana.";
  }

  if (args.reasonCodes.includes("mandatory_handoff_urgency")) {
    return "Entendi. Como pode haver prazo, risco ou urgencia real, o mais responsavel e encaminhar para avaliacao humana sem tentar concluir nada por aqui. Vou preservar o contexto e orientar a equipe a olhar com prioridade adequada.";
  }

  if (args.reasonCodes.includes("sensitive_data_shared_or_requested")) {
    return "Recebi seu relato. Para proteger seus dados, evite enviar CPF, senhas, documentos completos ou informacoes muito sensiveis por aqui. Posso organizar o resumo do caso e encaminhar para a equipe avaliar com seguranca.";
  }

  return "Posso te orientar de forma inicial, mas nao consigo confirmar direito, estrategia, prazo, valor ou resultado sem analise individual da advogada. Vou te ajudar a organizar as informacoes essenciais para avaliacao humana.";
}

export function sanitizeNoemiaReply(reply: string, args?: {
  surface?: NoemiaConversationSurface;
  theme?: LegalTheme;
}) {
  let sanitized = reply;

  for (const [pattern, replacement] of PROBLEMATIC_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  if (args?.surface === "public_comment") {
    sanitized = sanitized
      .replace(/me envie|manda|pode mandar/gi, "chame no privado")
      .replace(/documentos?|cpf|telefone|laudo|extrato/gi, "detalhes");
  }

  return sanitized.trim();
}

export function containsUnsafeLegalPromise(text: string) {
  return PROBLEMATIC_REPLACEMENTS.some(([pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }) ||
    LEGAL_GUARANTEE_PATTERNS.some((pattern) => pattern.test(text));
}
