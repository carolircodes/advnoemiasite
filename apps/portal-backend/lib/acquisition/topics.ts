/**
 * Constantes padronizadas para temas jurídicos
 * Garantem consistência entre sistema de aquisição e outros componentes
 */

export const LEGAL_TOPICS = {
  PREVIDENCIARIO: 'previdenciario',
  BANCARIO: 'bancario',
  FAMILIA: 'familia',
  CIVIL: 'civil',
  TRABALHISTA: 'trabalhista',
  CONSUMIDOR: 'consumidor',
  GERAL: 'geral'
} as const;

export type LegalTopic = typeof LEGAL_TOPICS[keyof typeof LEGAL_TOPICS];

export const TOPIC_NAMES: Record<LegalTopic, string> = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: 'Previdenciário',
  [LEGAL_TOPICS.BANCARIO]: 'Bancário',
  [LEGAL_TOPICS.FAMILIA]: 'Família',
  [LEGAL_TOPICS.CIVIL]: 'Cível',
  [LEGAL_TOPICS.TRABALHISTA]: 'Trabalhista',
  [LEGAL_TOPICS.CONSUMIDOR]: 'Consumidor',
  [LEGAL_TOPICS.GERAL]: 'Geral'
};

export const TOPIC_DESCRIPTIONS: Record<LegalTopic, string> = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: 'Aposentadoria, INSS, benefícios, tempo de contribuição',
  [LEGAL_TOPICS.BANCARIO]: 'Empréstimos, juros, cobranças, direitos do consumidor bancário',
  [LEGAL_TOPICS.FAMILIA]: 'Divórcio, pensão alimentícia, guarda, sucessão',
  [LEGAL_TOPICS.CIVIL]: 'Contratos, responsabilidade civil, danos morais',
  [LEGAL_TOPICS.TRABALHISTA]: 'Demissão, verbas rescisórias, direitos trabalhistas',
  [LEGAL_TOPICS.CONSUMIDOR]: 'Produtos defeituosos, serviços, proteção ao consumidor',
  [LEGAL_TOPICS.GERAL]: 'Assuntos jurídicos diversos'
};

export const TOPIC_ICONS: Record<LegalTopic, string> = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: '👵',
  [LEGAL_TOPICS.BANCARIO]: '🏦',
  [LEGAL_TOPICS.FAMILIA]: '👨‍👩‍👧‍👦',
  [LEGAL_TOPICS.CIVIL]: '⚖️',
  [LEGAL_TOPICS.TRABALHISTA]: '💼',
  [LEGAL_TOPICS.CONSUMIDOR]: '🛍️',
  [LEGAL_TOPICS.GERAL]: '📋'
};

export const TOPIC_COLORS: Record<LegalTopic, { bg: string; text: string; border: string }> = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300'
  },
  [LEGAL_TOPICS.BANCARIO]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  [LEGAL_TOPICS.FAMILIA]: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300'
  },
  [LEGAL_TOPICS.CIVIL]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300'
  },
  [LEGAL_TOPICS.TRABALHISTA]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  },
  [LEGAL_TOPICS.CONSUMIDOR]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300'
  },
  [LEGAL_TOPICS.GERAL]: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300'
  }
};

export const TOPIC_KEYWORDS: Record<LegalTopic, string[]> = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: [
    'aposentadoria', 'aposentar', 'inss', 'benefício', 'auxílio', 'tempo de contribuição',
    'idade mínima', 'aposentadoria por idade', 'aposentadoria por tempo', 'auxílio doença',
    'auxílio acidente', 'salário maternidade', 'pensão por morte'
  ],
  [LEGAL_TOPICS.BANCARIO]: [
    'banco', 'empréstimo', 'juros', 'cobrança', 'financiamento', 'cartão de crédito',
    'cheque especial', 'conta corrente', 'poupança', 'investimento', 'taxa de juros'
  ],
  [LEGAL_TOPICS.FAMILIA]: [
    'divórcio', 'separação', 'pensão alimentícia', 'guarda', 'filhos', 'casamento',
    'união estável', 'herança', 'sucessão', 'partilha de bens', 'inventário'
  ],
  [LEGAL_TOPICS.CIVIL]: [
    'contrato', 'responsabilidade civil', 'dano moral', 'dano material', 'indenização',
    'locação', 'compra e venda', 'prestação de serviços', 'protesto', 'ação judicial'
  ],
  [LEGAL_TOPICS.TRABALHISTA]: [
    'demissão', 'rescisão', 'verbas rescisórias', 'fgts', 'seguro desemprego',
    'horas extras', 'adicional noturno', 'insalubridade', 'periculosidade', 'caged'
  ],
  [LEGAL_TOPICS.CONSUMIDOR]: [
    'produto defeituoso', 'serviço', 'procon', 'direito do consumidor', 'garantia',
    'troca', 'devolução', 'publicidade enganosa', 'cobrança indevida'
  ],
  [LEGAL_TOPICS.GERAL]: [
    'advogado', 'advogada', 'consultoria', 'orientação', 'ajuda jurídica', 'processo',
    'ação', 'direito', 'lei', 'justiça', 'tribunal', 'vara'
  ]
};

/**
 * Valida se um tópico é válido
 */
export function isValidTopic(topic: string): topic is LegalTopic {
  return Object.values(LEGAL_TOPICS).includes(topic as LegalTopic);
}

/**
 * Detecta automaticamente o tópico baseado em texto
 */
export function detectTopicFromText(text: string): LegalTopic | null {
  const normalizedText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => normalizedText.includes(keyword))) {
      return topic as LegalTopic;
    }
  }
  
  return null;
}

/**
 * Formata o nome do tópico para exibição
 */
export function formatTopicName(topic: LegalTopic): string {
  return TOPIC_NAMES[topic] || topic;
}

/**
 * Retorna o ícone do tópico
 */
export function getTopicIcon(topic: LegalTopic): string {
  return TOPIC_ICONS[topic] || '📋';
}

/**
 * Retorna as cores do tópico
 */
export function getTopicColors(topic: LegalTopic) {
  return TOPIC_COLORS[topic] || TOPIC_COLORS[LEGAL_TOPICS.GERAL];
}

/**
 * Retorna todos os tópicos disponíveis para seleção
 */
export function getAvailableTopics(): Array<{
  value: LegalTopic;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}> {
  return Object.values(LEGAL_TOPICS).map(topic => ({
    value: topic,
    label: TOPIC_NAMES[topic],
    description: TOPIC_DESCRIPTIONS[topic],
    icon: TOPIC_ICONS[topic],
    keywords: TOPIC_KEYWORDS[topic]
  }));
}
