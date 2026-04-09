/**
 * SERVIÇO DE GERENCIAMENTO DE CONTEÚDO PARA AQUISIÇÃO
 * 
 * Responsável por gerenciar conteúdos que geram leads
 */

import { LegalTheme } from '../ai/noemia-core';

export interface ContentTrigger {
  id: string;
  contentId: string;
  keyword: string;
  variations: string[];
  theme: LegalTheme;
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
}

export interface AcquisitionContent {
  id: string;
  title: string;
  description: string;
  theme: LegalTheme;
  platform: 'instagram' | 'whatsapp' | 'telegram' | 'website';
  contentType: 'post' | 'story' | 'video' | 'article' | 'message' | 'reel' | 'carousel';
  triggers: ContentTrigger[];
  cta: {
    text: string;
    action: 'comment' | 'dm' | 'link' | 'whatsapp';
    value: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    isActive: boolean;
    reachCount?: number;
    conversionRate?: number;
  };
}

export interface LeadAcquisition {
  id: string;
  leadId: string;
  contentId: string;
  triggerId: string;
  platform: string;
  source: 'comment' | 'dm' | 'form' | 'whatsapp';
  keyword: string;
  theme: LegalTheme;
  capturedAt: Date;
  sessionId: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    contentTitle?: string;
  };
}

// Mock de conteúdo (em produção, viria do CMS ou banco)
const acquisitionContents: AcquisitionContent[] = [
  {
    id: 'content_aposentadoria_001',
    title: 'Guia Completo: Como se Aposentar em 2024',
    description: 'Tudo sobre aposentadoria: regras, documentos e passo a passo',
    theme: 'previdenciario',
    platform: 'instagram',
    contentType: 'post',
    triggers: [
      {
        id: 'trigger_aposentadoria_001',
        contentId: 'content_aposentadoria_001',
        keyword: 'aposentadoria',
        variations: ['aposentar', 'aposentado', 'aposentada', 'inss', 'beneficio'],
        theme: 'previdenciario',
        priority: 'high',
        isActive: true
      },
      {
        id: 'trigger_aposentadoria_002',
        contentId: 'content_aposentadoria_001',
        keyword: 'guia',
        variations: ['guia completo', 'passo a passo', 'como fazer'],
        theme: 'previdenciario',
        priority: 'medium',
        isActive: true
      }
    ],
    cta: {
      text: 'Comente "APOSENTADORIA" para receber o guia completo no seu direct!',
      action: 'comment',
      value: 'aposentadoria'
    },
    metadata: {
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      publishedAt: new Date('2024-01-15'),
      isActive: true,
      reachCount: 12500,
      conversionRate: 3.2
    }
  },
  {
    id: 'content_bancario_001',
    title: 'Banco cobrou errado? Saiba como parar o desconto',
    description: 'Guia prático para contestar cobranças indevidas',
    theme: 'bancario',
    platform: 'instagram',
    contentType: 'reel',
    triggers: [
      {
        id: 'trigger_bancario_001',
        contentId: 'content_bancario_001',
        keyword: 'banco',
        variations: ['cobrou', 'desconto', 'indevido', 'contestar'],
        theme: 'bancario',
        priority: 'high',
        isActive: true
      }
    ],
    cta: {
      text: 'Comente "BANCO" que te envio o passo a passo no direct!',
      action: 'comment',
      value: 'banco'
    },
    metadata: {
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      publishedAt: new Date('2024-01-20'),
      isActive: true,
      reachCount: 8900,
      conversionRate: 4.1
    }
  },
  {
    id: 'content_familia_001',
    title: 'Divórcio: O que você precisa saber',
    description: 'Direitos, deveres e como proteger seus interesses',
    theme: 'familia',
    platform: 'instagram',
    contentType: 'carousel',
    triggers: [
      {
        id: 'trigger_familia_001',
        contentId: 'content_familia_001',
        keyword: 'divorcio',
        variations: ['separação', 'pensão', 'guarda', 'filhos'],
        theme: 'familia',
        priority: 'high',
        isActive: true
      }
    ],
    cta: {
      text: 'Comente "DIVÓRCIO" para receber orientação personalizada!',
      action: 'comment',
      value: 'divorcio'
    },
    metadata: {
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-25'),
      publishedAt: new Date('2024-01-25'),
      isActive: true,
      reachCount: 6700,
      conversionRate: 2.8
    }
  }
];

class AcquisitionContentService {
  private acquisitions: Map<string, LeadAcquisition[]> = new Map();

  /**
   * Detecta triggers em uma mensagem
   */
  detectTriggers(message: string, platform: string): ContentTrigger[] {
    const lowerMessage = message.toLowerCase();
    const detectedTriggers: ContentTrigger[] = [];

    for (const content of acquisitionContents) {
      if (content.platform !== platform && content.platform !== 'website') {
        continue;
      }

      if (!content.metadata.isActive) {
        continue;
      }

      for (const trigger of content.triggers) {
        if (!trigger.isActive) {
          continue;
        }

        // Verificar keyword principal
        if (lowerMessage.includes(trigger.keyword.toLowerCase())) {
          detectedTriggers.push(trigger);
          continue;
        }

        // Verificar variações
        for (const variation of trigger.variations) {
          if (lowerMessage.includes(variation.toLowerCase())) {
            detectedTriggers.push(trigger);
            break;
          }
        }
      }
    }

    // Ordenar por prioridade
    return detectedTriggers.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Obtém conteúdo por trigger
   */
  getContentByTrigger(triggerId: string): AcquisitionContent | null {
    for (const content of acquisitionContents) {
      const trigger = content.triggers.find(t => t.id === triggerId);
      if (trigger) {
        return content;
      }
    }
    return null;
  }

  /**
   * Obtém todos os conteúdos ativos
   */
  getActiveContents(platform?: string): AcquisitionContent[] {
    return acquisitionContents.filter(content => 
      content.metadata.isActive && 
      (!platform || content.platform === platform || content.platform === 'website')
    );
  }

  /**
   * Registra uma aquisição de lead
   */
  async registerAcquisition(acquisition: Omit<LeadAcquisition, 'id' | 'capturedAt'>): Promise<LeadAcquisition> {
    const leadAcquisition: LeadAcquisition = {
      ...acquisition,
      id: `acq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      capturedAt: new Date()
    };

    // Armazenar por conteúdo
    const contentAcquisitions = this.acquisitions.get(acquisition.contentId) || [];
    contentAcquisitions.push(leadAcquisition);
    this.acquisitions.set(acquisition.contentId, contentAcquisitions);

    console.log(`ACQUISITION_REGISTERED: ${acquisition.platform} | ${acquisition.keyword} | ${acquisition.leadId}`);

    return leadAcquisition;
  }

  /**
   * Obtém estatísticas de aquisição
   */
  getAcquisitionStats(contentId?: string): {
    totalAcquisitions: number;
    acquisitionsByPlatform: Record<string, number>;
    acquisitionsByTheme: Record<LegalTheme, number>;
    acquisitionsByKeyword: Record<string, number>;
    conversionRate: number;
  } {
    let allAcquisitions: LeadAcquisition[] = [];

    if (contentId) {
      allAcquisitions = this.acquisitions.get(contentId) || [];
    } else {
      for (const acquisitions of this.acquisitions.values()) {
        allAcquisitions.push(...acquisitions);
      }
    }

    const acquisitionsByPlatform: Record<string, number> = {};
    const acquisitionsByTheme: Record<LegalTheme, number> = {
      previdenciario: 0,
      bancario: 0,
      familia: 0,
      civil: 0,
      geral: 0
    };
    const acquisitionsByKeyword: Record<string, number> = {};

    allAcquisitions.forEach(acquisition => {
      // Por plataforma
      acquisitionsByPlatform[acquisition.platform] = (acquisitionsByPlatform[acquisition.platform] || 0) + 1;

      // Por tema
      acquisitionsByTheme[acquisition.theme] = (acquisitionsByTheme[acquisition.theme] || 0) + 1;

      // Por keyword
      acquisitionsByKeyword[acquisition.keyword] = (acquisitionsByKeyword[acquisition.keyword] || 0) + 1;
    });

    // Taxa de conversão (mock - em produção viria de analytics)
    const conversionRate = allAcquisitions.length > 0 ? 
      Math.random() * 5 + 2 : 0; // 2-7% mock

    return {
      totalAcquisitions: allAcquisitions.length,
      acquisitionsByPlatform,
      acquisitionsByTheme,
      acquisitionsByKeyword,
      conversionRate
    };
  }

  /**
   * Obtém aquisições recentes
   */
  getRecentAcquisitions(limit: number = 50): LeadAcquisition[] {
    let allAcquisitions: LeadAcquisition[] = [];

    for (const acquisitions of this.acquisitions.values()) {
      allAcquisitions.push(...acquisitions);
    }

    return allAcquisitions
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Gera mensagem de DM inicial baseada no conteúdo
   */
  generateInitialDM(content: AcquisitionContent, trigger: ContentTrigger): string {
    const saudacao = this.getSaudacao();
    
    switch (content.theme) {
      case 'previdenciario':
        return `${saudacao}! Vi seu interesse em ${trigger.keyword} no nosso conteúdo sobre "${content.title}". 

É um assunto muito importante e que merece atenção especial. Muitas vezes pequenos detalhes podem fazer toda a diferença no seu caso.

Posso te ajudar a entender os primeiros pontos, documentos necessários e o melhor próximo passo para sua situação.

Vamos começar? Qual sua maior dúvida sobre aposentadoria no momento?`;

      case 'bancario':
        return `${saudacao}! Recebi seu comentário sobre ${trigger.keyword} no nosso conteúdo "${content.title}".

Situações com bancos podem ser bem estressantes, mas você tem direitos e opções importantes. O segredo é agir rápido e com as informações corretas.

Já organizei as principais estratégias para contestar cobranças indevidas e parar descontos não autorizados.

Para te orientar com precisão, me conta: o banco está descontando do seu salário ou da sua conta?`;

      case 'familia':
        return `${saudacao}! Vi seu comentário sobre ${trigger.keyword} no conteúdo "${content.title}".

Questões familiares são sempre delicadas e envolvem muitas emoções. É fundamental que você entenda seus direitos e proteja seus interesses desde o início.

Caso de família (especialmente divórcio, pensão e guarda) tem detalhes que mudam completamente o resultado se não forem tratados corretamente.

Me conte um pouco sobre sua situação: você está pensando em separação ou já iniciou o processo?`;

      default:
        return `${saudacao}! Vi seu interesse no nosso conteúdo sobre "${content.title}".

Este é um tema importante e que merece atenção especial. A melhor forma de te ajudar é entendendo os detalhes do seu caso.

Posso te orientar sobre os pontos principais, documentos necessários e próximos passos.

Por onde você gostaria de começar?`;
    }
  }

  private getSaudacao(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }
}

export const acquisitionContentService = new AcquisitionContentService();
