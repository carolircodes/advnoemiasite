"use strict";
/**
 * NOEMIA CORE - CÉREBRO CENTRALIZADO DA IA
 *
 * Única camada responsável por toda inteligência da NoemIA
 * Usado por: site, portal, WhatsApp, Instagram
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldTriggerFollowUp = shouldTriggerFollowUp;
exports.processNoemiaCore = processNoemiaCore;
exports.processComment = processComment;
exports.answerNoemia = answerNoemia;
const openai_1 = require("openai");
const client_context_1 = require("../services/client-context");
const triage_persistence_1 = require("./triage-persistence");
const portal_1 = require("../domain/portal");
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
const lastUsedMessages = new Map();
function getVariationWithoutRepetition(variations, context) {
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
const LEAD_PROFILES = {
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
function adaptMessageForLead(baseMessage, profile, area) {
    let adaptedMessage = baseMessage;
    // Ajustar comprimento do texto
    if (profile.textLength === 'curto') {
        // Versões curtas para leads prontos
        adaptedMessage = adaptedMessage.replace(/Me conta com calma o que está acontecendo no seu caso\./, "Me conta resumidamente seu caso.");
        adaptedMessage = adaptedMessage.replace(/Quero entender direitinho o que está acontecendo\./, "Entendi rápido. Qual seu caso?");
    }
    else if (profile.textLength === 'longo') {
        // Versões mais explicativas para leads perdidos
        adaptedMessage = adaptedMessage.replace(/\?/, "... não se preocupe se não souber exato, me explique do seu jeito?");
        adaptedMessage = adaptedMessage.replace(/Me conta/, "Por favor, me conte com detalhes");
    }
    // Ajustar empatia baseada no perfil
    if (profile.empathyLevel === 'alta') {
        // Leads perdidos precisam de mais acolhimento
        adaptedMessage = `Entendo que essa situação pode ser confusa. ${adaptedMessage}`;
    }
    else if (profile.empathyLevel === 'baixa') {
        // Leads desconfiados precisam de mais firmeza
        adaptedMessage = adaptedMessage.replace(/Oi!/g, "Olá.");
        adaptedMessage = adaptedMessage.replace(/... /g, ". ");
    }
    return adaptedMessage;
}
function shouldSkipQuestions(profile) {
    return profile.skipQuestions;
}
function shouldFastConversion(profile) {
    return profile.fastConversion;
}
// Funções de detecção de momento de fechamento
function detectClosingMoment(message) {
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
function detectLeadIntention(message) {
    const lowerMessage = message.toLowerCase();
    // Contar palavras-chave por tipo de intenção
    const counts = {
        perdido: 0,
        desconfiado: 0,
        pronto: 0
    };
    // Contar ocorrências
    for (const [intention, keywords] of Object.entries(LEAD_INTENTION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                counts[intention]++;
            }
        }
    }
    // Encontrar intenção com mais palavras-chave
    let maxCount = 0;
    let detectedIntention = 'perdido'; // padrão
    for (const [intention, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            detectedIntention = intention;
        }
    }
    // Se encontrou palavras-chave, retorna a intenção; senão, perdido (padrão)
    return maxCount > 0 ? detectedIntention : 'perdido';
}
function getLeadProfile(intention) {
    return LEAD_PROFILES[intention];
}
// Funções de condução para consulta
function generateSmoothTransition() {
    return SMOOTH_TRANSITIONS[Math.floor(Math.random() * SMOOTH_TRANSITIONS.length)];
}
function generateElegantOffer() {
    return ELEGANT_OFFERS[Math.floor(Math.random() * ELEGANT_OFFERS.length)];
}
function generateNaturalCall() {
    return NATURAL_CALLS[Math.floor(Math.random() * NATURAL_CALLS.length)];
}
function generateObjectionHandler(type) {
    const handlers = OBJECTION_HANDLERS[type];
    return handlers[Math.floor(Math.random() * handlers.length)];
}
function generateClosingMessage(context, message) {
    const closingMoment = detectClosingMoment(message);
    if (!closingMoment.shouldClose) {
        return null;
    }
    const leadProfile = getLeadProfile(context.leadIntention || 'perdido');
    // Construir mensagem de fechamento
    let messageParts = [];
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
function detectBuyingIntention(message) {
    const lowerMessage = message.toLowerCase();
    const hasPriceInquiry = BUYING_INTENTION_INDICATORS.preco.some(indicator => lowerMessage.includes(indicator));
    const hasProcessInquiry = BUYING_INTENTION_INDICATORS.como_funciona.some(indicator => lowerMessage.includes(indicator));
    const hasResolutionIntention = BUYING_INTENTION_INDICATORS.intencao_resolver.some(indicator => lowerMessage.includes(indicator));
    const hasDecisionIntention = BUYING_INTENTION_INDICATORS.decisao_compra.some(indicator => lowerMessage.includes(indicator));
    // Determinar tipo de intenção
    let intentionType;
    if (hasPriceInquiry)
        intentionType = 'preco';
    else if (hasProcessInquiry)
        intentionType = 'como_funciona';
    else if (hasResolutionIntention)
        intentionType = 'intencao_resolver';
    else if (hasDecisionIntention)
        intentionType = 'decisao_compra';
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
function generateFastConversionMessage(intentionType, leadId, userId) {
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
function shouldReduceInvestigation(message) {
    const buyingIntention = detectBuyingIntention(message);
    return buyingIntention.shouldFastConvert;
}
function shouldIncreaseDirection(message) {
    const buyingIntention = detectBuyingIntention(message);
    return buyingIntention.shouldFastConvert;
}
function addIntelligentEmpathy(baseMessage, area, context) {
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
function detectLegalArea(message) {
    const lowerMessage = message.toLowerCase();
    // Contar palavras-chave por área
    const counts = {
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
                counts[area]++;
            }
        }
    }
    // Encontrar área com mais palavras-chave
    let maxCount = 0;
    let detectedArea = 'geral';
    for (const [area, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            detectedArea = area;
        }
    }
    // Se encontrou palavras-chave, retorna a área; senão, geral
    return maxCount > 0 ? detectedArea : 'geral';
}
function extractUserInfo(message) {
    const info = {};
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
function adaptMessageTone(baseMessage, area) {
    const tone = TONE_BY_AREA[area];
    return tone.prefixo + baseMessage + tone.sufixo;
}
function updateConversationContext(context, message, detectedArea) {
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
function personalizeMessage(baseMessage, context) {
    let personalized = baseMessage;
    // Adicionar nome se disponível e for a primeira mensagem
    if (context.userName && context.messageCount <= 2) {
        personalized = personalized.replace('Oi!', `Oi, ${context.userName}!`);
    }
    // Fazer referência ao contexto se disponível
    if (context.problemSummary && context.messageCount > 1) {
        if (context.detectedArea === 'bancario') {
            personalized = personalized.replace('o que aconteceu', 'esse problema com o banco que você mencionou');
        }
        else if (context.detectedArea === 'familia') {
            personalized = personalized.replace('o que aconteceu', 'essa questão de família que você comentou');
        }
        else if (context.detectedArea === 'previdenciario') {
            personalized = personalized.replace('o que aconteceu', 'essa questão previdenciária que você mencionou');
        }
    }
    return personalized;
}
function shouldTriggerFollowUp(conversationState, lastMessageTime, previousAttempts = []) {
    const currentTime = new Date();
    const inactivityMinutes = (currentTime.getTime() - lastMessageTime.getTime()) / (1000 * 60);
    const context = {
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
    let nextAttemptAt;
    if (!lastAttemptForTrigger) {
        // Primeira tentativa - usar cadência da regra
        nextAttemptAt = new Date(lastMessageTime.getTime() +
            (rule.cadence.minutes * 60 * 1000) +
            (rule.cadence.hours * 60 * 60 * 1000) +
            (rule.cadence.days * 24 * 60 * 60 * 1000));
    }
    else {
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
function detectFollowUpTrigger(context) {
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
function hasRecentAttempt(attempts, trigger, minutesAgo) {
    const cutoff = Date.now() - (minutesAgo * 60 * 1000);
    return attempts.some(a => a.trigger === trigger &&
        a.sentAt.getTime() > cutoff);
}
function getFollowUpRule(trigger, temperature, commercialStatus) {
    // Regras de follow-up baseadas em temperatura e status
    const followUpRules = [
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
    return followUpRules.find(rule => rule.trigger === trigger &&
        rule.temperature === temperature &&
        (!rule.commercialStatus || rule.commercialStatus === commercialStatus)) || null;
}
function generateFollowUpMessage(context, rule, attemptNumber) {
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
function generateInactivityFollowUp(temperature, attemptNumber, data) {
    const area = data.area || 'seu caso';
    const problem = data.problema_principal || '';
    if (temperature === 'hot') {
        if (attemptNumber === 1) {
            return `Pensei mais sobre ${area === 'geral' ? 'sua situação' : `seu caso de ${area}`}... ${problem ? `Vi que mencionou "${problem.substring(0, 50)}${problem.length > 50 ? '...' : ''}"` : ''}. Alguns detalhes podem mudar completamente o resultado. Posso te ajudar a entender melhor?`;
        }
        else if (attemptNumber === 2) {
            return `Sobre ${area === 'geral' ? 'nossa conversa' : `seu caso de ${area}`}, sei que o tempo é crucial nestas situações. Muitas vezes agir agora faz toda a diferença. Como está pensando em prosseguir?`;
        }
        return `Estou aqui para ajudar com ${area === 'geral' ? 'sua situação' : `seu caso de ${area}`}. Acha que vale a pena darmos um próximo passo?`;
    }
    if (temperature === 'warm') {
        if (attemptNumber === 1) {
            return `Retomando nossa conversa sobre ${area === 'geral' ? 'seu caso' : area}... ${problem ? `lembrei que você mencionou: "${problem.substring(0, 40)}${problem.length > 40 ? '...' : ''}"` : ''}. Já conseguiu pensar mais sobre isso?`;
        }
        else if (attemptNumber === 2) {
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
function generatePostHandoffFollowUp(temperature, attemptNumber, data) {
    if (attemptNumber === 1) {
        return `Já organizei suas informações para a Dra. Noêmia analisar. ${data.area === 'geral' ? 'Seu caso' : `Seu caso de ${data.area}`} já está na fila de prioridade. Você prefere agendar uma consulta online ou falar primeiro com a equipe por WhatsApp?`;
    }
    return `Sobre ${data.area === 'geral' ? 'seu caso' : `seu caso de ${data.area}`}, a equipe já está ciente. Para agilizar, sugiro agendar uma consulta de 15 minutos para avaliação inicial. Que tal?`;
}
function generateConsultationFollowUp(temperature, attemptNumber, data) {
    if (attemptNumber === 1) {
        return `Pensei mais sobre ${data.area === 'geral' ? 'sua situação' : `seu caso de ${data.area}`}. Uma consulta de 15 minutos já pode te dar bastante clareza sobre os próximos passos. Tem alguma preferência de horário para conversarmos?`;
    }
    return `Sobre a consulta que mencionei, sei que tempo é precioso. Posso te mostrar exatamente como seria e o que já poderíamos avançar nestes 15 minutos. Interessa?`;
}
function generateFollowUpNeededMessage(temperature, attemptNumber, data) {
    if (attemptNumber === 1) {
        return `Estou organizando os próximos passos para ${data.area === 'geral' ? 'seu caso' : `seu caso de ${data.area}`}. Há algo específico que você gostaria de esclarecer antes de continuarmos?`;
    }
    return `Para darmos continuidade a ${data.area === 'geral' ? 'sua situação' : data.area}, seria útil saber se você já tem algum documento ou informação adicional. Como está isso?`;
}
function generateDefaultFollowUp(temperature, attemptNumber) {
    if (attemptNumber === 1) {
        return `Oi! Como está? Estou aqui se precisar de ajuda com alguma questão jurídica.`;
    }
    return `Oi! Espero que esteja tudo bem. Se tiver alguma dúvida jurídica, estou aqui para ajudar.`;
}
function getSaudacao() {
    const hour = new Date().getHours();
    if (hour < 12)
        return "Bom dia";
    if (hour < 18)
        return "Boa tarde";
    return "Boa noite";
}
function detectUserIntent(message) {
    const lowerMessage = message.toLowerCase();
    const legalAdviceKeywords = [
        "o que fazer",
        "como faço",
        "posso fazer",
        "devo fazer",
        "meu caso",
        "minha situação",
        "meu problema",
        "minha dúvida",
        "quais meus direitos",
        "o que a lei diz",
        "é crime",
        "é ilegal",
        "quanto custa",
        "quanto cobra",
        "valor da consulta",
        "consulta grátis",
        "posso me aposentar",
        "banco cobrou",
        "não paga pensão",
        "demissão injusta",
        "herança",
        "divórcio",
        "trabalhista",
        "previdenciário",
        "bancário",
    ];
    if (legalAdviceKeywords.some((keyword) => lowerMessage.includes(keyword))) {
        return "legal_advice_request";
    }
    if (lowerMessage.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|eai|opa)/)) {
        return "greeting";
    }
    if (lowerMessage.includes("agenda") ||
        lowerMessage.includes("consulta") ||
        lowerMessage.includes("compromisso")) {
        return "agenda_request";
    }
    if (lowerMessage.includes("processo") ||
        lowerMessage.includes("caso") ||
        lowerMessage.includes("andamento")) {
        return "case_request";
    }
    if (lowerMessage.includes("documento") ||
        lowerMessage.includes("arquivo") ||
        lowerMessage.includes("enviar")) {
        return "document_request";
    }
    return "general_inquiry";
}
function detectLegalTheme(message) {
    const lowerMessage = message.toLowerCase();
    const themes = {
        aposentadoria: [
            "aposentadoria",
            "aposentar",
            "inss",
            "benefício",
            "beneficio",
            "auxílio",
            "auxilio",
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
        ],
        consumidor: [
            "compra",
            "produto",
            "serviço",
            "servico",
            "defeito",
            "troca",
            "reparo",
        ],
        trabalhista: [
            "trabalho",
            "demissão",
            "demissao",
            "rescisão",
            "rescisao",
            "verbas",
            "horas",
            "salário",
            "salario",
        ],
        previdenciario: [
            "previdenciário",
            "previdenciario",
            "previdência",
            "previdencia",
            "aposentadoria",
            "auxílio doença",
            "auxilio doença",
            "auxilio doenca",
        ],
    };
    for (const [theme, keywords] of Object.entries(themes)) {
        if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
            return theme;
        }
    }
    return null;
}
function classifyMessage(message) {
    const lowerMessage = message.toLowerCase();
    let theme = "geral";
    const themeKeywords = {
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
            "loas",
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
            "conta",
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
            "testamento",
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
            "venda",
        ],
    };
    for (const [themeName, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
            theme = themeName;
            break;
        }
    }
    let intent = "curiosity";
    const curiosityKeywords = [
        "o que é",
        "como funciona",
        "quanto tempo",
        "quais documentos",
        "posso",
        "tenho direito",
    ];
    const leadInterestKeywords = [
        "quero",
        "preciso",
        "meu caso",
        "minha situação",
        "minha situacao",
        "ajuda",
        "problema",
        "direito",
    ];
    const supportKeywords = [
        "status",
        "andamento",
        "processo",
        "consulta",
        "agendamento",
        "documento",
    ];
    const appointmentKeywords = [
        "agendar",
        "consulta",
        "horário",
        "horario",
        "marcar",
        "encontro",
        "falar com advogada",
    ];
    if (appointmentKeywords.some((k) => lowerMessage.includes(k))) {
        intent = "appointment_interest";
    }
    else if (supportKeywords.some((k) => lowerMessage.includes(k))) {
        intent = "support";
    }
    else if (leadInterestKeywords.some((k) => lowerMessage.includes(k))) {
        intent = "lead_interest";
    }
    else if (curiosityKeywords.some((k) => lowerMessage.includes(k))) {
        intent = "curiosity";
    }
    let leadTemperature = "cold";
    const hotKeywords = [
        "urgente",
        "perdi",
        "estou sendo",
        "preciso agora",
        "hoje",
        "imediatamente",
        "emergência",
        "emergencia",
    ];
    const warmKeywords = [
        "quero",
        "preciso",
        "meu caso",
        "minha situação",
        "minha situacao",
        "problema sério",
        "problema serio",
        "prejudicado",
    ];
    const urgencyIndicators = [
        "desconto indevido",
        "demissão injusta",
        "demissao injusta",
        "não paga pensão",
        "nao paga pensao",
        "perdi emprego",
        "ação executiva",
        "acao executiva",
    ];
    if (hotKeywords.some((k) => lowerMessage.includes(k)) ||
        urgencyIndicators.some((k) => lowerMessage.includes(k))) {
        leadTemperature = "hot";
    }
    else if (warmKeywords.some((k) => lowerMessage.includes(k))) {
        leadTemperature = "warm";
    }
    return { theme, intent, leadTemperature };
}
// FUNÇÃO DE LEAD SCORE - SISTEMA DE CONVERSÃO
function calculateLeadScore(state, message) {
    const reasoning = [];
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
    let temperature = 'cold';
    let priorityLevel = 'low';
    let recommendedAction = 'continue_triage';
    let readyForHandoff = false;
    let commercialMomentDetected = false;
    if (score >= 70) {
        temperature = 'hot';
        priorityLevel = 'urgent';
        recommendedAction = 'schedule_consultation';
        readyForHandoff = true;
        commercialMomentDetected = true;
        reasoning.push(' LEAD QUENTE - Pronto para conversão');
    }
    else if (score >= 45) {
        temperature = 'warm';
        priorityLevel = 'high';
        recommendedAction = 'continue_triage';
        commercialMomentDetected = true;
        reasoning.push(' LEAD Morno - Potencial comercial');
    }
    else if (score >= 25) {
        temperature = 'warm';
        priorityLevel = 'medium';
        recommendedAction = 'continue_triage';
        reasoning.push(' LEAD Morno - Requer qualificação');
    }
    else {
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
function initializeConversationState() {
    return {
        currentStep: "acolhimento",
        collectedData: {},
        isHotLead: false,
        needsHumanAttention: false,
        triageCompleteness: 0,
        leadTemperature: 'cold',
        conversionScore: 0,
        priorityLevel: 'low',
        recommendedAction: 'continue_triage',
        readyForHandoff: false,
        commercialMomentDetected: false,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        handoffReason: undefined,
        conversationStatus: "ai_active",
        triageStage: "not_started",
        consultationStage: "not_offered",
        lawyerNotificationGenerated: false,
        contactPreferences: undefined,
        commercialStatus: undefined,
        handoffPackage: undefined,
    };
}
function updateConversationState(state, message, classification) {
    const lowerMessage = message.toLowerCase();
    const newState = {
        ...state,
        collectedData: {
            ...state.collectedData,
            detalhes: [...(state.collectedData.detalhes ?? [])],
            palavras_chave: extractKeywords(message),
        },
    };
    switch (state.currentStep) {
        case "acolhimento":
            newState.currentStep = "identificacao_area";
            newState.collectedData.area = classification.theme;
            break;
        case "identificacao_area":
            if (!newState.collectedData.problema_principal) {
                newState.collectedData.problema_principal = message;
                newState.currentStep = "tempo_momento";
            }
            break;
        case "tempo_momento":
            const timeInfo = extractTimeInfo(message);
            newState.collectedData.timeframe = timeInfo.timeframe;
            newState.collectedData.acontecendo_agora = timeInfo.isHappeningNow;
            newState.currentStep = "documentos_provas";
            break;
        case "documentos_provas":
            const docInfo = extractDocumentInfo(message);
            newState.collectedData.tem_documentos = docInfo.hasDocuments;
            newState.collectedData.tipos_documentos = docInfo.documentTypes;
            newState.currentStep = "objetivo_cliente";
            break;
        case "objetivo_cliente":
            if (!newState.collectedData.objetivo_cliente) {
                newState.collectedData.objetivo_cliente = message;
                newState.currentStep = "avaliacao_urgencia";
            }
            break;
        case "avaliacao_urgencia":
            const urgencyInfo = extractUrgencyInfo(message);
            newState.collectedData.nivel_urgencia = urgencyInfo.level;
            newState.collectedData.prejuizo_ativo = urgencyInfo.hasActiveDamage;
            newState.isHotLead = urgencyInfo.level === 'alta' || urgencyInfo.hasActiveDamage;
            newState.currentStep = "resumo_encaminhamento";
            break;
        case "resumo_encaminhamento":
            // Calcular completude da triagem
            newState.triageCompleteness = calculateTriageCompleteness(newState.collectedData);
            // 🚀 CALCULAR LEAD SCORE E CAMPOS DE CONVERSÃO
            const leadScoreResult = calculateLeadScore(newState, message);
            newState.leadTemperature = leadScoreResult.temperature;
            newState.conversionScore = leadScoreResult.score;
            newState.priorityLevel = leadScoreResult.priorityLevel;
            newState.recommendedAction = leadScoreResult.recommendedAction;
            newState.readyForHandoff = leadScoreResult.readyForHandoff;
            newState.commercialMomentDetected = leadScoreResult.commercialMomentDetected;
            // Atualizar isHotLead baseado no score
            newState.isHotLead = leadScoreResult.temperature === 'hot' || newState.collectedData.nivel_urgencia === 'alta' || (newState.collectedData.prejuizo_ativo === true);
            // Decidir handoff
            const handoffDecision = evaluateHandoff(newState);
            newState.needsHumanAttention = handoffDecision.needsAttention || leadScoreResult.readyForHandoff;
            newState.handoffReason = handoffDecision.reason || leadScoreResult.reasoning.join('; ');
            newState.currentStep = "resumo_encaminhamento";
            break;
    }
    newState.triageCompleteness = calculateTriageCompleteness(newState.collectedData);
    const policyLeadScoreResult = calculateLeadScore(newState, message);
    newState.leadTemperature = policyLeadScoreResult.temperature;
    newState.conversionScore = policyLeadScoreResult.score;
    newState.priorityLevel = policyLeadScoreResult.priorityLevel;
    newState.recommendedAction = policyLeadScoreResult.recommendedAction;
    newState.commercialMomentDetected = policyLeadScoreResult.commercialMomentDetected;
    newState.isHotLead =
        policyLeadScoreResult.temperature === 'hot' ||
            newState.collectedData.nivel_urgencia === 'alta' ||
            (newState.collectedData.prejuizo_ativo === true);
    const extractedPreferences = extractContactPreferences(message);
    const hasNewPreferences = extractedPreferences.channel ||
        extractedPreferences.period ||
        extractedPreferences.urgency ||
        extractedPreferences.availability;
    if (hasNewPreferences) {
        newState.contactPreferences = {
            channel: extractedPreferences.channel ?? newState.contactPreferences?.channel ?? 'whatsapp',
            period: extractedPreferences.period ?? newState.contactPreferences?.period ?? 'qualquer_horario',
            urgency: extractedPreferences.urgency ?? newState.contactPreferences?.urgency ?? 'sem_urgencia',
            availability: extractedPreferences.availability ||
                newState.contactPreferences?.availability ||
                message.trim()
        };
    }
    const consultationIntentDetected = classification.intent === "appointment_interest" ||
        lowerMessage.includes("consulta") ||
        lowerMessage.includes("agendar") ||
        lowerMessage.includes("horario") ||
        lowerMessage.includes("horário") ||
        lowerMessage.includes("manha") ||
        lowerMessage.includes("manhã") ||
        lowerMessage.includes("tarde") ||
        lowerMessage.includes("noite");
    newState.triageStage = derivePolicyConversationTriageStage(newState);
    newState.consultationStage = derivePolicyConsultationStage(newState, consultationIntentDetected);
    newState.commercialStatus = determineCommercialStatus(newState);
    newState.conversationStatus = determineConversationStatus(newState);
    const policyHandoffDecision = evaluatePolicyHandoff(newState, lowerMessage);
    newState.needsHumanAttention = policyHandoffDecision.needsAttention;
    newState.readyForHandoff = policyHandoffDecision.readyForHandoff;
    newState.handoffReason = policyHandoffDecision.reason || undefined;
    return newState;
}
// Funções auxiliares para extração de informações
function extractKeywords(message) {
    const keywords = message.toLowerCase().match(/\b(aposentadoria|inss|benefício|banco|empréstimo|divórcio|pensão|guarda|contrato|demissão|trabalhista)\b/g) || [];
    return [...new Set(keywords)];
}
function extractTimeInfo(message) {
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
function extractDocumentInfo(message) {
    const lowerMessage = message.toLowerCase();
    const documentTypes = [];
    if (lowerMessage.includes('contrato'))
        documentTypes.push('contrato');
    if (lowerMessage.includes('extrato') || lowerMessage.includes('demonstrativo'))
        documentTypes.push('extrato');
    if (lowerMessage.includes('holerite') || lowerMessage.includes('contracheque'))
        documentTypes.push('holerite');
    if (lowerMessage.includes('print') || lowerMessage.includes('printscreen'))
        documentTypes.push('prints');
    if (lowerMessage.includes('notificação') || lowerMessage.includes('carta'))
        documentTypes.push('notificação');
    if (lowerMessage.includes('decisão') || lowerMessage.includes('sentença'))
        documentTypes.push('decisão judicial');
    const hasDocuments = lowerMessage.includes('sim') || lowerMessage.includes('tenho') || lowerMessage.includes('já') || documentTypes.length > 0;
    return { hasDocuments, documentTypes };
}
function extractUrgencyInfo(message) {
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
function extractContactPreferences(message) {
    const lowerMessage = message.toLowerCase();
    // Canal de contato
    let channel = null;
    if (lowerMessage.includes('whatsapp') || lowerMessage.includes('zap'))
        channel = 'whatsapp';
    else if (lowerMessage.includes('ligação') || lowerMessage.includes('ligar') || lowerMessage.includes('telefone'))
        channel = 'ligacao';
    else if (lowerMessage.includes('consulta online') || lowerMessage.includes('online') || lowerMessage.includes('video'))
        channel = 'consulta_online';
    else if (lowerMessage.includes('email') || lowerMessage.includes('e-mail'))
        channel = 'email';
    // Período do dia
    let period = null;
    if (lowerMessage.includes('manhã') || lowerMessage.includes('manha'))
        period = 'manha';
    else if (lowerMessage.includes('tarde'))
        period = 'tarde';
    else if (lowerMessage.includes('noite'))
        period = 'noite';
    else if (lowerMessage.includes('qualquer horário') || lowerMessage.includes('qualquer hora') || lowerMessage.includes('flexível'))
        period = 'qualquer_horario';
    // Urgência
    let urgency = null;
    if (lowerMessage.includes('hoje') || lowerMessage.includes('agora'))
        urgency = 'hoje';
    else if (lowerMessage.includes('esta semana') || lowerMessage.includes('semana'))
        urgency = 'esta_semana';
    else if (lowerMessage.includes('próxima semana') || lowerMessage.includes('proxima semana'))
        urgency = 'proxima_semana';
    else if (lowerMessage.includes('sem urgência') || lowerMessage.includes('sem pressa') || lowerMessage.includes('quando puder'))
        urgency = 'sem_urgencia';
    // Disponibilidade textual
    let availability = '';
    if (channel || period || urgency) {
        const parts = [];
        if (channel)
            parts.push(`Canal: ${channel}`);
        if (period)
            parts.push(`Período: ${period}`);
        if (urgency)
            parts.push(`Urgência: ${urgency}`);
        availability = parts.join(' | ');
    }
    return { channel, period, urgency, availability };
}
function calculateTriageCompleteness(data) {
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
function derivePolicyConversationTriageStage(state) {
    if (state.triageCompleteness >= 80) {
        return "completed";
    }
    if (state.collectedData.nivel_urgencia) {
        return "urgency_assessed";
    }
    if (state.collectedData.problema_principal ||
        state.collectedData.timeframe ||
        state.collectedData.tem_documentos !== undefined) {
        return "details_in_progress";
    }
    if (state.collectedData.area) {
        return "area_identified";
    }
    return "collecting_context";
}
function derivePolicyConsultationStage(state, consultationIntentDetected) {
    const hasAvailability = Boolean(state.contactPreferences?.availability) ||
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
function evaluatePolicyHandoff(state, normalizedMessage) {
    const severeOperationalException = (state.collectedData.nivel_urgencia === 'alta' &&
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
    if (state.consultationStage === 'ready_for_lawyer' ||
        state.consultationStage === 'scheduled_pending_confirmation') {
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
function evaluateHandoff(state) {
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
function shouldAdvanceToNextStage(state) {
    // Critérios para avançar para próximo estágio
    if (state.commercialMomentDetected && state.conversionScore >= 70)
        return true;
    if (state.triageCompleteness >= 80)
        return true;
    if (state.readyForHandoff)
        return true;
    if (state.recommendedAction === 'schedule_consultation' || state.recommendedAction === 'human_handoff')
        return true;
    return false;
}
// Handoff Package - Pacote completo para equipe humana
function generateHandoffPackage(state, lastMessage) {
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
        internalSummary: generateInternalSummary(state),
        commercialStatus: determineCommercialStatus(state),
        timestamp: new Date().toISOString()
    };
}
function determineCommercialStatus(state) {
    if (state.consultationStage === 'scheduled_pending_confirmation') {
        return 'consultation_scheduled';
    }
    if (state.consultationStage === 'ready_for_lawyer' || state.readyForHandoff) {
        return 'qualified';
    }
    if (state.consultationStage === 'availability_collected' ||
        state.consultationStage === 'collecting_availability' ||
        state.consultationStage === 'interest_detected' ||
        state.consultationStage === 'offered' ||
        state.commercialMomentDetected) {
        return 'consultation_proposed';
    }
    return 'triage_in_progress';
}
function determineConversationStatus(state) {
    if (state.consultationStage === 'scheduled_pending_confirmation') {
        return 'handed_off_to_lawyer';
    }
    if (state.consultationStage === 'ready_for_lawyer') {
        return 'consultation_ready';
    }
    if (state.consultationStage === 'availability_collected' ||
        state.consultationStage === 'collecting_availability') {
        return 'scheduling_in_progress';
    }
    if (state.consultationStage === 'interest_detected' ||
        state.consultationStage === 'offered') {
        return 'consultation_offer';
    }
    if (state.triageStage === 'not_started') {
        return 'ai_active';
    }
    return 'triage_in_progress';
}
function generateHandoffMessage(state, handoffType) {
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
function generateConversionMessage(state) {
    const score = state.conversionScore;
    const temperature = state.leadTemperature;
    const action = state.recommendedAction;
    // 🚀 MENSAGENS PREMIUM DE CONVERSÃO
    if (temperature === 'hot' && score >= 70) {
        // LEAD QUENTE - Encaminhamento direto
        if (action === 'schedule_consultation') {
            return `Entendi perfeitamente sua situação. Pelo que você me descreveu, seu caso realmente pede uma análise especializada e cuidadosa.\n\nO próximo passo ideal é organizarmos sua consulta com a Dra. Noêmia, porque aí conseguimos olhar o caso com profundidade e te orientar com segurança.\n\nPara eu deixar isso pronto sem perder o ritmo da conversa, qual dia ou turno costuma funcionar melhor para você?`;
        }
        if (action === 'human_handoff') {
            return `Compreendo completamente a urgência e complexidade do seu caso. Situações como a sua exigem análise humana especializada imediata.\n\nVou encaminhar seu caso diretamente para a equipe da Dra. Noêmia com prioridade máxima. Você receberá contato em até 2 horas úteis.\n\nEnquanto isso, se houver algum agravamento da situação, me avise imediatamente.`;
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
function generateTriageResponse(state, classification, previousMessage) {
    // Detectar respostas curtas para continuidade
    const shortResponses = ["sim", "não", "ainda não", "quero", "ok", "entendi", "certo"];
    const isShortResponse = previousMessage && shortResponses.some(sr => previousMessage.toLowerCase().trim() === sr);
    // Detectar área jurídica e intenção do lead
    const detectedArea = detectLegalArea(previousMessage || "");
    const leadIntention = detectLeadIntention(previousMessage || "");
    const leadProfile = getLeadProfile(leadIntention);
    // Criar/atualizar contexto da conversa
    const context = {
        userName: undefined, // Seria extraído de mensagens anteriores
        detectedArea: detectedArea !== 'geral' ? detectedArea : classification.theme,
        problemSummary: undefined,
        lastTopics: [detectedArea],
        messageCount: 1,
        leadIntention: leadIntention
    };
    // VERIFICAR INTENÇÃO DE COMPRA - PRIORIDADE MÁXIMA
    if (previousMessage) {
        const buyingIntention = detectBuyingIntention(previousMessage);
        if (buyingIntention.shouldFastConvert && buyingIntention.intentionType) {
            return generateFastConversionMessage(buyingIntention.intentionType);
        }
    }
    // VERIFICAR MOMENTO DE FECHAMENTO INTELIGENTE
    if (previousMessage) {
        const closingMessage = generateClosingMessage(context, previousMessage);
        if (closingMessage) {
            return closingMessage;
        }
    }
    // VERIFICAR MOMENTO DE CONDUÇÃO RÁPIDA PARA LEADS PRONTOS
    if (shouldFastConversion(leadProfile) && state.conversionScore >= 40) {
        return generateConversionMessage(state);
    }
    // VERIFICAR MOMENTO DE CONDUÇÃO NORMAL
    if (shouldAdvanceToNextStage(state)) {
        return generateConversionMessage(state);
    }
    let baseMessage = "";
    switch (state.currentStep) {
        case "acolhimento":
            baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'abertura');
            break;
        case "identificacao_area":
            // PULAR PERGUNTAS PARA LEADS PRONTOS
            if (shouldSkipQuestions(leadProfile)) {
                return generateConversionMessage(state);
            }
            if (isShortResponse) {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.investigacao, 'investigacao');
            }
            else {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.investigacao, 'investigacao');
            }
            break;
        case "tempo_momento":
            // PULAR PERGUNTAS PARA LEADS PRONTOS
            if (shouldSkipQuestions(leadProfile)) {
                return generateConversionMessage(state);
            }
            if (isShortResponse) {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.tempo, 'tempo');
            }
            else {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.tempo, 'tempo');
            }
            break;
        case "documentos_provas":
            // PULAR PERGUNTAS PARA LEADS PRONTOS
            if (shouldSkipQuestions(leadProfile)) {
                return generateConversionMessage(state);
            }
            if (isShortResponse) {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.tentativa, 'tentativa');
            }
            else {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.tentativa, 'tentativa');
            }
            break;
        case "objetivo_cliente":
            // PULAR PERGUNTAS PARA LEADS PRONTOS
            if (shouldSkipQuestions(leadProfile)) {
                return generateConversionMessage(state);
            }
            if (isShortResponse) {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.negativa, 'negativa');
            }
            else {
                baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.negativa, 'negativa');
            }
            break;
        case "avaliacao_urgencia":
            // VERIFICAR SE JÁ PODE CONDUZIR
            if (state.commercialMomentDetected && state.conversionScore >= 60) {
                return generateConversionMessage(state);
            }
            if (state.needsHumanAttention) {
                const insight = getVariationWithoutRepetition(MESSAGE_VARIATIONS.insight, 'insight');
                const direcionamento = getVariationWithoutRepetition(MESSAGE_VARIATIONS.direcionamento, 'direcionamento');
                const conversao = getVariationWithoutRepetition(MESSAGE_VARIATIONS.conversao, 'conversao');
                if (isShortResponse) {
                    return `${insight}\n\n${direcionamento}\n\n${conversao}`;
                }
                return `${insight}\n\n${direcionamento}\n\n${conversao}`;
            }
            const insight = getVariationWithoutRepetition(MESSAGE_VARIATIONS.insight, 'insight');
            const direcionamento = getVariationWithoutRepetition(MESSAGE_VARIATIONS.direcionamento, 'direcionamento');
            if (isShortResponse) {
                return `${insight}\n\n${direcionamento}`;
            }
            return `${insight}\n\n${direcionamento}`;
        case "resumo_encaminhamento":
            // SEMPRE CONDUZIR NESTE ESTÁGIO
            return generateConversionMessage(state);
        default:
            baseMessage = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'abertura');
            break;
    }
    // ADAPTAR MENSAGEM BASEADA NO PERFIL DO LEAD
    baseMessage = adaptMessageForLead(baseMessage, leadProfile, context.detectedArea || 'geral');
    // Adicionar empatia inteligente (ajustada baseada no perfil)
    baseMessage = addIntelligentEmpathy(baseMessage, context.detectedArea || 'geral', context);
    // Personalizar mensagem com contexto e adaptar tom
    let personalizedMessage = personalizeMessage(baseMessage, context);
    personalizedMessage = adaptMessageTone(personalizedMessage, context.detectedArea || 'geral');
    return personalizedMessage;
}
function generateUserFriendlySummary(state) {
    const data = state.collectedData;
    const parts = [];
    // ... (restante do código permanece igual)
    if (data.area)
        parts.push(`Área: ${getAreaNome(data.area)}`);
    if (data.problema_principal)
        parts.push(`Situação: ${data.problema_principal.substring(0, 80)}${data.problema_principal.length > 80 ? '...' : ''}`);
    if (data.timeframe && data.timeframe !== 'não especificado')
        parts.push(`Quando: ${data.timeframe}`);
    if (data.tem_documentos)
        parts.push(`Documentos: ${data.tipos_documentos && data.tipos_documentos.length > 0 ? data.tipos_documentos.join(', ') : 'disponíveis'}`);
    if (data.objetivo_cliente)
        parts.push(`Objetivo: ${data.objetivo_cliente.substring(0, 60)}${data.objetivo_cliente.length > 60 ? '...' : ''}`);
    if (data.nivel_urgencia && data.nivel_urgencia !== 'baixa')
        parts.push(`Urgência: ${data.nivel_urgencia}`);
    return parts.join(' | ');
}
function generateInternalSummary(state) {
    const data = state.collectedData;
    return `
=== RESUMO DA TRIAGEM ===
Área Jurídica: ${data.area || 'não identificada'}
Problema Principal: ${data.problema_principal || 'não informado'}
Timeframe: ${data.timeframe || 'não informado'}
Acontecendo Agora: ${data.acontecendo_agora ? 'Sim' : 'Não'}
Tem Documentos: ${data.tem_documentos ? 'Sim' : 'Não'}
Tipos de Documentos: ${data.tipos_documentos?.join(', ') || 'N/A'}
Objetivo do Cliente: ${data.objetivo_cliente || 'não informado'}
Nível de Urgência: ${data.nivel_urgencia || 'não avaliado'}
Prejuízo Ativo: ${data.prejuizo_ativo ? 'Sim' : 'Não'}
Completude da Triagem: ${state.triageCompleteness}%
Necessita Atenção Humana: ${state.needsHumanAttention ? 'Sim' : 'Não'}
Motivo: ${state.handoffReason || 'N/A'}
Palavras-chave: ${data.palavras_chave?.join(', ') || 'N/A'}
========================
  `.trim();
}
function getAreaNome(theme) {
    switch (theme) {
        case "previdenciario": return "previdenciária";
        case "bancario": return "bancária";
        case "familia": return "de família";
        case "civil": return "cível";
        default: return "jurídica";
    }
}
function buildSystemPrompt(channel, userType, context) {
    const basePrompt = [
        "Você é a equipe de atendimento do escritório Noêmia Paixão Advocacia.",
        "Faço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia.",
        "Você é a recepcionista inteligente e acolhedora do escritório, especialista em triagem jurídica.",
        "",
        "SUA PERSONALIDADE - ATENDIMENTO ELITE:",
        "- fale como uma pessoa real, educada, empática e elegante",
        "- seja natural, nunca pareça um robô ou chatbot",
        "- use linguagem simples, clara e acolhedora, evite juridiquês",
        "- demonstre que está ouvindo e entendendo de verdade",
        "- seja premium, humana e acessível",
        "- tom: humano, acolhedor, elegante, claro, seguro, levemente persuasivo",
        "- nunca artificial ou mecânico",
        "",
        "FLUXO OBRIGATÓRIO DA CONVERSA:",
        "1. RECEPÇÃO (sempre primeiro)",
        "- Gerar conexão + abrir espaço para relato",
        "- Exemplo base: 'Oi! Me conta com calma o que está acontecendo no seu caso.'",
        "- Nunca responder direto com solução sem entender o caso",
        "",
        "2. INVESTIGAÇÃO (TRIAGEM INTELIGENTE)",
        "- Fazer perguntas naturais, como uma conversa",
        "- Exemplos: 'o que aconteceu exatamente?', 'quando começou?', 'você já tentou resolver?', 'teve alguma negativa?'",
        "- Nunca fazer todas as perguntas de uma vez",
        "- Conduzir de forma leve e progressiva",
        "- Adaptar às respostas do usuário",
        "",
        "3. INTERPRETAÇÃO",
        "- Após entender o caso, identificar: possível área jurídica, nível de urgência, sinais de direito não reconhecido",
        "",
        "4. INSIGHT DE VALOR (ETAPA MAIS IMPORTANTE)",
        "- Gerar uma percepção relevante",
        "- Exemplo: 'Pelo que você me descreveu, existe a possibilidade de ter ocorrido um erro ou até um direito que não foi reconhecido no seu caso.'",
        "- Nunca dar diagnóstico definitivo",
        "- Nunca prometer resultado",
        "- Sempre gerar curiosidade e percepção de valor",
        "",
        "5. DIRECIONAMENTO",
        "- Conduzir para próxima etapa de forma natural",
        "- Exemplo: 'O ideal agora é uma análise mais detalhada do seu caso, para te orientar com segurança.'",
        "",
        "6. CONVERSÃO",
        "- Levar para consulta de forma elegante",
        "- Exemplo: 'Se você quiser, posso te explicar como funciona a consulta e já te encaminhar para agendamento.'",
        "",
        "REGRAS GERAIS DE RESPOSTA:",
        "- Respostas curtas a médias (evitar textos longos)",
        "- Evitar linguagem técnica excessiva",
        "- Nunca parecer robô",
        "- Nunca repetir a mesma estrutura sempre",
        "- Variar levemente as respostas mantendo o padrão",
        "- Sempre manter fluxo lógico (não pular etapas)",
        "",
        "COMPORTAMENTOS PROIBIDOS:",
        "- Dar resposta genérica tipo 'procure um advogado'",
        "- Responder sem entender o caso",
        "- Ignorar o que o usuário falou",
        "- Mudar de assunto",
        "- Parecer atendimento automático",
        "- Dar parecer jurídico definitivo",
        "",
        "CONTEXTO DE NEGÓCIO:",
        "- A NoemIA representa um escritório premium",
        "- O objetivo não é apenas responder, mas: gerar confiança, mostrar autoridade, conduzir o lead até a consulta",
        "",
        "EXEMPLOS DE FLUXO COMPLETO:",
        "",
        "Usuário: 'posso me aposentar?'",
        "Recepção: 'Oi! Me conta com calma o que está acontecendo no seu caso.'",
        "Usuário: 'tenho 55 anos e trabalhei 30 anos'",
        "Investigação: 'E o que aconteceu exatamente? Você já tentou se aposentar e teve alguma negativa?'",
        "Usuário: 'pedi há 6 meses e o INSS negou dizendo que não cumpria requisitos'",
        "Interpretação: 'Entendi... você já tentou o pedido e teve negativa do INSS.'",
        "Insight: 'Pelo que você me descreveu, existe a possibilidade de ter ocorrido um erro ou até um direito que não foi reconhecido no seu caso.'",
        "Direcionamento: 'O ideal agora é uma análise mais detalhada do seu caso, para te orientar com segurança.'",
        "Conversão: 'Se você quiser, posso te explicar como funciona a consulta e já te encaminhar para agendamento.'",
        "",
        "RESPOSTAS ESPECIAIS:",
        "- Para 'oi': 'Oi! Me conta com calma o que está acontecendo no seu caso.'",
        "- Para 'boa tarde': 'Boa tarde! Me conta com calma o que está acontecendo no seu caso.'",
        "- Para 'você é advogada?': 'Faço parte da equipe de atendimento do escritório. A Dra. Noêmia é nossa advogada especialista. Mas me conta primeiro o que está acontecendo no seu caso?'",
        "- Para 'quero saber se tenho direito': 'Oi! Me conta com calma o que está acontecendo no seu caso.'",
        "- Para respostas curtas ('não', 'sim', 'quero'): continue na etapa atual do fluxo",
        "",
        "O QUE NUNCA FAZER:",
        "- não invente fatos ou documentos",
        "- não prometa resultados ou direitos",
        "- não diga 'você tem direito' sem analisar",
        "- não repita 'posso ajudar' ou 'como posso ajudar'",
        "- não use respostas genéricas que não se conectam com o contexto",
        "- não se apresente como 'assistente virtual' ou 'inteligência artificial'",
        "- não use linguagem corporativa ou formal demais",
        "- não faça múltiplas perguntas técnicas na mesma mensagem",
        "- não se apresente como advogada",
        "- não pule etapas do fluxo obrigatório",
        "",
        "SEMPRE siga o fluxo: recepção -> investigação -> interpretação -> insight -> direcionamento -> conversão",
    ];
    const channelPrompts = {
        whatsapp: [
            "CANAL: WhatsApp",
            "- respostas curtas e fluidas",
            "- linguagem próxima, humana e profissional",
            "- pode usar emoji com moderação, quando ajudar a acolher",
            "- reconheça primeiro o que a pessoa disse antes de fazer a próxima pergunta",
            "- faça uma pergunta por vez quando a conversa estiver no início",
            "- se houver intenção clara de consulta, agendamento, endereço ou falar com a advogada, continue conduzindo a triagem e organize o agendamento antes do handoff humano",
            "- colete preferência de dia, turno, horário e canal de contato antes de encerrar o atendimento inicial",
        ],
        instagram: [
            "CANAL: Instagram",
            "- respostas naturais, leves e envolventes",
            "- linguagem acolhedora e mais calorosa",
            "- evitar cara de atendimento automático",
            "- SEMPRE se apresentar como 'atendente virtual do escritório Noêmia Paixão Advocacia'",
            "- NUNCA falar como se fosse a própria advogada",
            "- deixar claro que é assistente virtual que ajuda a organizar o atendimento",
            "- reconheça o contexto do comentário ou da DM de forma natural, sem repetir mecanicamente",
            "- faça uma pergunta curta por vez",
            "- se a pessoa pedir consulta, endereço, WhatsApp ou quiser seguir no atendimento real, organize as informações mínimas e avance até o momento correto do encaminhamento",
        ],
        site: [
            "CANAL: Site",
            "- respostas um pouco mais completas e explicativas",
            "- manter clareza e sensação de atendimento personalizado",
        ],
        portal: [
            "CANAL: Portal",
            "- respostas mais objetivas e organizadas",
            "- foco em orientação e próximos passos",
        ],
    };
    const userPrompts = {
        visitor: [
            "TIPO DE USUÁRIO: visitante",
            "- foco principal em triagem e condução",
            "- a pessoa pode estar insegura, perdida ou sem saber o que perguntar",
            "- ajude a organizar o raciocínio dela",
        ],
        client: [
            "TIPO DE USUÁRIO: cliente",
            "- responder com mais segurança operacional",
            "- ajudar com clareza, acompanhamento e próximos passos",
            "- reconhecer que já existe vínculo com o escritório",
            "- evitar abordagem de prospecção",
        ],
        staff: [
            "TIPO DE USUÁRIO: equipe",
            "- respostas diretas, organizadas e úteis operacionalmente",
        ],
        unknown: [
            "TIPO DE USUÁRIO: desconhecido",
            "- trate como visitante, com acolhimento e triagem",
        ],
    };
    const prompts = [
        ...basePrompt,
        "",
        ...channelPrompts[channel],
        "",
        ...userPrompts[userType],
    ];
    if (context) {
        prompts.push("", "CONTEXTO DISPONÍVEL:", JSON.stringify(context));
        const acquisition = context?.acquisition;
        if (acquisition) {
            prompts.push("", "CONTEXTO DE AQUISIÇÃO:");
            if (acquisition.ai_context) {
                prompts.push(acquisition.ai_context);
            }
            if (acquisition.language_adaptation) {
                prompts.push(`Adaptação de linguagem: ${acquisition.language_adaptation}`);
            }
            if (acquisition.source) {
                prompts.push(`Origem: ${acquisition.source}`);
            }
            if (acquisition.campaign) {
                prompts.push(`Campanha: ${acquisition.campaign}`);
            }
            if (acquisition.topic) {
                prompts.push(`Tema: ${acquisition.topic}`);
            }
            if (acquisition.content_id) {
                prompts.push(`Conteúdo: ${acquisition.content_id}`);
            }
        }
    }
    prompts.push("", "REGRAS COMERCIAIS E DE CONDUÇÃO:", "- primeiro acolha, depois responda minimamente o tema, depois conduza", "- não despeje link cedo demais", "- quando enviar material, explique em uma frase por que ele ajuda e continue com uma pergunta curta", "- se a pessoa perguntar endereço/local de consulta, explique com naturalidade que esse alinhamento é feito no agendamento com a advogada", "- se a pessoa quiser marcar consulta, falar com a advogada, pedir WhatsApp ou seguir com atendimento real, não encerre a conversa cedo: organize o caso, confirme interesse e colete disponibilidade", "- nesses casos, avance para a consulta de forma objetiva, mas só faça handoff humano quando a consulta estiver pronta para ação", "- antes do handoff, tente coletar melhor dia, melhor turno, melhor horário, urgência e preferência de contato", "- nunca use handoff humano como atalho padrão de resposta", "", "EXEMPLO DE TOM BOM:", "Usuário: 'sou autista e quero saber se posso me aposentar'", "Resposta esperada: 'Entendi... obrigada por me contar isso. Dependendo da sua situação, pode existir sim um caminho, mas isso precisa ser analisado com cuidado. Para eu te orientar melhor nessa triagem inicial, você já recebe algum benefício hoje ou já teve algum pedido negado?'", "", "Responda sempre em português do Brasil.");
    return prompts.join("\n");
}
async function callOpenAI(message, systemPrompt, history = []) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_MODEL || "gpt-5.4";
        if (!apiKey) {
            return { success: false, error: "OPENAI_API_KEY não configurada" };
        }
        const openai = new openai_1.OpenAI({ apiKey });
        const messages = [{ role: "system", content: systemPrompt }];
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}
function generateFallbackResponse(intent, userType, detectedTheme) {
    const saudacao = getSaudacao();
    // Detectar área jurídica se disponível
    const area = detectedTheme ? detectLegalArea("") : 'geral';
    // Criar contexto básico
    const context = {
        detectedArea: detectedTheme || 'geral',
        messageCount: 1
    };
    if (intent === "greeting") {
        let message = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'fallback_abertura');
        message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
        message = personalizeMessage(message, context);
        return adaptMessageTone(message, context.detectedArea || 'geral');
    }
    if (intent === "agenda_request") {
        let message = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'fallback_abertura');
        message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
        message = personalizeMessage(message, context);
        return adaptMessageTone(message, context.detectedArea || 'geral');
    }
    if (intent === "case_request" && userType !== "visitor") {
        let message = `Entendi... Pequenos detalhes podem mudar tudo.\n\n${getVariationWithoutRepetition(MESSAGE_VARIATIONS.investigacao, 'fallback_investigacao')}`;
        message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
        message = personalizeMessage(message, context);
        return adaptMessageTone(message, context.detectedArea || 'geral');
    }
    if (intent === "document_request" && userType !== "visitor") {
        let message = `Perfeito... Os documentos certos fazem toda a diferença.\n\nMas me conta primeiro: ${getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'fallback_abertura')}`;
        message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
        message = personalizeMessage(message, context);
        return adaptMessageTone(message, context.detectedArea || 'geral');
    }
    if (detectedTheme) {
        let message = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'fallback_abertura');
        message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
        message = personalizeMessage(message, context);
        return adaptMessageTone(message, context.detectedArea || 'geral');
    }
    let message = getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, 'fallback_abertura');
    message = addIntelligentEmpathy(message, context.detectedArea || 'geral', context);
    message = personalizeMessage(message, context);
    return adaptMessageTone(message, context.detectedArea || 'geral');
}
async function processNoemiaCore(input) {
    const startTime = Date.now();
    const classification = classifyMessage(input.message);
    const currentConversationState = input.conversationState || initializeConversationState();
    const newConversationState = updateConversationState(currentConversationState, input.message, classification);
    console.log(`NOEMIA_CORE_START: ${input.channel} | ${input.userType} | ${classification.theme} | ${classification.intent} | ${classification.leadTemperature}`);
    console.log(`NOEMIA_CORE_STEP: ${currentConversationState.currentStep} -> ${newConversationState.currentStep}`);
    console.log(`NOEMIA_CORE_MESSAGE: ${input.message.substring(0, 100)}...`);
    try {
        // Fase 4.2 - Buscar contexto do cliente
        let clientContext = null;
        let enrichedContext = input.context;
        if (input.channel === 'whatsapp' || input.channel === 'instagram') {
            try {
                // Tentar obter clientId do metadata ou context
                const clientId = input.metadata?.clientId ||
                    input.context?.clientId ||
                    input.conversationState?.clientId;
                const sessionId = input.metadata?.sessionId ||
                    input.context?.sessionId;
                clientContext = await client_context_1.clientContextService.getClientContextForAI({
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
                    const formattedContext = client_context_1.clientContextService.formatContextForAI(clientContext);
                    // Enriquecer o contexto existente
                    enrichedContext = {
                        ...(input.context ? input.context : {}),
                        clientContext: formattedContext
                    };
                }
            }
            catch (contextError) {
                console.error('CLIENT_CONTEXT_ENRICHMENT_ERROR', contextError);
                // Continuar sem contexto enriquecido
            }
        }
        const intent = detectUserIntent(input.message);
        const detectedTheme = detectLegalTheme(input.message);
        let effectiveAudience = input.userType;
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
        const systemPrompt = buildSystemPrompt(input.channel, effectiveAudience, enrichedContext);
        console.log(`NOEMIA_CORE_OPENAI_ATTEMPT: ${input.channel} | ${effectiveAudience}`);
        const openaiResult = await callOpenAI(input.message, systemPrompt, input.history ?? []);
        if (openaiResult.success && openaiResult.response) {
            console.log(`NOEMIA_CORE_OPENAI_SUCCESS: ${input.channel}`);
            // Fase 4.5 - Atualizar pipeline automaticamente após interação
            if (clientContext && (input.channel === 'whatsapp' || input.channel === 'instagram')) {
                try {
                    await client_context_1.clientContextService.updatePipelineFromInteraction(clientContext.client.id, {
                        messageText: input.message,
                        currentIntent: intent,
                        caseArea: detectedTheme || undefined,
                        leadTemperature: classification.leadTemperature
                    });
                }
                catch (pipelineError) {
                    console.error('PIPELINE_AUTO_UPDATE_ERROR', pipelineError);
                    // Não quebrar o fluxo se a atualização do pipeline falhar
                }
            }
            // Fase 4.6 - Salvar dados da triagem se houver estado de conversação
            if (newConversationState && input.channel !== 'portal') {
                try {
                    await (0, triage_persistence_1.saveTriageData)(input, newConversationState, classification);
                }
                catch (triageError) {
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
        console.log(`NOEMIA_CORE_FALLBACK: ${input.channel} | ${openaiResult.error}`);
        const fallbackReply = effectiveAudience === "visitor"
            ? generateTriageResponse(newConversationState, classification, input.message)
            : generateFallbackResponse(intent, effectiveAudience, detectedTheme || undefined);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`NOEMIA_CORE_ERROR: ${input.channel} | ${errorMessage}`);
        const emergencyResponse = "Oi! Me conta com calma o que está acontecendo no seu caso.";
        return {
            reply: emergencyResponse,
            audience: input.userType,
            source: "fallback",
            usedFallback: true,
            error: errorMessage,
            metadata: {
                responseTime: Date.now() - startTime,
                detectedTheme: detectLegalTheme(input.message) || undefined,
                channel: input.channel,
                openaiUsed: false,
                classification,
                conversationState: newConversationState,
            },
        };
    }
}
async function processComment(commentText, platform, commentId, userId) {
    const startTime = Date.now();
    console.log(`NOEMIA_COMMENT_START: ${platform} | ${commentId} | ${userId}`);
    console.log(`NOEMIA_COMMENT_TEXT: ${commentText.substring(0, 100)}...`);
    const classification = classifyMessage(commentText);
    const shouldReplyPrivately = classification.intent === "lead_interest" ||
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
            console.log(`NOEMIA_COMMENT_SUCCESS: ${platform} | ${shouldReplyPrivately ? "PRIVATE_REPLY" : "PUBLIC_REPLY"}`);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`NOEMIA_COMMENT_ERROR: ${platform} | ${errorMessage}`);
        return {
            reply: "Oi! Vi seu comentário 💬 Tem alguns detalhes importantes sobre isso que muita gente não sabe. Me chama no direct que eu te explico melhor.",
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
function generateCommentFallback(classification) {
    const responses = {
        previdenciario: "Oi! Vi seu comentário 💬 Dependendo da situação, pode existir um caminho que muita gente nem imagina. Me chama no direct que eu te explico melhor.",
        bancario: "Oi! Vi seu comentário 💬 Em casos bancários, às vezes existem detalhes importantes que passam despercebidos. Me chama no direct que eu te explico melhor.",
        familia: "Oi! Vi seu comentário 💬 Em questões de família, alguns detalhes mudam tudo. Me chama no direct que eu te explico melhor.",
        civil: "Oi! Vi seu comentário 💬 Dependendo do que aconteceu, pode existir um caminho importante no seu caso. Me chama no direct que eu te explico melhor.",
        geral: "Oi! Vi seu comentário 💬 Tem alguns pontos importantes sobre isso que podem fazer diferença. Me chama no direct que eu te explico melhor.",
    };
    return responses[classification.theme];
}
async function answerNoemia(rawInput, profile, sessionId, urlContext) {
    // ... (rest of the code remains the same)
    const input = portal_1.askNoemiaSchema.parse(rawInput);
    const coreInput = {
        channel: "site",
        userType: input.audience,
        message: input.message,
        history: [],
        context: urlContext,
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
