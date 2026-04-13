/**
 * NOEMIA CORE - CÉREBRO CENTRALIZADO DA IA
 *
 * Única camada responsável por toda inteligência da NoemIA
 * Usado por: site, portal, WhatsApp, Instagram
 */

import { OpenAI } from "openai";
import { clientContextService } from "../services/client-context";
import { conversationPersistence } from "../services/conversation-persistence";
import { saveTriageData } from "./triage-persistence";
import { PortalProfile } from "../auth/guards";
import { askNoemiaSchema } from "../domain/portal";
import {
  ClassifiedIntent,
  FollowUpAttempt,
  FollowUpTrigger,
  FollowUpRule,
  LeadTemperature,
  LegalTheme,
  NoemiaContext,
  NoemiaChannel,
  NoemiaUserType,
  PriorityLevel,
  RecommendedAction
} from "./core-types";
import {
  classifyMessage as classifyIncomingMessage,
  detectLegalTheme as detectConversationTheme,
  detectUserIntent as detectConversationIntent
} from "./message-classifier";
import { buildSystemPrompt as buildNoemiaSystemPrompt } from "./system-prompt";
import {
  initializeConversationState as initializeManagedConversationState,
  updateConversationState as updateManagedConversationState
} from "./state-manager";
import {
  evaluatePolicyHandoff as evaluateManagedPolicyHandoff,
  shouldAdvanceToNextStage as shouldAdvanceManagedStage
} from "./handoff-orchestrator";
import {
  generateFallbackResponse as generateManagedFallbackResponse,
  generateInternalSummary as generateManagedInternalSummary,
  generateTriageResponse as generateManagedTriageResponse
} from "./response-composer";

export type {
  ClassifiedIntent,
  FollowUpAttempt,
  FollowUpRule,
  FollowUpTrigger,
  LeadTemperature,
  LegalTheme,
  NoemiaChannel,
  NoemiaContext,
  NoemiaUserType,
  PriorityLevel,
  RecommendedAction
} from "./core-types";

interface FollowUpContext {
  lastMessage: string;
  lastMessageTime: Date;
  currentTime: Date;
  inactivityMinutes: number;
  conversationState: ConversationState;
  previousAttempts: FollowUpAttempt[];
}

interface ConversationContext {
  userName?: string;
  detectedArea?: LegalTheme;
  problemSummary?: string;
  lastTopics?: string[];
  messageCount: number;
  leadIntention?: 'perdido' | 'desconfiado' | 'pronto';
}

type LeadIntention = 'perdido' | 'desconfiado' | 'pronto';

interface LeadIntentionProfile {
  type: LeadIntention;
  textLength: 'curto' | 'medio' | 'longo';
  empathyLevel: 'baixa' | 'media' | 'alta';
  conversationSpeed: 'lenta' | 'normal' | 'rapida';
  insightIntensity: 'suave' | 'moderada' | 'forte';
  skipQuestions: boolean;
  fastConversion: boolean;
}

const MESSAGE_VARIATIONS = {
  abertura: [
    "Me conta melhor o que aconteceu no seu caso.",
    "Quero entender direitinho o que está acontecendo.",
    "Pode me explicar com mais detalhes a sua situação?",
    "Vamos entender melhor isso juntos.",
    "Me conta como foi essa situação com calma.",
    "Oi! Pode me contar um pouco melhor o que aconteceu?",
    "Quero entender direitinho pra te orientar melhor.",
    "Me explica com calma a sua situação, tá?",
    "Pode me dar mais detalhes do que você está passando?",
    "Me conta com calma o que está acontecendo no seu caso."
  ],
  
  investigacao: [
    "E o que aconteceu exatamente?",
    "Me conta mais detalhes sobre isso...",
    "Pode me explicar melhor o que rolou?",
    "Como foi que isso aconteceu?",
    "Qual foi o desenrolar dessa situação?",
    "E como foi que isso se desenhou?",
    "Me diz os detalhes do que aconteceu.",
    "Pode me narrar melhor os fatos?",
    "Como essa situação se desenvolveu?",
    "Qual foi o curso dos acontecimentos?"
  ],
  
  tempo: [
    "E quando começou essa situação?",
    "Há quanto tempo isso está acontecendo?",
    "Quando foi que isso começou?",
    "Desde quando você está passando por isso?",
    "Me diz quando esse problema surgiu.",
    "E há quanto tempo você está lidando com isso?",
    "Quando essa questão começou a aparecer?",
    "Desde quando essa situação existe?",
    "E o período em que isso começou foi quando?",
    "Há quanto tempo esse cenário vem se arrastando?"
  ],
  
  tentativa: [
    "Você já tentou resolver isso de alguma forma?",
    "Já fez alguma tentativa de resolver isso?",
    "Já procurou alguma solução pra isso?",
    "Já tomou alguma atitude sobre isso?",
    "Já buscou ajuda com isso antes?",
    "E você já tentou alguma coisa pra resolver?",
    "Já fez algum movimento nessa direção?",
    "Já procurou resolver essa questão?",
    "Já tomou alguma providência a respeito?",
    "Já buscou algum tipo de solução?"
  ],
  
  negativa: [
    "Teve alguma negativa ou resposta oficial?",
    "Recebeu alguma resposta negativa?",
    "Teve algum tipo de negativa?",
    "Alguém te deu uma resposta oficial sobre isso?",
    "Já recebeu algum não sobre isso?",
    "E teve alguma resposta contrária?",
    "Já obteve algum tipo de recusa?",
    "Teve algum retorno negativo oficial?",
    "Recebeu alguma negativa formal?",
    "Já ouviu um não sobre essa questão?"
  ],
  
  insight: [
    "Esse tipo de situação é muito comum quando há erro na análise ou um direito não foi corretamente reconhecido.",
    "Pelo que você descreveu, há sinais importantes que merecem uma análise mais cuidadosa.",
    "Sua situação tem características que indicam provável falha na avaliação do caso.",
    "Os detalhes que você compartilhou apontam para um erro ou direito não reconhecido.",
    "Essa é uma situação clássica onde a análise inicial provavelmente falhou.",
    "O que você relata mostra indícios claros de erro na avaliação do seu caso.",
    "Sua história tem padrões que sugerem direito não reconhecido ou análise equivocada.",
    "Esses elementos que você descreve são típicos de casos com falha na análise.",
    "O cenário que você apresenta tem marcas de erro na avaliação inicial.",
    "Essa situação que você vivencia é característica de análise falha."
  ],
  
  direcionamento: [
    "O ideal agora é uma análise mais detalhada do seu caso.",
    "O próximo passo é uma análise mais cuidadosa da sua situação.",
    "Precisamos aprofundar a análise do seu caso agora.",
    "O momento é de uma avaliação mais detalhada do seu cenário.",
    "O caminho agora é estudar seu caso com mais atenção.",
    "Vamos precisar analisar seu caso com mais profundidade.",
    "O ideal é uma investigação mais aprofundada da sua situação.",
    "Precisamos mergulhar nos detalhes do seu caso agora.",
    "O momento exige uma análise mais criteriosa do seu caso.",
    "Vamos ter que examinar seu caso com mais cuidado agora."
  ],
  
  conversao: [
    "Se quiser, posso te explicar como funciona e te encaminhar para agendamento.",
    "Posso te mostrar como funciona a consulta e já te ajudar a marcar.",
    "Se fizer sentido, explico o processo e já te encaminho.",
    "Quer que eu explique como funciona e já agente pra você?",
    "Posso te guiar no processo e já te encaminhar.",
    "Se estiver bom pra você, mostro como funciona e já marco.",
    "Quer saber como funciona? Posso explicar e já te encaminhar.",
    "Posso te apresentar o processo e já te direcionar.",
    "Se fizer sentido, te mostro o caminho e já te ajudo.",
    "Posso te guiar nesse próximo passo e já te encaminhar."
  ]
};

const TONE_BY_AREA = {
  previdenciario: {
    prefixo: "",
    sufixo: " - cada detalhe faz diferença nesses casos.",
    adaptacao: "mais orientação e clareza"
  },
  bancario: {
    prefixo: "Cuidado: ",
    sufixo: " - bancos costumam ter equipe jurídica forte.",
    adaptacao: "mais firmeza + alerta"
  },
  familia: {
    prefixo: "",
    sufixo: " - entendo como isso é delicado.",
    adaptacao: "mais empatia"
  },
  civil: {
    prefixo: "",
    sufixo: " - precisamos analisar os documentos com atenção.",
    adaptacao: "mais técnico + cuidado"
  },
  geral: {
    prefixo: "",
    sufixo: "",
    adaptacao: "equilibrado"
  }
};

const AREA_KEYWORDS = {
  previdenciario: [
    "aposentadoria", "inss", "benefício", "auxílio", "aposentar", 
    "aposentado", "aposentada", "rgps", "loas", "bpc", "idade",
    "contribuição", "tempo de contribuição", "salário maternidade"
  ],
  bancario: [
    "banco", "empréstimo", "juros", "desconto", "financiamento",
    "cartão", "cheque especial", "cobrança", "multa", "tarifa",
    "saldo", "extrato", "limite", "negativado", "serasa", "spc"
  ],
  familia: [
    "pensão", "divórcio", "guarda", "filhos", "casamento", "separação",
    "alimentos", "partilha", "união estável", "inventário", "herança",
    "testamento", "paternidade", "guarda compartilhada"
  ],
  civil: [
    "contrato", "indenização", "dano", "moral", "material", "acidente",
    "responsabilidade", "cláusula", "multa contratual", "cumprimento",
    "obrigação", "direito", "reparação", "prejuízo"
  ]
};

// Sistema anti-repetição
const lastUsedMessages: Map<string, string[]> = new Map();

function getVariationWithoutRepetition(variations: string[], context: string): string {
  const lastMessages = lastUsedMessages.get(context) || [];
  
  // Filtrar variações não usadas recentemente
  const availableVariations = variations.filter(v => !lastMessages.includes(v));
  
  // Se todas foram usadas recentemente, limpar e usar todas
  const finalVariations = availableVariations.length > 0 ? availableVariations : variations;
  
  const selected = finalVariations[Math.floor(Math.random() * finalVariations.length)];
  
  // Atualizar histórico (manter apenas últimas 3)
  const newHistory = [selected, ...lastMessages].slice(0, 3);
  lastUsedMessages.set(context, newHistory);
  
  return selected;
}

// Empatia inteligente contextual
const EMPATHY_PHRASES = {
  previdenciario: [
    "Entendi... isso realmente pode gerar bastante insegurança.",
    "Compreendo como essa situação pode ser estressante.",
    "Sei como é difícil lidar com essas questões previdenciárias.",
    "Imagino o quanto isso te preocupa.",
    "Entendo perfeitamente como isso afeta sua tranquilidade."
  ],
  bancario: [
    "Entendo... essa situação com o banco deve estar bem frustrante.",
    "Compreendo como problemas financeiros geram muita ansiedade.",
    "Sei o quanto é desgastante lidar com instituições bancárias.",
    "Imagino o estresse que essa situação está causando.",
    "Entendo como isso afeta seu planejamento financeiro."
  ],
  familia: [
    "Entendo... questões de família são sempre muito delicadas.",
    "Compreendo o quanto isso emocionalmente pesa.",
    "Sei como é difícil lidar com essas situações familiares.",
    "Imagino a carga emocional que você está carregando.",
    "Entendo perfeitamente como isso mexe com seus sentimentos."
  ],
  civil: [
    "Entendo... essas questões civis podem ser bem complexas.",
    "Compreendo como isso te deixa preocupado.",
    "Sei o quanto é estressante lidar com trâmites legais.",
    "Imagino a incerteza que essa situação gera.",
    "Entendo como isso afeta seus planos."
  ],
  geral: [
    "Entendo... essa situação realmente exige atenção.",
    "Compreendo como isso pode ser preocupante.",
    "Sei o quanto é importante resolver isso.",
    "Imagino o quanto isso impacta seu dia a dia.",
    "Entendo perfeitamente sua preocupação."
  ]
};

// Palavras-chave para detecção de intenção do lead
const LEAD_INTENTION_KEYWORDS = {
  perdido: [
    "não sei", "acho que", "talvez", "será que", "duvido", "incerto", "confuso",
    "não tenho certeza", "me parece", "gostaria de saber", "queria entender",
    "fiquei em dúvida", "não entendo", "estou perdido", "não sei por onde começar",
    "é complicado", "estou confuso", "preciso de ajuda", "não sei o que fazer"
  ],
  
  desconfiado: [
    "isso é errado", "banco pode fazer isso", "isso é legal", "tem certeza",
    "está certo isso", "podem fazer isso", "é permitido", "isso é normal",
    "isso é crime", "é irregular", "tem algum problema", "estão me enganando",
    "é verdade isso", "posso confiar", "está correto", "tem garantia"
  ],
  
  pronto: [
    "quanto custa", "quero resolver", "quero agendar", "quero consultar",
    "quanto tempo", "quero resolver agora", "preciso resolver urgente",
    "quero marcar", "quanto vale", "qual o valor", "quero começar",
    "vamos agendar", "quero resolver rápido", "quanto demora", "estou pronto"
  ]
};

// Perfis comportamentais por tipo de lead
const LEAD_PROFILES: Record<LeadIntention, LeadIntentionProfile> = {
  perdido: {
    type: 'perdido',
    textLength: 'longo',
    empathyLevel: 'alta',
    conversationSpeed: 'lenta',
    insightIntensity: 'suave',
    skipQuestions: false,
    fastConversion: false
  },
  
  desconfiado: {
    type: 'desconfiado',
    textLength: 'medio',
    empathyLevel: 'baixa',
    conversationSpeed: 'normal',
    insightIntensity: 'moderada',
    skipQuestions: false,
    fastConversion: false
  },
  
  pronto: {
    type: 'pronto',
    textLength: 'curto',
    empathyLevel: 'media',
    conversationSpeed: 'rapida',
    insightIntensity: 'forte',
    skipQuestions: true,
    fastConversion: true
  }
};

// Indicadores de momento de fechamento
const CLOSING_INDICATORS = {
  interesse: [
    "quanto custa", "qual o valor", "quanto tempo", "quero resolver", "quero agendar",
    "quero consultar", "quanto demora", "estou pronto", "quero começar", "vamos agendar",
    "quero resolver agora", "preciso resolver urgente", "quanto vale", "qual o preço"
  ],
  
  engajamento: [
    "entendi", "certo", "ok", "sim", "faz sentido", "concordo", "entendi perfeitamente",
    "boa ideia", "parece bom", "interessante", "quero saber mais", "me explica melhor"
  ],
  
  problema_real: [
    "estou passando por isso", "aconteceu comigo", "estou nessa situação", "exatamente isso",
    "é o meu caso", "isso está acontecendo", "estou enfrentando", "vivo isso agora",
    "preciso mesmo resolver", "não sei mais o que fazer", "estou desesperado"
  ],
  
  hesitacao: [
    "não sei", "tenho dúvida", "será que", "fico receoso", "tenho medo", "não tenho certeza",
    "e se não der certo", "e se não resolver", "tenho receio", "estou em dúvida"
  ]
};

const SMOOTH_TRANSITIONS = [
  "O que você me descreveu merece uma análise mais cuidadosa.",
  "Pelo que você compartilhou, seu caso precisa de atenção especializada.",
  "Sua situação tem particularidades que merecem uma análise individual.",
  "Esses detalhes que você mencionou indicam que uma análise profunda é necessária.",
  "O cenário que você apresenta tem marcas de erro na avaliação inicial.",
  "O cenário que você apresentou exige uma avaliação cuidadosa por um especialista.",
  "Com base no que você me contou, o próximo passo é uma análise profissional.",
  "Sua história tem elementos que precisam ser estudados com mais atenção.",
  "O que você está passando merece uma orientação especializada e segura."
];

const ELEGANT_OFFERS = [
  "Na consulta, conseguimos analisar seu caso com profundidade e te orientar com segurança sobre o que pode ser feito.",
  "Uma consulta individual permite que a Dra. Noêmia examine todos os detalhes do seu caso e identifique as melhores estratégias.",
  "Durante a consulta, fazemos uma análise completa da sua situação e traçamos um plano de ação claro e seguro.",
  "Na consulta, a Dra. Noêmia consegue ver aspectos do seu caso que não ficam evidentes numa conversa inicial.",
  "A consulta é o momento ideal para analisarmos fundo sua situação e te darmos orientação precisa e definitiva."
];

const NATURAL_CALLS = [
  "Se fizer sentido pra você, posso te explicar como funciona e já te encaminhar para agendamento.",
  "Quer que eu explique como funciona a consulta e já te ajude a marcar?",
  "Posso te mostrar o processo e já te encaminhar para agendamento, se estiver bom pra você.",
  "Se você quiser, explico como funciona e já organizo seu agendamento.",
  "Posso te guiar no processo e já te encaminhar para a consulta.",
  "Que tal eu te explicar como funciona e já te ajudar a agendar?"
];

const OBJECTION_HANDLERS = {
  duvida: [
    "Muitas pessoas chegam com a mesma dúvida, e a análise inicial costuma esclarecer muita coisa que não fica clara sozinho.",
    "É normal ter essa dúvida. A maioria dos nossos clientes começou assim, e a consulta resolveu completamente.",
    "Compreendo perfeitamente sua dúvida. A verdade é que só uma análise detalhada pode dar segurança real sobre seu caso.",
    "Essa dúvida é muito comum. Por isso mesmo que a consulta é importante - para trazer clareza e segurança."
  ],
  
  custo: [
    "A consulta é um investimento na clareza e segurança do seu caso. Vale muito pela tranquilidade que traz.",
    "Entendo a preocupação com o valor. A consulta na verdade economiza tempo e evita erros que custariam muito mais.",
    "O valor da consulta é muito menor que o prejuízo de não resolver seu caso corretamente desde o início.",
    "Pensando bem, a consulta é o custo mais baixo para garantir que seus direitos sejam protegidos adequadamente."
  ],
  
  tempo: [
    "Uma consulta bem feita acelera muito a resolução do caso. Tempo investido agora economiza meses depois.",
    "A consulta é rápida, mas o impacto é duradouro. Em poucas horas ganhamos clareza que levaria meses sozinho.",
    "Entendo a preocupação com tempo. Por isso mesmo que a consulta é eficiente - nos dá um caminho claro e rápido.",
    "A consulta otimiza todo o processo. É o tempo mais bem investido para resolver sua situação com segurança."
  ]
};

// Indicadores específicos de intenção de compra
const BUYING_INTENTION_INDICATORS = {
  preco: [
    "quanto custa", "qual o valor", "quanto vale", "qual o preço", "quanto cobram",
    "valor da consulta", "preço da consulta", "custo da consulta", "quanto pago",
    "quanto fico", "quanto investimento", "valor investido", "taxa", "honorários"
  ],
  
  como_funciona: [
    "como funciona", "como é a consulta", "como funciona a consulta",
    "qual o processo", "como começar", "como agendar", "como marcar",
    "qual o procedimento", "como é feito", "etapas do processo", "passo a passo"
  ],
  
  intencao_resolver: [
    "quero resolver", "preciso resolver", "quero resolver agora", "quero resolver urgente",
    "quero começar", "quero agendar", "quero consultar", "quero marcar consulta",
    "quero começar agora", "estou pronto", "vamos resolver", "preciso de ajuda agora"
  ],
  
  decisao_compra: [
    "quanto tempo", "quanto demora", "quanto tempo leva", "quanto tempo demora resolver",
    "já posso agendar", "quero agendar agora", "posso marcar hoje", "quando começar",
    "pronto para agendar", "decidi agendar", "quero começar o tratamento"
  ]
};

// Mensagens de condução rápida para compra
const FAST_CONVERSION_MESSAGES = {
  preco: [
    "Ótima pergunta! Posso te explicar como funciona a consulta e já te encaminhar para agendamento.",
    "Sobre o valor, vamos conversar durante a consulta. Posso já te explicar como funciona e te ajudar a marcar?",
    "O valor da consulta é acessível e vale muito pelo resultado. Quer que eu te explique o processo e já agende?",
    "Vamos falar sobre valores na consulta. Posso te mostrar como funciona e já te encaminhar para agendamento?"
  ],
  
  como_funciona: [
    "Perfeito! Posso te explicar como funciona a consulta e já te encaminhar para agendamento.",
    "Ótimo! Deixe eu te explicar o processo e já te ajude a marcar sua consulta.",
    "Excelente pergunta! Posso te mostrar como funciona e já organizar seu agendamento.",
    "Fico feliz em explicar! Quer que eu detalhe o processo e já te encaminhe para agendamento?"
  ],
  
  intencao_resolver: [
    "Perfeito! Posso te explicar como funciona a consulta e já te encaminhar para agendamento.",
    "Excelente! Vou te mostrar o processo e já te ajudar a marcar sua consulta.",
    "Ótimo! Posso te explicar como funciona e já organizar seu agendamento.",
    "Perfeito! Quer que eu te mostre o processo e já te ajude a agendar?"
  ],
  
  decisao_compra: [
    "Excelente! Posso te explicar como funciona a consulta e já te encaminhar para agendamento.",
    "Perfeito! Vou te mostrar o processo e já te ajudar a marcar sua consulta.",
    "Ótimo! Posso te explicar como funciona e já organizar seu agendamento.",
    "Excelente! Quer que eu detalhe o processo e já te encaminhe para agendamento?"
  ]
};

function adaptMessageForLead(
  baseMessage: string, 
  profile: LeadIntentionProfile, 
  area: LegalTheme
): string {
  let adaptedMessage = baseMessage;
  
  // Ajustar comprimento do texto
  if (profile.textLength === 'curto') {
    // Versões curtas para leads prontos
    adaptedMessage = adaptedMessage.replace(/Me conta com calma o que está acontecendo no seu caso\./, "Me conta resumidamente seu caso.");
    adaptedMessage = adaptedMessage.replace(/Quero entender direitinho o que está acontecendo\./, "Entendi rápido. Qual seu caso?");
  } else if (profile.textLength === 'longo') {
    // Versões mais explicativas para leads perdidos
    adaptedMessage = adaptedMessage.replace(/\?/, "... não se preocupe se não souber exato, me explique do seu jeito?");
    adaptedMessage = adaptedMessage.replace(/Me conta/, "Por favor, me conte com detalhes");
  }
  
  // Ajustar empatia baseada no perfil
  if (profile.empathyLevel === 'alta') {
    // Leads perdidos precisam de mais acolhimento
    adaptedMessage = `Entendo que essa situação pode ser confusa. ${adaptedMessage}`;
  } else if (profile.empathyLevel === 'baixa') {
    // Leads desconfiados precisam de mais firmeza
    adaptedMessage = adaptedMessage.replace(/Oi!/g, "Olá.");
    adaptedMessage = adaptedMessage.replace(/... /g, ". ");
  }
  
  return adaptedMessage;
}

function shouldSkipQuestions(profile: LeadIntentionProfile): boolean {
  return profile.skipQuestions;
}

function shouldFastConversion(profile: LeadIntentionProfile): boolean {
  return profile.fastConversion;
}

// Funções de detecção de momento de fechamento
function detectClosingMoment(message: string): {
  hasInterest: boolean;
  hasEngagement: boolean;
  hasRealProblem: boolean;
  hasHesitation: boolean;
  shouldClose: boolean;
} {
  const lowerMessage = message.toLowerCase();
  
  const hasInterest = CLOSING_INDICATORS.interesse.some(indicator => lowerMessage.includes(indicator));
  const hasEngagement = CLOSING_INDICATORS.engajamento.some(indicator => lowerMessage.includes(indicator));
  const hasRealProblem = CLOSING_INDICATORS.problema_real.some(indicator => lowerMessage.includes(indicator));
  const hasHesitation = CLOSING_INDICATORS.hesitacao.some(indicator => lowerMessage.includes(indicator));
  
  // Decidir se deve fechar
  const shouldClose = hasInterest || (hasEngagement && hasRealProblem) || (hasRealProblem && !hasHesitation);
  
  return {
    hasInterest,
    hasEngagement,
    hasRealProblem,
    hasHesitation,
    shouldClose
  };
}

function detectLeadIntention(message: string): LeadIntention {
  const lowerMessage = message.toLowerCase();
  
  // Contar palavras-chave por tipo de intenção
  const counts: Record<LeadIntention, number> = {
    perdido: 0,
    desconfiado: 0,
    pronto: 0
  };
  
  // Contar ocorrências
  for (const [intention, keywords] of Object.entries(LEAD_INTENTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        counts[intention as LeadIntention]++;
      }
    }
  }
  
  // Encontrar intenção com mais palavras-chave
  let maxCount = 0;
  let detectedIntention: LeadIntention = 'perdido'; // padrão
  
  for (const [intention, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedIntention = intention as LeadIntention;
    }
  }
  
  // Se encontrou palavras-chave, retorna a intenção; senão, perdido (padrão)
  return maxCount > 0 ? detectedIntention : 'perdido';
}

function getLeadProfile(intention: LeadIntention): LeadIntentionProfile {
  return LEAD_PROFILES[intention];
}

// Funções de condução para consulta
function generateSmoothTransition(): string {
  return SMOOTH_TRANSITIONS[Math.floor(Math.random() * SMOOTH_TRANSITIONS.length)];
}

function generateElegantOffer(): string {
  return ELEGANT_OFFERS[Math.floor(Math.random() * ELEGANT_OFFERS.length)];
}

function generateNaturalCall(): string {
  return NATURAL_CALLS[Math.floor(Math.random() * NATURAL_CALLS.length)];
}

function generateObjectionHandler(type: 'duvida' | 'custo' | 'tempo'): string {
  const handlers = OBJECTION_HANDLERS[type];
  return handlers[Math.floor(Math.random() * handlers.length)];
}

function generateClosingMessage(context: ConversationContext, message: string): string | null {
  const closingMoment = detectClosingMoment(message);
  
  if (!closingMoment.shouldClose) {
    return null;
  }
  
  const leadProfile = getLeadProfile(context.leadIntention || 'perdido');
  
  // Construir mensagem de fechamento
  let messageParts: string[] = [];
  
  // 1. Transição suave
  messageParts.push(generateSmoothTransition());
  
  // 2. Oferta elegante
  messageParts.push(generateElegantOffer());
  
  // 3. Chamada para ação natural
  messageParts.push(generateNaturalCall());
  
  // 4. Tratar hesitação se necessário
  if (closingMoment.hasHesitation) {
    const objectionType = message.toLowerCase().includes('custo') || message.toLowerCase().includes('valor') ? 'custo' :
                        message.toLowerCase().includes('tempo') ? 'tempo' : 'duvida';
    messageParts.push(generateObjectionHandler(objectionType));
  }
  
  return messageParts.join('\n\n');
}

// Funções de detecção de intenção de compra
function detectBuyingIntention(message: string): {
  hasPriceInquiry: boolean;
  hasProcessInquiry: boolean;
  hasResolutionIntention: boolean;
  hasDecisionIntention: boolean;
  shouldFastConvert: boolean;
  intentionType?: 'preco' | 'como_funciona' | 'intencao_resolver' | 'decisao_compra';
} {
  const lowerMessage = message.toLowerCase();
  
  const hasPriceInquiry = BUYING_INTENTION_INDICATORS.preco.some(indicator => lowerMessage.includes(indicator));
  const hasProcessInquiry = BUYING_INTENTION_INDICATORS.como_funciona.some(indicator => lowerMessage.includes(indicator));
  const hasResolutionIntention = BUYING_INTENTION_INDICATORS.intencao_resolver.some(indicator => lowerMessage.includes(indicator));
  const hasDecisionIntention = BUYING_INTENTION_INDICATORS.decisao_compra.some(indicator => lowerMessage.includes(indicator));
  
  // Determinar tipo de intenção
  let intentionType: 'preco' | 'como_funciona' | 'intencao_resolver' | 'decisao_compra' | undefined;
  if (hasPriceInquiry) intentionType = 'preco';
  else if (hasProcessInquiry) intentionType = 'como_funciona';
  else if (hasResolutionIntention) intentionType = 'intencao_resolver';
  else if (hasDecisionIntention) intentionType = 'decisao_compra';
  
  // Decidir se deve converter rapidamente
  const shouldFastConvert = hasPriceInquiry || hasProcessInquiry || hasResolutionIntention || hasDecisionIntention;
  
  return {
    hasPriceInquiry,
    hasProcessInquiry,
    hasResolutionIntention,
    hasDecisionIntention,
    shouldFastConvert,
    intentionType
  };
}

function generateFastConversionMessage(
  intentionType: 'preco' | 'como_funciona' | 'intencao_resolver' | 'decisao_compra',
  leadId?: string,
  userId?: string
): string {
  const messages = FAST_CONVERSION_MESSAGES[intentionType];
  const baseMessage = messages[Math.floor(Math.random() * messages.length)];
  
  // Se temos leadId e userId, podemos gerar link de pagamento
  if (leadId && userId) {
    return `${baseMessage}

O próximo passo é uma análise completa do seu caso, onde conseguimos te orientar com segurança sobre o que pode ser feito.

Vou te encaminhar o link para agendamento da consulta. Assim que confirmar, já seguimos com prioridade.

🔗 **Gerando link de pagamento...**`;
  }
  
  return baseMessage;
}

function shouldReduceInvestigation(message: string): boolean {
  const buyingIntention = detectBuyingIntention(message);
  return buyingIntention.shouldFastConvert;
}

function shouldIncreaseDirection(message: string): boolean {
  const buyingIntention = detectBuyingIntention(message);
  return buyingIntention.shouldFastConvert;
}

function addIntelligentEmpathy(baseMessage: string, area: LegalTheme, context: ConversationContext): string {
  // Adicionar empatia apenas em momentos estratégicos (não toda mensagem)
  const shouldAddEmpathy = context.messageCount > 1 && Math.random() > 0.6; // 40% de chance após primeira mensagem
  
  if (!shouldAddEmpathy) {
    return baseMessage;
  }
  
  const empathyPhrases = EMPATHY_PHRASES[area] || EMPATHY_PHRASES.geral;
  const empathy = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
  
  // Inserir empatia de forma natural
  if (baseMessage.includes("?")) {
    return baseMessage.replace("?", `... ${empathy}?`);
  }
  
  return `${empathy} ${baseMessage}`;
}

function detectLegalArea(message: string): LegalTheme {
  const lowerMessage = message.toLowerCase();
  
  // Contar palavras-chave por área
  const counts: Record<LegalTheme, number> = {
    previdenciario: 0,
    bancario: 0,
    familia: 0,
    civil: 0,
    geral: 0
  };
  
  // Contar ocorrências
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        counts[area as LegalTheme]++;
      }
    }
  }
  
  // Encontrar área com mais palavras-chave
  let maxCount = 0;
  let detectedArea: LegalTheme = 'geral';
  
  for (const [area, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedArea = area as LegalTheme;
    }
  }
  
  // Se encontrou palavras-chave, retorna a área; senão, geral
  return maxCount > 0 ? detectedArea : 'geral';
}

function extractUserInfo(message: string): { name?: string; problemSummary?: string } {
  const info: { name?: string; problemSummary?: string } = {};
  
  // Detectar nome (padrões comuns)
  const namePatterns = [
    /meu nome é ([a-zA-Z\s]+)/i,
    /eu sou ([a-zA-Z\s]+)/i,
    /chamo-me de ([a-zA-Z\s]+)/i,
    /([a-zA-Z]+) aqui/i
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      info.name = match[1].trim().split(' ')[0]; // Pega só o primeiro nome
      break;
    }
  }
  
  // Resumir problema (primeira parte da mensagem)
  const cleanMessage = message.replace(/meu nome é [^.]*\./gi, '')
                            .replace(/eu sou [^.]*\./gi, '')
                            .replace(/chamo-me de [^.]*\./gi, '');
  
  if (cleanMessage.length > 20) {
    info.problemSummary = cleanMessage.substring(0, 80) + 
                         (cleanMessage.length > 80 ? '...' : '');
  }
  
  return info;
}

function adaptMessageTone(baseMessage: string, area: LegalTheme): string {
  const tone = TONE_BY_AREA[area];
  return tone.prefixo + baseMessage + tone.sufixo;
}

function updateConversationContext(
  context: ConversationContext | undefined,
  message: string,
  detectedArea: LegalTheme
): ConversationContext {
  const userInfo = extractUserInfo(message);
  const leadIntention = detectLeadIntention(message);
  
  return {
    userName: context?.userName || userInfo.name,
    detectedArea: detectedArea !== 'geral' ? detectedArea : context?.detectedArea,
    problemSummary: context?.problemSummary || userInfo.problemSummary,
    lastTopics: context?.lastTopics ? [...context.lastTopics.slice(-2), detectedArea] : [detectedArea],
    messageCount: (context?.messageCount || 0) + 1,
    leadIntention: leadIntention
  };
}

function personalizeMessage(baseMessage: string, context: ConversationContext): string {
  let personalized = baseMessage;
  
  // Adicionar nome se disponível e for a primeira mensagem
  if (context.userName && context.messageCount <= 2) {
    personalized = personalized.replace('Oi!', `Oi, ${context.userName}!`);
  }
  
  // Fazer referência ao contexto se disponível
  if (context.problemSummary && context.messageCount > 1) {
    if (context.detectedArea === 'bancario') {
      personalized = personalized.replace(
        'o que aconteceu',
        'esse problema com o banco que você mencionou'
      );
    } else if (context.detectedArea === 'familia') {
      personalized = personalized.replace(
        'o que aconteceu',
        'essa questão de família que você comentou'
      );
    } else if (context.detectedArea === 'previdenciario') {
      personalized = personalized.replace(
        'o que aconteceu',
        'essa questão previdenciária que você mencionou'
      );
    }
  }
  
  return personalized;
}

export function shouldTriggerFollowUp(
  conversationState: ConversationState,
  lastMessageTime: Date,
  previousAttempts: FollowUpAttempt[] = []
): {
  shouldTrigger: boolean;
  trigger?: FollowUpTrigger;
  rule?: FollowUpRule;
  message?: string;
  nextAttemptAt?: Date;
} {
  const currentTime = new Date();
  const inactivityMinutes = (currentTime.getTime() - lastMessageTime.getTime()) / (1000 * 60);
  
  const context: FollowUpContext = {
    lastMessage: '', // Seria preenchido com a última mensagem real
    lastMessageTime,
    currentTime,
    inactivityMinutes,
    conversationState,
    previousAttempts
  };
  
  const trigger = detectFollowUpTrigger(context);
  if (!trigger) {
    return { shouldTrigger: false };
  }
  
  const rule = getFollowUpRule(trigger, conversationState.leadTemperature, conversationState.commercialStatus);
  if (!rule) {
    return { shouldTrigger: false };
  }
  
  // Verificar se já excedeu o número máximo de tentativas
  const attemptsForTrigger = previousAttempts.filter(a => a.trigger === trigger);
  if (attemptsForTrigger.length >= rule.maxAttempts) {
    return { shouldTrigger: false };
  }
  
  // Calcular próximo tempo de tentativa
  const lastAttemptForTrigger = attemptsForTrigger[attemptsForTrigger.length - 1];
  let nextAttemptAt: Date;
  
  if (!lastAttemptForTrigger) {
    // Primeira tentativa - usar cadência da regra
    nextAttemptAt = new Date(lastMessageTime.getTime() + 
      (rule.cadence.minutes * 60 * 1000) + 
      (rule.cadence.hours * 60 * 60 * 1000) + 
      (rule.cadence.days * 24 * 60 * 60 * 1000)
    );
  } else {
    // Tentativas subsequentes - dobrar o intervalo
    const baseInterval = (rule.cadence.minutes * 60 * 1000) + 
                       (rule.cadence.hours * 60 * 60 * 1000) + 
                       (rule.cadence.days * 24 * 60 * 60 * 1000);
    const multiplier = Math.pow(2, attemptsForTrigger.length);
    nextAttemptAt = new Date(lastAttemptForTrigger.sentAt.getTime() + (baseInterval * multiplier));
  }
  
  // Verificar se já é hora
  if (currentTime >= nextAttemptAt) {
    const attemptNumber = attemptsForTrigger.length + 1;
    const message = generateFollowUpMessage(context, rule, attemptNumber);
    
    return {
      shouldTrigger: true,
      trigger,
      rule,
      message,
      nextAttemptAt
    };
  }
  
  return {
    shouldTrigger: false,
    nextAttemptAt
  };
}

// Funções auxiliares de Follow-up
function detectFollowUpTrigger(context: FollowUpContext): FollowUpTrigger | null {
  const { inactivityMinutes, conversationState, previousAttempts } = context;
  
  // Detectar inatividade
  if (inactivityMinutes >= 10 && !hasRecentAttempt(previousAttempts, 'inactivity', 60)) {
    return 'inactivity';
  }
  
  // Detectar pós-handoff
  if (conversationState.readyForHandoff && conversationState.needsHumanAttention) {
    const lastHandoffAttempt = previousAttempts.find(a => a.trigger === 'post_handoff');
    if (!lastHandoffAttempt || (Date.now() - lastHandoffAttempt.sentAt.getTime()) > 2 * 60 * 60 * 1000) {
      return 'post_handoff';
    }
  }
  
  // Detectar consulta proposta
  if (conversationState.commercialStatus === 'consultation_proposed') {
    return 'consultation_proposed';
  }
  
  // Detectar follow-up necessário
  if (conversationState.commercialStatus === 'follow_up_needed') {
    return 'follow_up_needed';
  }
  
  return null;
}

function hasRecentAttempt(attempts: FollowUpAttempt[], trigger: FollowUpTrigger, minutesAgo: number): boolean {
  const cutoff = Date.now() - (minutesAgo * 60 * 1000);
  return attempts.some(a => 
    a.trigger === trigger && 
    a.sentAt.getTime() > cutoff
  );
}

function getFollowUpRule(trigger: FollowUpTrigger, temperature: LeadTemperature, commercialStatus?: string): FollowUpRule | null {
  // Regras de follow-up baseadas em temperatura e status
  const followUpRules: FollowUpRule[] = [
    // HOT LEADS - Prioridade imediata
    {
      id: 'hot_inactivity_10min',
      trigger: 'inactivity',
      temperature: 'hot',
      cadence: { minutes: 10, hours: 0, days: 0 },
      maxAttempts: 3,
      priority: 'immediate'
    },
    {
      id: 'hot_post_handoff_2h',
      trigger: 'post_handoff',
      temperature: 'hot',
      cadence: { minutes: 0, hours: 2, days: 0 },
      maxAttempts: 2,
      priority: 'high'
    },
    
    // WARM LEADS - Cadência padrão
    {
      id: 'warm_inactivity_2h',
      trigger: 'inactivity',
      temperature: 'warm',
      cadence: { minutes: 0, hours: 2, days: 0 },
      maxAttempts: 3,
      priority: 'high'
    },
    {
      id: 'warm_consultation_24h',
      trigger: 'consultation_proposed',
      temperature: 'warm',
      cadence: { minutes: 0, hours: 0, days: 1 },
      maxAttempts: 2,
      priority: 'medium'
    },
    
    // COLD LEADS - Cadência mais espaçada
    {
      id: 'cold_inactivity_24h',
      trigger: 'inactivity',
      temperature: 'cold',
      cadence: { minutes: 0, hours: 0, days: 1 },
      maxAttempts: 2,
      priority: 'medium'
    },
    {
      id: 'cold_followup_3d',
      trigger: 'follow_up_needed',
      temperature: 'cold',
      cadence: { minutes: 0, hours: 0, days: 3 },
      maxAttempts: 1,
      priority: 'low'
    }
  ];

  return followUpRules.find(rule => 
    rule.trigger === trigger && 
    rule.temperature === temperature &&
    (!rule.commercialStatus || rule.commercialStatus === commercialStatus)
  ) || null;
}

function generateFollowUpMessage(context: FollowUpContext, rule: FollowUpRule, attemptNumber: number): string {
  const { conversationState } = context;
  const { leadTemperature: temperature, collectedData } = conversationState;
  
  // Mensagens baseadas no trigger
  const triggerMessages = {
    'inactivity': generateInactivityFollowUp(temperature, attemptNumber, collectedData),
    'post_handoff': generatePostHandoffFollowUp(temperature, attemptNumber, collectedData),
    'consultation_proposed': generateConsultationFollowUp(temperature, attemptNumber, collectedData),
    'follow_up_needed': generateFollowUpNeededMessage(temperature, attemptNumber, collectedData)
  };
  
  return triggerMessages[rule.trigger] || generateDefaultFollowUp(temperature, attemptNumber);
}

function generateInactivityFollowUp(temperature: LeadTemperature, attemptNumber: number, data: CollectedData): string {
  const area = data.area || 'seu caso';
  const problem = data.problema_principal || '';
  
  if (temperature === 'hot') {
    if (attemptNumber === 1) {
      return `Pensei mais sobre ${area === 'geral' ? 'sua situação' : `seu caso de ${area}`}... ${problem ? `Vi que mencionou "${problem.substring(0, 50)}${problem.length > 50 ? '...' : ''}"` : ''}. Alguns detalhes podem mudar completamente o resultado. Posso te ajudar a entender melhor?`;
    } else if (attemptNumber === 2) {
      return `Sobre ${area === 'geral' ? 'nossa conversa' : `seu caso de ${area}`}, sei que o tempo é crucial nestas situações. Muitas vezes agir agora faz toda a diferença. Como está pensando em prosseguir?`;
    }
    return `Estou aqui para ajudar com ${area === 'geral' ? 'sua situação' : `seu caso de ${area}`}. Acha que vale a pena darmos um próximo passo?`;
  }
  
  if (temperature === 'warm') {
    if (attemptNumber === 1) {
      return `Retomando nossa conversa sobre ${area === 'geral' ? 'seu caso' : area}... ${problem ? `lembrei que você mencionou: "${problem.substring(0, 40)}${problem.length > 40 ? '...' : ''}"` : ''}. Já conseguiu pensar mais sobre isso?`;
    } else if (attemptNumber === 2) {
      return `Sobre ${area === 'geral' ? 'nossa conversa anterior' : area}, às vezes uma conversa rápida já ajuda a clarear bastante. Que tal continuarmos?`;
    }
    return `Ainda pensando sobre ${area === 'geral' ? 'seu caso' : area}? Estou aqui se precisar retomar.`;
  }
  
  // COLD
  if (attemptNumber === 1) {
    return `Oi! Vi que conversamos sobre ${area === 'geral' ? 'algumas questões jurídicas' : area} outro dia. ${problem ? `Lembrei que você mencionou algo sobre "${problem.substring(0, 30)}${problem.length > 30 ? '...' : ''}"` : ''}. Como está isso agora?`;
  }
  return `Oi! Espero que esteja tudo bem. Estava pensando em ${area === 'geral' ? 'nossa conversa anterior' : area}. Se ainda tiver dúvidas, estou aqui para ajudar.`;
}

function generatePostHandoffFollowUp(temperature: LeadTemperature, attemptNumber: number, data: CollectedData): string {
  if (attemptNumber === 1) {
    return `Já organizei suas informações para a Dra. Noêmia analisar. ${data.area === 'geral' ? 'Seu caso' : `Seu caso de ${data.area}`} já está na fila de prioridade. Você prefere agendar uma consulta online ou falar primeiro com a equipe por WhatsApp?`;
  }
  return `Sobre ${data.area === 'geral' ? 'seu caso' : `seu caso de ${data.area}`}, a equipe já está ciente. Para agilizar, sugiro agendar uma consulta de 15 minutos para avaliação inicial. Que tal?`;
}

function generateConsultationFollowUp(temperature: LeadTemperature, attemptNumber: number, data: CollectedData): string {
  if (attemptNumber === 1) {
    return `Pensei mais sobre ${data.area === 'geral' ? 'sua situação' : `seu caso de ${data.area}`}. Uma consulta de 15 minutos já pode te dar bastante clareza sobre os próximos passos. Tem alguma preferência de horário para conversarmos?`;
  }
  return `Sobre a consulta que mencionei, sei que tempo é precioso. Posso te mostrar exatamente como seria e o que já poderíamos avançar nestes 15 minutos. Interessa?`;
}

function generateFollowUpNeededMessage(temperature: LeadTemperature, attemptNumber: number, data: CollectedData): string {
  if (attemptNumber === 1) {
    return `Estou organizando os próximos passos para ${data.area === 'geral' ? 'seu caso' : `seu caso de ${data.area}`}. Há algo específico que você gostaria de esclarecer antes de continuarmos?`;
  }
  return `Para darmos continuidade a ${data.area === 'geral' ? 'sua situação' : data.area}, seria útil saber se você já tem algum documento ou informação adicional. Como está isso?`;
}

function generateDefaultFollowUp(temperature: LeadTemperature, attemptNumber: number): string {
  if (attemptNumber === 1) {
    return `Oi! Como está? Estou aqui se precisar de ajuda com alguma questão jurídica.`;
  }
  return `Oi! Espero que esteja tudo bem. Se tiver alguma dúvida jurídica, estou aqui para ajudar.`;
}

type ConversationStep =
  | "acolhimento"           // Boas-vindas e quebra-gelo
  | "identificacao_area"     // Identificar área jurídica
  | "problema_principal"     // Entender o que aconteceu
  | "tempo_momento"          // Quando aconteceu / contexto temporal
  | "documentos_provas"      // Verificar existência de provas
  | "objetivo_cliente"       // O que o cliente quer alcançar
  | "avaliacao_urgencia"     // Classificar nível de urgência
  | "resumo_encaminhamento"; // Resumir e decidir próximo passo

export interface NoemiaCoreInput {
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: NoemiaContext;
  metadata?: Record<string, unknown>;
  profile?: PortalProfile | null;
  conversationState?: ConversationState;
}

interface NoemiaCoreOutput {
  reply: string;
  intent?: string;
  audience: string;
  source: "openai" | "fallback" | "triage";
  actions?: Array<{ type: string; label: string; url?: string }>;
  usedFallback: boolean;
  error?: string | null;
  metadata: {
    responseTime: number;
    detectedTheme?: string;
    channel: NoemiaChannel;
    openaiUsed?: boolean;
    classification?: {
      theme: LegalTheme;
      intent: ClassifiedIntent;
      leadTemperature: LeadTemperature;
    };
    conversationState?: ConversationState;
  };
}

interface CommentProcessingOutput {
  reply: string;
  shouldReplyPrivately: boolean;
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  };
  metadata: {
    responseTime: number;
    channel: string;
    openaiUsed: boolean;
  };
}

function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function calculateLeadScore(state: ConversationState, message: string): {
  temperature: 'cold' | 'warm' | 'hot';
  score: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
  recommendedAction: 'continue_triage' | 'schedule_consultation' | 'human_handoff' | 'send_info';
  readyForHandoff: boolean;
  commercialMomentDetected: boolean;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let score = 0;
  
  // SINAIS FORTES (40+ pontos cada)
  const urgencyInfo = extractUrgencyInfo(message);
  if (urgencyInfo.level === 'alta') {
    score += 50;
    reasoning.push('Urgência alta detectada (+50)');
  }
  
  if (urgencyInfo.hasActiveDamage) {
    score += 40;
    reasoning.push('Prejuízo ativo detectado (+40)');
  }
  
  if (state.collectedData.tem_documentos) {
    score += 30;
    reasoning.push('Já possui documentos (+30)');
  }
  
  if (state.collectedData.objetivo_cliente && state.collectedData.objetivo_cliente.length > 20) {
    score += 35;
    reasoning.push('Objetivo claro e bem definido (+35)');
  }
  
  // SINAIS MÉDIOS (20+ pontos cada)
  if (urgencyInfo.level === 'media') {
    score += 25;
    reasoning.push('Urgência média detectada (+25)');
  }
  
  if (state.collectedData.problema_principal && state.collectedData.problema_principal.length > 30) {
    score += 20;
    reasoning.push('Problema bem detalhado (+20)');
  }
  
  if (state.collectedData.area && state.collectedData.area !== 'geral') {
    score += 25;
    reasoning.push('Área jurídica identificada (+25)');
  }
  
  // SINAIS FRACOS (10+ pontos cada)
  const messageLength = message.length;
  if (messageLength > 100) {
    score += 15;
    reasoning.push('Mensagem detalhada (+15)');
  }
  
  if (state.collectedData.timeframe) {
    score += 10;
    reasoning.push('Contexto temporal fornecido (+10)');
  }
  
  // DETECTAR INTENÇÃO DE AÇÃO
  const actionKeywords = ['quero', 'preciso', 'gostaria', 'precisava', 'queria', 'posso', 'consigo'];
  if (actionKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    score += 20;
    reasoning.push('Intenção de ação clara (+20)');
  }
  
  // BÔNUS POR COMPLETUDE
  const completeness = state.triageCompleteness || 0;
  if (completeness > 70) {
    score += 25;
    reasoning.push('Alta completude da triagem (+25)');
  }
  
  // LIMITAR SCORE EM 0-100
  score = Math.min(100, Math.max(0, score));
  
  // CLASSIFICAR TEMPERATURA
  let temperature: 'cold' | 'warm' | 'hot' = 'cold';
  let priorityLevel: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  let recommendedAction: 'continue_triage' | 'schedule_consultation' | 'human_handoff' | 'send_info' = 'continue_triage';
  let readyForHandoff = false;
  let commercialMomentDetected = false;
  
  if (score >= 70) {
    temperature = 'hot';
    priorityLevel = 'urgent';
    recommendedAction = 'schedule_consultation';
    readyForHandoff = true;
    commercialMomentDetected = true;
    reasoning.push(' LEAD QUENTE - Pronto para conversão');
  } else if (score >= 45) {
    temperature = 'warm';
    priorityLevel = 'high';
    recommendedAction = 'continue_triage';
    commercialMomentDetected = true;
    reasoning.push(' LEAD Morno - Potencial comercial');
  } else if (score >= 25) {
    temperature = 'warm';
    priorityLevel = 'medium';
    recommendedAction = 'continue_triage';
    reasoning.push(' LEAD Morno - Requer qualificação');
  } else {
    temperature = 'cold';
    priorityLevel = 'low';
    recommendedAction = 'continue_triage';
    reasoning.push(' LEAD Frio - Curiosidade inicial');
  }
  
  return {
    temperature,
    score,
    priorityLevel,
    recommendedAction,
    readyForHandoff,
    commercialMomentDetected,
    reasoning
  };
}

export interface CollectedData {
  // Bloco A - Tema Principal
  area?: LegalTheme;
  
  // Bloco B - Problema Principal
  problema_principal?: string;
  
  // Bloco C - Tempo e Momento
  timeframe?: string;
  acontecendo_agora?: boolean;
  
  // Bloco D - Documentos e Provas
  tem_documentos?: boolean;
  tipos_documentos?: string[];
  
  // Bloco E - Objetivo do Cliente
  objetivo_cliente?: string;
  
  // Bloco F - Urgência e Prejuízo
  nivel_urgencia?: 'baixa' | 'media' | 'alta';
  prejuizo_ativo?: boolean;
  
  // Bloco G - Detalhes Adicionais
  detalhes?: string[];
  palavras_chave?: string[];
}

export interface ConversationState {
  currentStep: ConversationStep;
  collectedData: CollectedData;
  isHotLead: boolean;
  needsHumanAttention: boolean;
  triageCompleteness: number;
  leadTemperature: LeadTemperature;
  conversionScore: number;
  priorityLevel: PriorityLevel;
  recommendedAction: RecommendedAction;
  readyForHandoff: boolean;
  commercialMomentDetected: boolean;
  sessionId: string;
  handoffReason?: string;
  conversationStatus?:
    | "ai_active"
    | "triage_in_progress"
    | "explanation_in_progress"
    | "consultation_offer"
    | "scheduling_in_progress"
    | "scheduling_preference_captured"
    | "consultation_ready"
    | "lawyer_notified"
    | "handed_off_to_lawyer"
    | "human_followup_pending"
    | "closed"
    | "archived";
  triageStage?:
    | "not_started"
    | "collecting_context"
    | "area_identified"
    | "details_in_progress"
    | "urgency_assessed"
    | "completed";
  explanationStage?:
    | "not_started"
    | "understanding_case"
    | "clarifying_questions"
    | "guidance_shared"
    | "consultation_positioned";
  consultationStage?:
    | "not_offered"
    | "offered"
    | "interest_detected"
    | "collecting_availability"
    | "availability_collected"
    | "ready_for_lawyer"
    | "scheduled_pending_confirmation"
    | "forwarded_to_lawyer";
  lawyerNotificationGenerated?: boolean;
  lawyerNotificationState?: "not_notified" | "ready_to_notify" | "notified";
  // Handoff e Agendamento
  contactPreferences?: {
    channel: 'whatsapp' | 'ligacao' | 'consulta_online' | 'email';
    period: 'manha' | 'tarde' | 'noite' | 'qualquer_horario';
    urgency: 'hoje' | 'esta_semana' | 'proxima_semana' | 'sem_urgencia';
    availability: string;
  };
  commercialStatus?: 'new_lead' | 'triage_in_progress' | 'qualified' | 'awaiting_human_contact' | 'human_contact_started' | 'consultation_proposed' | 'consultation_scheduled' | 'follow_up_needed' | 'converted' | 'lost';
  aiActiveOnChannel?: boolean;
  operationalHandoffRecorded?: boolean;
  humanFollowUpPending?: boolean;
  followUpReady?: boolean;
  handoffReasonCode?: string;
  handoffPackage?: any;
}

function extractKeywords(message: string): string[] {
  const keywords = message.toLowerCase().match(/\b(aposentadoria|inss|benefício|banco|empréstimo|divórcio|pensão|guarda|contrato|demissão|trabalhista)\b/g) || [];
  return [...new Set(keywords)];
}

function extractTimeInfo(message: string): { timeframe: string; isHappeningNow: boolean } {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('agora') || lowerMessage.includes('hoje') || lowerMessage.includes('está acontecendo')) {
    return { timeframe: 'agora', isHappeningNow: true };
  }
  
  if (lowerMessage.includes('ontem') || lowerMessage.includes('semana passada')) {
    return { timeframe: 'recentemente', isHappeningNow: false };
  }
  
  if (lowerMessage.includes('mês') || lowerMessage.includes('meses')) {
    return { timeframe: 'alguns meses', isHappeningNow: false };
  }
  
  if (lowerMessage.includes('ano') || lowerMessage.includes('anos')) {
    return { timeframe: 'muito tempo', isHappeningNow: false };
  }
  
  return { timeframe: 'não especificado', isHappeningNow: false };
}

function extractDocumentInfo(message: string): { hasDocuments: boolean; documentTypes: string[] } {
  const lowerMessage = message.toLowerCase();
  const documentTypes: string[] = [];
  
  if (lowerMessage.includes('contrato')) documentTypes.push('contrato');
  if (lowerMessage.includes('extrato') || lowerMessage.includes('demonstrativo')) documentTypes.push('extrato');
  if (lowerMessage.includes('holerite') || lowerMessage.includes('contracheque')) documentTypes.push('holerite');
  if (lowerMessage.includes('print') || lowerMessage.includes('printscreen')) documentTypes.push('prints');
  if (lowerMessage.includes('notificação') || lowerMessage.includes('carta')) documentTypes.push('notificação');
  if (lowerMessage.includes('decisão') || lowerMessage.includes('sentença')) documentTypes.push('decisão judicial');
  
  const hasDocuments = lowerMessage.includes('sim') || lowerMessage.includes('tenho') || lowerMessage.includes('já') || documentTypes.length > 0;
  
  return { hasDocuments, documentTypes };
}

function extractUrgencyInfo(message: string): { level: 'baixa' | 'media' | 'alta'; hasActiveDamage: boolean } {
  const lowerMessage = message.toLowerCase();
  
  const highUrgency = ['urgente', 'imediato', 'perdi', 'estou sem', 'bloqueou', 'parou', 'suspenderam', 'corte'];
  const mediumUrgency = ['preciso', 'quero', 'prejudicado', 'problema', 'difuldade'];
  const damageIndicators = ['perdendo dinheiro', 'prejuízo', 'prejuizo', 'multa', 'juros', 'corte'];
  
  const hasActiveDamage = damageIndicators.some(indicator => lowerMessage.includes(indicator));
  
  if (highUrgency.some(word => lowerMessage.includes(word)) || hasActiveDamage) {
    return { level: 'alta', hasActiveDamage };
  }
  
  if (mediumUrgency.some(word => lowerMessage.includes(word))) {
    return { level: 'media', hasActiveDamage };
  }
  
  return { level: 'baixa', hasActiveDamage };
}

function extractContactPreferences(message: string): {
  channel: 'whatsapp' | 'ligacao' | 'consulta_online' | 'email' | null;
  period: 'manha' | 'tarde' | 'noite' | 'qualquer_horario' | null;
  urgency: 'hoje' | 'esta_semana' | 'proxima_semana' | 'sem_urgencia' | null;
  availability: string;
} {
  const lowerMessage = message.toLowerCase();
  
  // Canal de contato
  let channel: 'whatsapp' | 'ligacao' | 'consulta_online' | 'email' | null = null;
  if (lowerMessage.includes('whatsapp') || lowerMessage.includes('zap')) channel = 'whatsapp';
  else if (lowerMessage.includes('ligação') || lowerMessage.includes('ligar') || lowerMessage.includes('telefone')) channel = 'ligacao';
  else if (lowerMessage.includes('consulta online') || lowerMessage.includes('online') || lowerMessage.includes('video')) channel = 'consulta_online';
  else if (lowerMessage.includes('email') || lowerMessage.includes('e-mail')) channel = 'email';
  
  // Período do dia
  let period: 'manha' | 'tarde' | 'noite' | 'qualquer_horario' | null = null;
  if (lowerMessage.includes('manhã') || lowerMessage.includes('manha')) period = 'manha';
  else if (lowerMessage.includes('tarde')) period = 'tarde';
  else if (lowerMessage.includes('noite')) period = 'noite';
  else if (lowerMessage.includes('qualquer horário') || lowerMessage.includes('qualquer hora') || lowerMessage.includes('flexível')) period = 'qualquer_horario';
  
  // Urgência
  let urgency: 'hoje' | 'esta_semana' | 'proxima_semana' | 'sem_urgencia' | null = null;
  if (lowerMessage.includes('hoje') || lowerMessage.includes('agora')) urgency = 'hoje';
  else if (lowerMessage.includes('esta semana') || lowerMessage.includes('semana')) urgency = 'esta_semana';
  else if (lowerMessage.includes('próxima semana') || lowerMessage.includes('proxima semana')) urgency = 'proxima_semana';
  else if (lowerMessage.includes('sem urgência') || lowerMessage.includes('sem pressa') || lowerMessage.includes('quando puder')) urgency = 'sem_urgencia';
  
  // Disponibilidade textual
  let availability = '';
  if (channel || period || urgency) {
    const parts = [];
    if (channel) parts.push(`Canal: ${channel}`);
    if (period) parts.push(`Período: ${period}`);
    if (urgency) parts.push(`Urgência: ${urgency}`);
    availability = parts.join(' | ');
  }
  
  return { channel, period, urgency, availability };
}

function calculateTriageCompleteness(data: ConversationState['collectedData']): number {
  const fields = [
    data.area,
    data.problema_principal,
    data.timeframe,
    data.tem_documentos !== undefined,
    data.objetivo_cliente,
    data.nivel_urgencia
  ];
  
  const completedFields = fields.filter(field => field !== undefined && field !== null).length;
  return Math.round((completedFields / fields.length) * 100);
}

function derivePolicyConversationTriageStage(
  state: ConversationState
): NonNullable<ConversationState["triageStage"]> {
  if (state.triageCompleteness >= 80) {
    return "completed";
  }

  if (state.collectedData.nivel_urgencia) {
    return "urgency_assessed";
  }

  if (
    state.collectedData.problema_principal ||
    state.collectedData.timeframe ||
    state.collectedData.tem_documentos !== undefined
  ) {
    return "details_in_progress";
  }

  if (state.collectedData.area) {
    return "area_identified";
  }

  return "collecting_context";
}

function deriveExplanationStage(
  state: ConversationState
): NonNullable<ConversationState["explanationStage"]> {
  if (state.consultationStage && state.consultationStage !== "not_offered") {
    return "consultation_positioned";
  }

  if (state.triageCompleteness >= 60) {
    return "guidance_shared";
  }

  if (state.collectedData.problema_principal) {
    return "clarifying_questions";
  }

  if (state.collectedData.area) {
    return "understanding_case";
  }

  return "not_started";
}

function derivePolicyConsultationStage(
  state: ConversationState,
  consultationIntentDetected: boolean
): NonNullable<ConversationState["consultationStage"]> {
  const hasAvailability =
    Boolean(state.contactPreferences?.availability) ||
    Boolean(state.contactPreferences?.period) ||
    Boolean(state.contactPreferences?.urgency);

  if (state.commercialStatus === 'consultation_scheduled') {
    return 'scheduled_pending_confirmation';
  }

  if (state.triageCompleteness >= 70 && hasAvailability) {
    return 'ready_for_lawyer';
  }

  if (hasAvailability) {
    return 'availability_collected';
  }

  if (consultationIntentDetected) {
    return state.triageCompleteness >= 55 ? 'collecting_availability' : 'interest_detected';
  }

  if (state.commercialMomentDetected || state.recommendedAction === 'schedule_consultation') {
    return 'offered';
  }

  return 'not_offered';
}

function evaluatePolicyHandoff(
  state: ConversationState,
  normalizedMessage: string
): { needsAttention: boolean; readyForHandoff: boolean; reason: string } {
  const severeOperationalException =
    (state.collectedData.nivel_urgencia === 'alta' &&
      state.collectedData.prejuizo_ativo === true &&
      (normalizedMessage.includes('agora') ||
        normalizedMessage.includes('urgente') ||
        normalizedMessage.includes('imediato'))) ||
    normalizedMessage.includes('prisao') ||
    normalizedMessage.includes('prisão') ||
    normalizedMessage.includes('violencia') ||
    normalizedMessage.includes('violência') ||
    normalizedMessage.includes('medida protetiva');

  if (severeOperationalException) {
    return {
      needsAttention: true,
      readyForHandoff: true,
      reason: 'Excecao_operacional_com_urgencia_real'
    };
  }

  if (
    state.consultationStage === 'ready_for_lawyer' ||
    state.consultationStage === 'scheduled_pending_confirmation'
  ) {
    return {
      needsAttention: true,
      readyForHandoff: true,
      reason: 'Consulta_pronta_para_advogada'
    };
  }

  return {
    needsAttention: false,
    readyForHandoff: false,
    reason: ''
  };
}

function evaluateHandoff(state: ConversationState): { needsAttention: boolean; reason: string } {
  // Critérios para handoff humano
  if (state.isHotLead) {
    return { needsAttention: true, reason: 'Lead quente detectado - atenção prioritária' };
  }
  
  if (state.collectedData.nivel_urgencia === 'alta') {
    return { needsAttention: true, reason: 'Alta urgência identificada' };
  }
  
  if (state.collectedData.prejuizo_ativo) {
    return { needsAttention: true, reason: 'Prejuízo ativo em andamento' };
  }
  
  if (state.triageCompleteness >= 80) {
    return { needsAttention: true, reason: 'Triagem completa - pronto para análise humana' };
  }
  
  if (state.collectedData.area === 'previdenciario' && state.collectedData.tem_documentos) {
    return { needsAttention: true, reason: 'Caso previdenciário com documentos - análise recomendada' };
  }
  
  return { needsAttention: false, reason: 'Continuar triagem automatizada' };
}

function shouldAdvanceToNextStage(state: ConversationState): boolean {
  // Critérios para avançar para próximo estágio
  if (state.commercialMomentDetected && state.conversionScore >= 70) return true;
  if (state.triageCompleteness >= 80) return true;
  if (state.readyForHandoff) return true;
  if (state.recommendedAction === 'schedule_consultation' || state.recommendedAction === 'human_handoff') return true;
  
  return false;
}

// Handoff Package - Pacote completo para equipe humana
function generateHandoffPackage(state: ConversationState, lastMessage: string): {
  sessionId: string;
  areaOfLaw: string;
  issueSummary: string;
  urgencyLevel: string;
  hasDocuments: boolean;
  clientGoal: string;
  triageCompleteness: number;
  leadTemperature: string;
  conversionScore: number;
  priorityLevel: string;
  recommendedAction: string;
  handoffReason: string;
  lastUserMessage: string;
  internalSummary: string;
  commercialStatus: string;
  timestamp: string;
} {
  const data = state.collectedData;
  
  return {
    sessionId: state.sessionId || 'unknown',
    areaOfLaw: data.area || 'não identificada',
    issueSummary: data.problema_principal || 'não informado',
    urgencyLevel: data.nivel_urgencia || 'baixa',
    hasDocuments: data.tem_documentos || false,
    clientGoal: data.objetivo_cliente || 'não informado',
    triageCompleteness: state.triageCompleteness,
    leadTemperature: state.leadTemperature,
    conversionScore: state.conversionScore,
    priorityLevel: state.priorityLevel,
    recommendedAction: state.recommendedAction,
    handoffReason: state.handoffReason || 'Pronto para análise humana',
    lastUserMessage: lastMessage,
    internalSummary: generateManagedInternalSummary(state),
    commercialStatus: determineCommercialStatus(state),
    timestamp: new Date().toISOString()
  };
}

function determineCommercialStatus(state: ConversationState): string {
  if (state.consultationStage === 'scheduled_pending_confirmation') {
    return 'consultation_scheduled';
  }
  if (state.consultationStage === 'ready_for_lawyer' || state.readyForHandoff) {
    return 'qualified';
  }
  if (
    state.consultationStage === 'availability_collected' ||
    state.consultationStage === 'collecting_availability' ||
    state.consultationStage === 'interest_detected' ||
    state.consultationStage === 'offered' ||
    state.commercialMomentDetected
  ) {
    return 'consultation_proposed';
  }
  return 'triage_in_progress';
}

function determineConversationStatus(
  state: ConversationState
): NonNullable<ConversationState["conversationStatus"]> {
  if (state.operationalHandoffRecorded && state.consultationStage === 'scheduled_pending_confirmation') {
    return 'handed_off_to_lawyer';
  }

  if (state.operationalHandoffRecorded || state.lawyerNotificationGenerated) {
    return 'lawyer_notified';
  }

  if (state.consultationStage === 'ready_for_lawyer') {
    return 'consultation_ready';
  }

  if (state.consultationStage === 'availability_collected') {
    return 'scheduling_preference_captured';
  }

  if (
    state.consultationStage === 'collecting_availability'
  ) {
    return 'scheduling_in_progress';
  }

  if (
    state.consultationStage === 'interest_detected' ||
    state.consultationStage === 'offered'
  ) {
    return 'consultation_offer';
  }

  if (
    state.explanationStage === 'guidance_shared' ||
    state.explanationStage === 'consultation_positioned'
  ) {
    return 'explanation_in_progress';
  }

  if (state.triageStage === 'not_started') {
    return 'ai_active';
  }

  return 'triage_in_progress';
}

function generateHandoffMessage(state: ConversationState, handoffType: 'hot_lead' | 'urgent' | 'warm_ready' | 'individual_analysis'): string {
  const data = state.collectedData;
  
  switch (handoffType) {
    case 'hot_lead':
      return `Entendi perfeitamente sua situação. Pelo que você me descreveu, seu caso realmente precisa de atenção especializada e rápida.\n\nVou organizar todo o contexto que você compartilhou e encaminhar para a equipe da Dra. Noêmia com prioridade máxima. Eles já receberão todas as informações importantes para começar a analisar seu caso.\n\nO que poucos entendem é que cada dia de espera pode impactar diretamente seu resultado. A equipe entrará em contato em até 2 horas úteis.\n\nEnquanto isso, se houver algum agravamento da situação, me avise imediatamente.`;
      
    case 'urgent':
      return `Compreendo completamente a urgência e complexidade do seu caso. Situações como a sua exigem análise humana especializada imediata.\n\nVou encaminhar seu caso diretamente para a equipe da Dra. Noêmia com prioridade máxima e sinalização de urgência. Você receberá contato em até 1 hora útil.\n\nJá organizei todas as informações que você forneceu para que a equipe possa começar a trabalhar no seu caso assim que receber o encaminhamento.\n\nSe algo mudar ou piorar, me avise imediatamente.`;
      
    case 'warm_ready':
      return `Excelente! Já estou entendendo bem seu cenário. Vejo que seu caso tem potencial e merece uma análise cuidadosa por parte da equipe especializada.\n\nVou preparar um resumo completo com todos os detalhes que você compartilhou e encaminhar para a Dra. Noêmia avaliar suas possibilidades reais.\n\nA equipe geralmente entra em contato em até 24 horas úteis para agendar uma conversa individual. Cada caso tem particularidades que só uma análise detalhada pode revelar.\n\nPosso já anotar alguma preferência de contato (WhatsApp, ligação) ou período (manhã, tarde, noite)?`;
      
    case 'individual_analysis':
      return `Perfeito! Já consigo ver que há uma situação real que precisa ser entendida melhor por um profissional especializado.\n\nVou organizar todo o contexto que você compartilhou e encaminhar para a equipe da Dra. Noêmia fazer uma análise individual do seu caso.\n\nMuitas vezes o que parece complicado no início se torna mais claro com uma análise profissional. A Dra. Noêmia é especialista em identificar oportunidades que poucos percebem.\n\nA equipe entrará em contato em até 48 horas úteis para explorar suas possibilidades. Há alguma preferência de período para recebermos o contato?`;
      
    default:
      return `Obrigada por compartilhar esses detalhes. Vou organizar sua informação e encaminhar para a equipe especializada analisar seu caso com atenção.`;
  }
}

function generateConversionMessage(state: ConversationState): string {
  const score = state.conversionScore;
  const temperature = state.leadTemperature;
  const action = state.recommendedAction;
  
  // 🚀 MENSAGENS PREMIUM DE CONVERSÃO
  if (temperature === 'hot' && score >= 70) {
    // LEAD QUENTE - acelerar consulta sem desligar a conversa
    if (action === 'schedule_consultation') {
      return `Entendi perfeitamente sua situação. Pelo que você me descreveu, seu caso realmente pede uma análise especializada e cuidadosa.\n\nO próximo passo ideal é organizarmos sua consulta com a Dra. Noêmia, porque aí conseguimos olhar o caso com profundidade e te orientar com segurança.\n\nPara eu deixar isso pronto sem perder o ritmo da conversa, qual dia ou turno costuma funcionar melhor para você?`;
    }
    if (action === 'human_handoff') {
      return `Compreendo completamente a urgência e a sensibilidade do seu caso. Vou priorizar isso operacionalmente para a equipe da Dra. Noêmia, sem perder o contexto da nossa conversa.\n\nEnquanto organizo esse encaminhamento interno, sigo com você por aqui para confirmar os pontos mais importantes. Qual dia, turno ou faixa de horário tende a funcionar melhor para o seu atendimento?`;
    }
  }
  
  if (temperature === 'warm' && score >= 45) {
    // LEAD MORNO - Condução qualificada
    return `Excelente! Já estou entendendo bem seu cenário. Vejo que seu caso merece uma análise cuidadosa.\n\nPara te orientar com precisão, o melhor caminho é avançarmos para a consulta individual. Cada caso tem detalhes que só uma análise mais profunda revela.\n\nSe fizer sentido para você, posso já organizar isso agora. Qual dia ou horário costuma ser melhor?`;
  }
  
  if (temperature === 'cold' && score >= 25) {
    // LEAD FRIO COM POTENCIAL - Nutrir
    return `Perfeito! Já consigo ver que há uma situação real que precisa ser entendida melhor.\n\nMuitas vezes o que parece complicado no início se torna mais claro com uma análise profissional. A Dra. Noêmia é especialista em identificar oportunidades que poucos percebem.\n\nQue tal agendarmos uma conversa inicial para explorar suas possibilidades? Sem compromisso, apenas para entender melhor seu caso.`;
  }

  // PADRÃO - Continuar qualificação
  return `Obrigada por compartilhar esses detalhes. Cada informação me ajuda a entender melhor seu cenário.\n\nPara te dar a orientação mais adequada, preciso entender alguns pontos específicos da sua situação. Podemos continuar?`;
}

async function callOpenAI(
  message: string,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5.4";

    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY não configurada" };
    }

    const openai = new OpenAI({ apiKey });

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemPrompt }];

    for (const item of history.slice(-8)) {
      messages.push({
        role: item.role,
        content: item.content,
      });
    }

    messages.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const responseText = response.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return { success: false, error: "Resposta vazia da OpenAI" };
    }

    return { success: true, response: responseText };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

export async function processNoemiaCore(
  input: NoemiaCoreInput
): Promise<NoemiaCoreOutput> {
  const startTime = Date.now();

  const classification = classifyIncomingMessage(input.message);
  const currentConversationState =
    input.conversationState || initializeManagedConversationState();
  const newConversationState = updateManagedConversationState(
    currentConversationState,
    input.message,
    classification,
    evaluateManagedPolicyHandoff
  );

  console.log(
    `NOEMIA_CORE_START: ${input.channel} | ${input.userType} | ${classification.theme} | ${classification.intent} | ${classification.leadTemperature}`
  );
  console.log(
    `NOEMIA_CORE_STEP: ${currentConversationState.currentStep} -> ${newConversationState.currentStep}`
  );
  console.log(
    `NOEMIA_CORE_MESSAGE: ${input.message.substring(0, 100)}...`
  );

  try {
    // Fase 4.2 - Buscar contexto do cliente
    let clientContext = null;
    let enrichedContext = input.context;

    if (input.channel === 'whatsapp' || input.channel === 'instagram') {
      try {
        // Tentar obter clientId do metadata ou context
        const clientId = (input.metadata?.clientId as string) || 
                        (input.context as any)?.clientId ||
                        (input.conversationState as any)?.clientId;

        const sessionId = (input.metadata?.sessionId as string) ||
                        (input.context as any)?.sessionId;

        clientContext = await clientContextService.getClientContextForAI({
          clientId,
          sessionId,
          channel: input.channel
        });

        if (clientContext) {
          console.log('AI_CONTEXT_ENRICHED', {
            clientId: clientContext.client.id,
            isClient: clientContext.client.is_client,
            pipelineStage: clientContext.pipeline?.stage,
            leadTemperature: clientContext.pipeline?.lead_temperature
          });

          // Formatar contexto para a IA
          const formattedContext = clientContextService.formatContextForAI(clientContext);
          
          // Enriquecer o contexto existente
            enrichedContext = {
             ...(input.context ? (input.context as Record<string, unknown>) : {}),
              clientContext: formattedContext
               } as any;
        }
      } catch (contextError) {
        console.error('CLIENT_CONTEXT_ENRICHMENT_ERROR', contextError);
        // Continuar sem contexto enriquecido
      }
    }

    const intent = detectConversationIntent(input.message);
    const detectedTheme = detectConversationTheme(input.message);

    let effectiveAudience: NoemiaUserType = input.userType;

    if (input.userType === "client" && !input.profile) {
      effectiveAudience = "visitor";
    }

    if (input.userType === "staff" && (!input.profile || input.profile.role === "cliente")) {
      effectiveAudience = "visitor";
    }

    // Ajustar audience baseado no contexto do cliente
    if (clientContext && clientContext.client.is_client) {
      effectiveAudience = "client";
    }

    const systemPrompt = buildNoemiaSystemPrompt(
      input.channel,
      effectiveAudience,
      enrichedContext
    );

    console.log(
      `NOEMIA_CORE_OPENAI_ATTEMPT: ${input.channel} | ${effectiveAudience}`
    );

    const openaiResult = await callOpenAI(
      input.message,
      systemPrompt,
      input.history ?? []
    );

    if (openaiResult.success && openaiResult.response) {
      console.log(`NOEMIA_CORE_OPENAI_SUCCESS: ${input.channel}`);

      // Fase 4.5 - Atualizar pipeline automaticamente após interação
      if (clientContext && (input.channel === 'whatsapp' || input.channel === 'instagram')) {
        try {
          await clientContextService.updatePipelineFromInteraction(
            clientContext.client.id,
            {
              messageText: input.message,
              currentIntent: intent,
              caseArea: detectedTheme || undefined,
              leadTemperature: classification.leadTemperature
            }
          );
        } catch (pipelineError) {
          console.error('PIPELINE_AUTO_UPDATE_ERROR', pipelineError);
          // Não quebrar o fluxo se a atualização do pipeline falhar
        }
      }

      // Fase 4.6 - Salvar dados da triagem se houver estado de conversação
      if (newConversationState && input.channel !== 'portal') {
        try {
          await saveTriageData(input, newConversationState, classification);
        } catch (triageError) {
          console.error('TRIAGE_SAVE_ERROR', triageError);
          // Não quebrar o fluxo se o salvamento da triagem falhar
        }
      }

      return {
        reply: openaiResult.response,
        intent,
        audience: effectiveAudience,
        source: "openai",
        usedFallback: false,
        error: null,
        metadata: {
          responseTime: Date.now() - startTime,
          detectedTheme: detectedTheme || undefined,
          channel: input.channel,
          openaiUsed: true,
          classification,
          conversationState: newConversationState,
        },
      };
    }

    console.log(
      `NOEMIA_CORE_FALLBACK: ${input.channel} | ${openaiResult.error}`
    );

    const fallbackReply =
      effectiveAudience === "visitor"
        ? generateManagedTriageResponse(newConversationState, classification, input.message, {
            getSaudacao,
            detectLegalArea,
            detectLeadIntention,
            getLeadProfile,
            detectBuyingIntention,
            generateFastConversionMessage,
            generateClosingMessage,
            shouldFastConversion,
            shouldSkipQuestions,
            getVariationWithoutRepetition,
            adaptMessageForLead,
            addIntelligentEmpathy,
            personalizeMessage,
            adaptMessageTone,
            shouldAdvanceToNextStage: shouldAdvanceManagedStage
          })
        : generateManagedFallbackResponse(
            intent,
            effectiveAudience,
            detectedTheme || undefined,
            {
              getSaudacao,
              detectLegalArea,
              getVariationWithoutRepetition,
              addIntelligentEmpathy,
              personalizeMessage,
              adaptMessageTone
            }
          );

    return {
      reply: fallbackReply,
      intent,
      audience: effectiveAudience,
      source: effectiveAudience === "visitor" ? "triage" : "fallback",
      usedFallback: true,
      error: openaiResult.error || null,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectedTheme || undefined,
        channel: input.channel,
        openaiUsed: false,
        classification,
        conversationState: newConversationState,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.log(`NOEMIA_CORE_ERROR: ${input.channel} | ${errorMessage}`);

    const emergencyResponse =
      "Oi! Me conta com calma o que está acontecendo no seu caso.";

    return {
      reply: emergencyResponse,
      audience: input.userType,
      source: "fallback",
      usedFallback: true,
      error: errorMessage,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectConversationTheme(input.message) || undefined,
        channel: input.channel,
        openaiUsed: false,
        classification,
        conversationState: newConversationState,
      },
    };
  }
}

export async function processComment(
  commentText: string,
  platform: "instagram" | "facebook",
  commentId: string,
  userId: string
): Promise<CommentProcessingOutput> {
  const startTime = Date.now();

  console.log(`NOEMIA_COMMENT_START: ${platform} | ${commentId} | ${userId}`);
  console.log(`NOEMIA_COMMENT_TEXT: ${commentText.substring(0, 100)}...`);

  const classification = classifyIncomingMessage(commentText);

  const shouldReplyPrivately =
    classification.intent === "lead_interest" ||
    classification.leadTemperature === "warm" ||
    classification.leadTemperature === "hot";

  try {
    const systemPrompt = [
      "Você é a assistente virtual do escritório da Dra. Noêmia.",
      "Está respondendo a um comentário em rede social.",
      "",
      "OBJETIVO:",
      "- gerar conexão",
      "- trazer uma percepção útil ou curiosa",
      "- incentivar a pessoa a continuar a conversa no direct",
      "",
      "REGRAS:",
      "- resposta curta, envolvente e natural",
      "- não dê consultoria jurídica em público",
      "- evite frase fria como 'como posso ajudar?'",
      "- no máximo 3 frases curtas",
      "- pode usar emoji com moderação",
      "",
      "ESTRUTURA IDEAL:",
      "1. reconhecer o comentário",
      "2. trazer uma micro-revelação",
      "3. convidar para continuar em privado",
    ].join("\n");

    const openaiResult = await callOpenAI(commentText, systemPrompt);

    if (openaiResult.success && openaiResult.response) {
      console.log(
        `NOEMIA_COMMENT_SUCCESS: ${platform} | ${
          shouldReplyPrivately ? "PRIVATE_REPLY" : "PUBLIC_REPLY"
        }`
      );

      return {
        reply: openaiResult.response,
        shouldReplyPrivately,
        classification,
        metadata: {
          responseTime: Date.now() - startTime,
          channel: `${platform}_comment`,
          openaiUsed: true,
        },
      };
    }

    console.log(`NOEMIA_COMMENT_FALLBACK: ${platform} | ${openaiResult.error}`);

    const fallbackReply = generateCommentFallback(classification);

    return {
      reply: fallbackReply,
      shouldReplyPrivately,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.log(`NOEMIA_COMMENT_ERROR: ${platform} | ${errorMessage}`);

    return {
      reply:
        "Oi! Vi seu comentário 💬 Tem alguns detalhes importantes sobre isso que muita gente não sabe. Me chama no direct que eu te explico melhor.",
      shouldReplyPrivately: true,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false,
      },
    };
  }
}

function generateCommentFallback(classification: {
  theme: LegalTheme;
  intent: ClassifiedIntent;
  leadTemperature: LeadTemperature;
}): string {
  const responses: Record<LegalTheme, string> = {
    previdenciario:
      "Oi! Vi seu comentário 💬 Dependendo da situação, pode existir um caminho que muita gente nem imagina. Me chama no direct que eu te explico melhor.",
    bancario:
      "Oi! Vi seu comentário 💬 Em casos bancários, às vezes existem detalhes importantes que passam despercebidos. Me chama no direct que eu te explico melhor.",
    familia:
      "Oi! Vi seu comentário 💬 Em questões de família, alguns detalhes mudam tudo. Me chama no direct que eu te explico melhor.",
    civil:
      "Oi! Vi seu comentário 💬 Dependendo do que aconteceu, pode existir um caminho importante no seu caso. Me chama no direct que eu te explico melhor.",
    geral:
      "Oi! Vi seu comentário 💬 Tem alguns pontos importantes sobre isso que podem fazer diferença. Me chama no direct que eu te explico melhor.",
  };

  return responses[classification.theme];
}

export async function answerNoemia(
  rawInput: unknown,
  profile: PortalProfile | null,
  sessionId?: string,
  urlContext?: unknown
) {
  // ... (rest of the code remains the same)
  const input = askNoemiaSchema.parse(rawInput) as {
    audience: NoemiaUserType;
    message: string;
  };

  const coreInput: NoemiaCoreInput = {
  channel: "site",
  userType: input.audience,
  message: input.message,
  history: [],
  context: (urlContext as NoemiaContext | undefined),
  metadata: { sessionId, urlContext },
  profile,
};

  const result = await processNoemiaCore(coreInput);

  return {
    audience: result.audience,
    answer: result.reply,
    message: result.reply,
    actions: result.actions || [],
    meta: {
      intent: result.intent,
      profile: result.audience,
      source: result.source,
    },
  };
}
