import { createWebhookSupabaseClient } from '../supabase/webhook';
import { generateTrackingLink } from '@/lib/acquisition/link-builder';
import { LEGAL_TOPICS } from '@/lib/acquisition/topics';

export interface KeywordMapping {
  keyword: string;
  theme: string;
  area: string;
  openingMessage: string;
  isActive: boolean;
}

export interface KeywordDetectionResult {
  detected: boolean;
  keyword?: string;
  theme?: string;
  area?: string;
  openingMessage?: string;
}

export interface AutoDMResult {
  success: boolean;
  dmSent?: boolean;
  sessionCreated?: boolean;
  error?: string;
  keyword?: string;
  theme?: string;
}

// Configuração expandida de palavras-chave por área jurídica
export const ENHANCED_KEYWORD_CONFIG = {
  [LEGAL_TOPICS.PREVIDENCIARIO]: {
    keywords: [
      'aposentadoria', 'aposentar', 'inss', 'beneficio', 'auxilio', 'aposentado',
      'aposentada', 'tempo de contribuicao', 'contribuicao', 'idade minima',
      'idade minima', 'tempo de trabalho', 'trabalho', 'previdenciario',
      'me aposentar', 'posso me aposentar', 'quanto tempo falta',
      'quanto tempo', 'tempo falta', 'beneficio negado', 'negado', 'recusado',
      'auxilio doenca', 'auxilio acidente', 'salario maternidade',
      'pensao por morte', 'loas', 'bpc', 'deficiencia'
    ],
    topic: LEGAL_TOPICS.PREVIDENCIARIO,
    priority: 'high',
    contextualMessage: 'vi que você demonstrou interesse em previdenciário',
    valueProposition: 'muita gente passa por isso sem saber que pode ter um direito que não foi reconhecido, especialmente em casos de benefício negado ou tempo de contribuição',
    autoDMMessage: `Oi! Vi que você comentou no vídeo 👩‍⚖️✨

Muita gente passa por isso sem saber que pode ter um direito que não foi reconhecido, especialmente em casos como esse.

Se você quiser, posso entender melhor o seu caso e te orientar com mais precisão.

Vou te deixar um acesso direto aqui 👇`
  },
  [LEGAL_TOPICS.BANCARIO]: {
    keywords: [
      'juros', 'banco', 'cobranca', 'cobrança', 'emprestimo', 'financiamento',
      'cartao de credito', 'cartao', 'cheque especial', 'conta corrente',
      'poupanca', 'investimento', 'taxa de juros', 'juros altos',
      'juros abusivos', 'cheque sem fundo', 'estorno', 'fraude',
      'clonaram cartao', 'cartao clonado', 'fatura', 'fatura alta',
      'tarifa', 'anuidade', 'ces', 'seguro', 'consignado'
    ],
    topic: LEGAL_TOPICS.BANCARIO,
    priority: 'high',
    contextualMessage: 'vi que você demonstrou interesse em direito bancário',
    valueProposition: 'é muito comum haver abusos em juros, cobranças indevidas ou cláusulas abusivas em contratos',
    autoDMMessage: `Oi! Vi que você comentou no vídeo 🏦💳

É muito comum haver abusos em juros, cobranças indevidas ou cláusulas abusivas em contratos.

Se você quiser, posso analisar seu caso e te orientar sobre seus direitos.

Vou te deixar um acesso direto aqui 👇`
  },
  [LEGAL_TOPICS.FAMILIA]: {
    keywords: [
      'divorcio', 'separacao', 'separação', 'pensao', 'pensao alimenticia',
      'guarda', 'filhos', 'filho', 'guarda dos filhos', 'uniao estavel',
      'uniao', 'casamento', 'inventario', 'partilha de bens',
      'heranca', 'sucessao', 'testamento', 'alimentos', 'aluguel',
      'pensao conjugal', 'guarda compartilhada', 'violencia domestica'
    ],
    topic: LEGAL_TOPICS.FAMILIA,
    priority: 'high',
    contextualMessage: 'vi que você demonstrou interesse em direito de família',
    valueProposition: 'questões familiares envolvem muitos detalhes importantes como guarda, pensão e partilha de bens',
    autoDMMessage: `Oi! Vi que você comentou no vídeo 👨‍👩‍👧‍👦

Questões familiares envolvem muitos detalhes importantes como guarda, pensão e partilha de bens.

Se você quiser, posso te ajudar a entender seus direitos e o melhor caminho para sua situação.

Vou te deixar um acesso direto aqui 👇`
  },
  [LEGAL_TOPICS.CIVIL]: {
    keywords: [
      'contrato', 'responsabilidade civil', 'dano moral', 'dano material',
      'indenizacao', 'indenização', 'locação', 'aluguel', 'imovel',
      'compra e venda', 'compra', 'venda', 'prestacao de servicos',
      'servicos', 'protesto', 'acao judicial', 'processo', 'execucao',
      'cumprimento de sentenca', 'tutela', 'curatela', 'interdicao'
    ],
    topic: LEGAL_TOPICS.CIVIL,
    priority: 'medium',
    contextualMessage: 'vi que você demonstrou interesse em direito civil',
    valueProposition: 'contratos, responsabilidade civil e indenizações são áreas onde muitos direitos são desrespeitados',
    autoDMMessage: `Oi! Vi que você comentou no vídeo ⚖️

Contratos, responsabilidade civil e indenizações são áreas onde muitos direitos são desrespeitados.

Se você quiser, posso te ajudar a entender seus direitos e como buscar reparação.

Vou te deixar um acesso direto aqui 👇`
  },
  [LEGAL_TOPICS.TRABALHISTA]: {
    keywords: [
      'demissao', 'rescisao', 'demitido', 'demitida', 'verbas rescisorias',
      'verbas', 'fgts', 'seguro desemprego', 'horas extras',
      'adicional noturno', 'insalubridade', 'periculosidade',
      'caged', 'trabalho escravo', 'assedio moral', 'assedio',
      'justa causa', 'estabilidade', 'aviso previo', 'multa rescisoria'
    ],
    topic: LEGAL_TOPICS.TRABALHISTA,
    priority: 'high',
    contextualMessage: 'vi que você demonstrou interesse em direito trabalhista',
    valueProposition: 'demissões, verbas rescisórias e direitos trabalhistas são áreas onde muitos trabalhadores perdem benefícios importantes',
    autoDMMessage: `Oi! Vi que você comentou no vídeo 💼

Demissões, verbas rescisórias e direitos trabalhistas são áreas onde muitos trabalhadores perdem benefícios importantes.

Se você quiser, posso te ajudar a garantir seus direitos e buscar o que você tem direito.

Vou te deixar um acesso direto aqui 👇`
  },
  [LEGAL_TOPICS.CONSUMIDOR]: {
    keywords: [
      'produto defeituoso', 'servicos', 'procon', 'direito do consumidor',
      'garantia', 'troca', 'devolucao', 'publicidade enganosa',
      'cobranca indevida', 'vicio', 'defeito', 'nao entregue',
      'entrega atrasada', 'cancelamento', 'arrependimento', 'direito de arrependimento'
    ],
    topic: LEGAL_TOPICS.CONSUMIDOR,
    priority: 'medium',
    contextualMessage: 'vi que você demonstrou interesse em direito do consumidor',
    valueProposition: 'produtos defeituosos, serviços mal prestados ou publicidade enganosa geram direito à reparação',
    autoDMMessage: `Oi! Vi que você comentou no vídeo 🛍️

Produtos defeituosos, serviços mal prestados ou publicidade enganosa geram direito à reparação.

Se você quiser, posso te ajudar a entender seus direitos como consumidor.

Vou te deixar um acesso direto aqui 👇`
  }
} as const;

// Palavras-chave gerais (sem tema específico)
export const GENERAL_KEYWORDS = [
  'ajuda', 'ajudar', 'preciso de ajuda', 'me ajuda', 'socorro',
  'quanto custa', 'valor', 'consulta', 'agendar', 'agendamento',
  'falar com advogado', 'advogado', 'advogada', 'escritorio',
  'orientacao', 'orientar', 'duvida', 'duvida juridica', 'consulta juridica',
  'quanto', 'quanto custa', 'preco', 'valor da consulta',
  'como funciona', 'como agendar', 'marcar consulta', 'marcar horario',
  'contato', 'entrar em contato', 'falar', 'conversar', 'atendimento',
  'quero', 'gostaria', 'posso', 'consigo', 'tem como',
  'direito', 'tenho direito', 'meus direitos', 'lei', 'justica'
];

// Palavras-chave de intenção alta
export const HIGH_INTENT_KEYWORDS = [
  'quero agendar', 'quero consulta', 'quero falar', 'preciso falar',
  'urgente', 'emergencia', 'prioridade', 'hoje', 'agora',
  'imediato', 'logo', 'o mais rapido possivel', 'na hora'
];

// Cache para evitar spam (por usuário e post)
const userCommentCache = new Map<string, {
  timestamp: number;
  sent: boolean;
}>();

export interface CommentAnalysis {
  hasKeyword: boolean;
  detectedTopic?: string;
  detectedKeywords: string[];
  priority: 'low' | 'medium' | 'high';
  intentLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

/**
 * Normaliza texto para análise
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Apenas letras e espaços
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Detecta palavras-chave em um comentário usando configuração expandida
 */
export function detectKeywords(comment: string): CommentAnalysis {
  const normalizedComment = normalizeText(comment);

  const detectedKeywords: string[] = [];
  let detectedTopic: string | undefined;
  let priority: 'low' | 'medium' | 'high' = 'low';
  let intentLevel: 'low' | 'medium' | 'high' = 'low';
  let confidence = 0;

  // Verificar palavras-chave gerais
  for (const keyword of GENERAL_KEYWORDS) {
    if (normalizedComment.includes(keyword)) {
      detectedKeywords.push(keyword);
      confidence += 0.3;
    }
  }

  // Verificar palavras-chave de alta intenção
  for (const keyword of HIGH_INTENT_KEYWORDS) {
    if (normalizedComment.includes(keyword)) {
      detectedKeywords.push(keyword);
      intentLevel = 'high';
      confidence += 0.5;
    }
  }

  // Verificar palavras-chave por tema (configuração expandida)
  for (const [topic, config] of Object.entries(ENHANCED_KEYWORD_CONFIG)) {
    for (const keyword of config.keywords) {
      if (normalizedComment.includes(keyword)) {
        detectedKeywords.push(keyword);
        detectedTopic = topic;
        priority = config.priority;
        confidence += 0.4;

        // Se encontrou palavra-chave de tema específico, aumentar confiança
        if (config.priority === 'high') {
          confidence += 0.2;
        }
      }
    }
  }

  // Limitar confiança máxima
  confidence = Math.min(confidence, 1.0);

  // Ajustar nível de intenção baseado na confiança
  if (confidence > 0.7) {
    intentLevel = 'high';
  } else if (confidence > 0.4) {
    intentLevel = 'medium';
  }

  return {
    hasKeyword: detectedKeywords.length > 0,
    detectedTopic,
    detectedKeywords,
    priority,
    intentLevel,
    confidence
  };
}

/**
 * Verifica se usuário já recebeu DM para este post
 */
export function shouldSendDM(userId: string, postId: string): boolean {
  const cacheKey = `${userId}_${postId}`;
  const cached = userCommentCache.get(cacheKey);

  if (!cached) {
    return true;
  }

  // Não enviar se já enviou nas últimas 24 horas
  const hoursSinceLastSent = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
  if (hoursSinceLastSent < 24) {
    return false;
  }

  return !cached.sent;
}

/**
 * Marca que DM foi enviada para usuário/post
 */
export function markDMAsSent(userId: string, postId: string): void {
  const cacheKey = `${userId}_${postId}`;
  userCommentCache.set(cacheKey, {
    timestamp: Date.now(),
    sent: true
  });

  // Limpar cache antigo (mais de 7 dias)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  for (const [key, value] of userCommentCache.entries()) {
    if (value.timestamp < sevenDaysAgo) {
      userCommentCache.delete(key);
    }
  }
}

/**
 * Gera mensagem automática baseada na análise expandida
 */
export function generateAutoDM(analysis: CommentAnalysis, postId: string): string {
  const { detectedTopic, intentLevel } = analysis;

  // Gerar link rastreado
  const trackingLink = generateTrackingLink({
    source: 'instagram',
    campaign: 'comment_auto_dm',
    topic: detectedTopic || 'geral',
    content_id: postId
  });

  // Mensagem baseada no tópico detectado (configuração expandida)
  let contextualMessage = '';
  let valueProposition = '';

  if (detectedTopic && detectedTopic in ENHANCED_KEYWORD_CONFIG) {
    const config = ENHANCED_KEYWORD_CONFIG[detectedTopic as keyof typeof ENHANCED_KEYWORD_CONFIG];
    contextualMessage = config.contextualMessage;
    valueProposition = config.valueProposition;

    // Usar mensagem automática personalizada do tópico
    return `${config.autoDMMessage}

Acesse aqui: ${trackingLink}`;
  }

  // Mensagem genérica para casos sem tema específico
  contextualMessage = 'vi que você está buscando ajuda jurídica';
  valueProposition = 'cada caso tem suas particularidades e merece uma análise cuidadosa para garantir seus direitos';

  // Ajustar tom baseado no nível de intenção
  let opening = '';
  let urgency = '';

  if (intentLevel === 'high') {
    opening = 'Oi! Vi seu comentário e parece ser algo importante 👋';
    urgency = 'Se for urgente, posso te ajudar a entender os próximos passos imediatamente.';
  } else {
    opening = 'Oi! Vi seu comentário 👋';
    urgency = '';
  }

  // Construir mensagem final
  const message = `${opening}

${contextualMessage}. ${valueProposition}.

Se você quiser, posso entender melhor o seu caso e te orientar com mais precisão.

${urgency}

Vou te deixar um acesso direto aqui 👇

Acesse aqui: ${trackingLink}`;

  return message;
}

/**
 * Analisa múltiplos comentários (batch processing)
 */
export function analyzeMultipleComments(comments: Array<{ id: string; from: { id: string }; message: string }>): Array<{
  commentId: string;
  userId: string;
  analysis: CommentAnalysis;
  shouldSend: boolean;
}> {
  return comments.map(comment => ({
    commentId: comment.id,
    userId: comment.from.id,
    analysis: detectKeywords(comment.message),
    shouldSend: shouldSendDM(comment.from.id, comment.id)
  }));
}

/**
 * Limpa cache de comentários antigos
 */
export function cleanupCommentCache(): void {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const [key, value] of userCommentCache.entries()) {
    if (value.timestamp < sevenDaysAgo) {
      userCommentCache.delete(key);
    }
  }
}

class InstagramKeywordAutomationService {
  private supabase = createWebhookSupabaseClient();

  private keywordMappings: KeywordMapping[] = [
    {
      keyword: 'benefício',
      theme: 'previdenciario',
      area: 'previdenciário',
      openingMessage: 'Vi que você comentou sobre benefício! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
      isActive: true
    },
    {
      keyword: 'banco',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre banco! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse problema com o banco vem acontecendo?',
      isActive: true
    },
    {
      keyword: 'desconto',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre desconto! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse desconto vem aparecendo?',
      isActive: true
    },
    {
      keyword: 'cobrança',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre cobrança! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo essa cobrança vem acontecendo?',
      isActive: true
    },
    {
      keyword: 'pensão',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre pensão! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe algum acordo ou decisão judicial sobre a pensão?',
      isActive: true
    },
    {
      keyword: 'divórcio',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre divórcio! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Vocês já estão separados ou ainda moram juntos?',
      isActive: true
    },
    {
      keyword: 'guarda',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre guarda! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe alguma decisão sobre a guarda das crianças?',
      isActive: true
    },
    {
      keyword: 'contrato',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre contrato! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O contrato foi escrito ou verbal?',
      isActive: true
    },
    {
      keyword: 'dano',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre dano! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O dano foi material ou moral?',
      isActive: true
    },
    {
      keyword: 'indenização',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre indenização! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. Você já tentou negociar diretamente?',
      isActive: true
    }
  ];

  // Detectar palavra-chave no comentário
  detectKeyword(commentText: string): KeywordDetectionResult {
    try {
      const normalizedText = commentText.toLowerCase().trim();

      console.log('KEYWORD_DETECTION_START', {
        commentText: normalizedText,
        keywordsCount: this.keywordMappings.length
      });

      for (const mapping of this.keywordMappings) {
        if (!mapping.isActive) continue;

        if (normalizedText.includes(mapping.keyword.toLowerCase())) {
          console.log('KEYWORD_DETECTED', {
            keyword: mapping.keyword,
            theme: mapping.theme,
            area: mapping.area,
            commentText: normalizedText
          });

          return {
            detected: true,
            keyword: mapping.keyword,
            theme: mapping.theme,
            area: mapping.area,
            openingMessage: mapping.openingMessage
          };
        }
      }

      console.log('NO_KEYWORD_DETECTED', {
        commentText: normalizedText,
        keywords: this.keywordMappings.map(k => k.keyword)
      });

      return {
        detected: false
      };
    } catch (error) {
      console.log('KEYWORD_DETECTION_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        commentText
      });

      return {
        detected: false
      };
    }
  }

  // Enviar DM automática
  async sendAutoDM(userId: string, message: string): Promise<boolean> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

      if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
        console.log('AUTO_DM_MISSING_CONFIG', {
          hasToken: !!INSTAGRAM_ACCESS_TOKEN,
          hasBusinessAccountId: !!INSTAGRAM_BUSINESS_ACCOUNT_ID
        });
        return false;
      }

      const apiUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;

      const payload = {
        recipient: {
          id: userId
        },
        message: {
          text: message
        },
        messaging_type: 'RESPONSE'
      };

      console.log('AUTO_DM_SENDING', {
        endpoint: 'POST',
        url: apiUrl,
        apiVersion: 'v19.0',
        businessAccountId: INSTAGRAM_BUSINESS_ACCOUNT_ID,
        recipientId: userId,
        messageType: 'RESPONSE',
        messageLength: message.length,
        messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        console.log('AUTO_DM_SEND_ERROR', {
          status: response.status,
          statusText: response.statusText,
          error: responseText,
          fullResponse: result,
          errorType: result.error ? result.error.type : 'unknown',
          errorCode: result.error ? result.error.code : 'unknown',
          errorMessage: result.error ? result.error.message : 'unknown'
        });
        return false;
      }

      console.log('AUTO_DM_SENT', {
        userId,
        messageId: result.message_id,
        success: true,
        fullResponse: result,
        responseStatus: response.status,
        responseHeaders: {
          'content-type': response.headers.get('content-type'),
          'x-fb-trace-id': response.headers.get('x-fb-trace-id'),
          'x-fb-debug': response.headers.get('x-fb-debug')
        }
      });

      return true;
    } catch (error) {
      console.log('AUTO_DM_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return false;
    }
  }

  // Criar sessão com contexto inicial
  async createSessionWithContext(
    userId: string,
    keyword: string,
    theme: string,
    area: string,
    commentId: string,
    mediaId: string
  ): Promise<boolean> {
    try {
      const sessionData = {
        platform: 'instagram',
        user_id: userId,
        status: 'active',
        metadata: JSON.stringify({
          source: 'keyword_automation',
          keyword: keyword,
          theme: theme,
          area: area,
          comment_id: commentId,
          media_id: mediaId,
          lead_temperature: 'warm',
          created_at: new Date().toISOString()
        })
      };

      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.log('KEYWORD_SESSION_CREATE_ERROR', {
          error: error.message,
          userId,
          keyword
        });
        return false;
      }

      console.log('KEYWORD_SESSION_CREATED', {
        sessionId: data.id,
        userId,
        keyword,
        theme,
        area
      });

      return true;
    } catch (error) {
      console.log('KEYWORD_SESSION_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        keyword
      });
      return false;
    }
  }

  // Verificar se comentário já foi processado
  async wasCommentProcessed(commentId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('id')
        .eq('comment_id', commentId)
        .single();

      // Se a tabela não existe, criar automaticamente
      if (error && error.code === 'PGRST116') {
        console.log('KEYWORD_TABLE_NOT_EXISTS', {
          error: error.message,
          commentId,
          action: 'Table does not exist, assuming not processed'
        });
        return false;
      }

      // Outros erros de banco
      if (error) {
        console.log('KEYWORD_COMMENT_CHECK_ERROR', {
          error: error.message,
          code: error.code,
          commentId,
          action: 'Database error, assuming not processed to avoid blocking'
        });
        return false;
      }

      return !!data;
    } catch (error) {
      console.log('KEYWORD_COMMENT_CHECK_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        commentId,
        action: 'Exception, assuming not processed to avoid blocking'
      });
      return false;
    }
  }

  // Registrar evento de automação
  async recordAutomationEvent(
    commentId: string,
    userId: string,
    keyword: string,
    theme: string,
    area: string,
    dmSent: boolean,
    sessionCreated: boolean
  ): Promise<boolean> {
    try {
      const eventData = {
        comment_id: commentId,
        user_id: userId,
        keyword: keyword,
        theme: theme,
        area: area,
        dm_sent: dmSent,
        session_created: sessionCreated,
        processed_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('keyword_automation_events')
        .insert(eventData);

      // Se a tabela não existe, tentar criar e inserir novamente
      if (error && error.code === 'PGRST116') {
        console.log('KEYWORD_TABLE_NOT_EXISTS_ON_INSERT', {
          error: error.message,
          commentId,
          keyword,
          action: 'Attempting to create table and retry'
        });

        const tableCreated = await this.createKeywordAutomationTable();
        if (tableCreated) {
          const { error: retryError } = await this.supabase
            .from('keyword_automation_events')
            .insert(eventData);

          if (retryError) {
            console.log('KEYWORD_EVENT_RETRY_ERROR', {
              error: retryError.message,
              commentId,
              keyword
            });
            return false;
          }

          console.log('KEYWORD_EVENT_RECORDED_AFTER_TABLE_CREATE', {
            commentId,
            userId,
            keyword,
            dmSent,
            sessionCreated
          });
          return true;
        }
      }

      if (error) {
        console.log('KEYWORD_EVENT_RECORD_ERROR', {
          error: error.message,
          code: error.code,
          commentId,
          keyword
        });
        return false;
      }

      console.log('KEYWORD_EVENT_RECORDED', {
        commentId,
        userId,
        keyword,
        dmSent,
        sessionCreated
      });

      return true;
    } catch (error) {
      console.log('KEYWORD_EVENT_RECORD_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        commentId
      });
      return false;
    }
  }

  // Criar tabela keyword_automation_events se não existir
  async createKeywordAutomationTable(): Promise<boolean> {
    try {
      console.log('KEYWORD_TABLE_CREATE_ATTEMPT', {
        action: 'Table creation needed - please run migration manually'
      });

      // Não podemos criar tabelas dinamicamente via Supabase client
      // Retornar false para indicar que a tabela precisa ser criada via migration
      return false;
    } catch (error) {
      console.log('KEYWORD_TABLE_CREATE_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Processamento principal do fluxo de palavra-chave
  async processKeywordAutomation(
    commentId: string,
    userId: string,
    commentText: string,
    mediaId: string,
    username?: string
  ): Promise<AutoDMResult> {
    try {
      console.log('KEYWORD_FLOW_TRIGGERED', {
        commentId,
        userId,
        username,
        commentText: commentText.substring(0, 100),
        mediaId
      });

      // Verificar se já foi processado
      const wasProcessed = await this.wasCommentProcessed(commentId);
      if (wasProcessed) {
        console.log('KEYWORD_COMMENT_ALREADY_PROCESSED', { commentId });
        return {
          success: false,
          error: 'Comment already processed'
        };
      }

      // Detectar palavra-chave
      const detection = this.detectKeyword(commentText);
      if (!detection.detected) {
        console.log('KEYWORD_NO_DETECTION', { commentId, commentText });
        return {
          success: false,
          error: 'No keyword detected'
        };
      }

      // Enviar DM automática
      const dmSent = await this.sendAutoDM(userId, detection.openingMessage!);
      if (!dmSent) {
        console.log('KEYWORD_DM_SEND_FAILED', { commentId, userId });
        return {
          success: false,
          error: 'Failed to send DM',
          keyword: detection.keyword,
          theme: detection.theme
        };
      }

      console.log('AUTO_DM_SENT', {
        commentId,
        userId,
        keyword: detection.keyword,
        theme: detection.theme
      });

      // Criar sessão com contexto
      const sessionCreated = await this.createSessionWithContext(
        userId,
        detection.keyword!,
        detection.theme!,
        detection.area!,
        commentId,
        mediaId
      );

      // Registrar evento
      await this.recordAutomationEvent(
        commentId,
        userId,
        detection.keyword!,
        detection.theme!,
        detection.area!,
        dmSent,
        sessionCreated
      );

      console.log('KEYWORD_FLOW_COMPLETED', {
        commentId,
        userId,
        keyword: detection.keyword,
        theme: detection.theme,
        dmSent,
        sessionCreated
      });

      return {
        success: true,
        dmSent,
        sessionCreated,
        keyword: detection.keyword,
        theme: detection.theme
      };
    } catch (error) {
      console.log('KEYWORD_FLOW_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        commentId,
        userId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const instagramKeywordAutomation = new InstagramKeywordAutomationService();