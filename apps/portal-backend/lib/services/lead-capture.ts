/**
 * SERVIÇO DE CAPTURA DE LEADS
 * 
 * Responsável por capturar leads de múltiplas fontes e iniciar conversas com NoemIA
 */

import { acquisitionContentService, ContentTrigger, AcquisitionContent, LeadAcquisition } from './acquisition-content.ts';
import { processNoemiaCore, NoemiaCoreInput, ConversationState } from '../ai/noemia-core.ts';

export interface CapturedLead {
  id: string;
  platform: 'instagram' | 'whatsapp' | 'telegram' | 'website';
  platformUserId: string;
  username?: string;
  source: 'comment' | 'dm' | 'form' | 'whatsapp';
  trigger: ContentTrigger;
  content: AcquisitionContent;
  capturedAt: Date;
  sessionId: string;
  initialMessage: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    originalComment?: string;
    postUrl?: string;
  };
}

export interface CaptureResult {
  success: boolean;
  lead?: CapturedLead;
  acquisition?: LeadAcquisition;
  errorMessage?: string;
  noemiaResponse?: string;
}

class LeadCaptureService {
  private capturedLeads: Map<string, CapturedLead> = new Map();

  /**
   * Captura lead de comentário no Instagram
   */
  async captureFromComment(
    platformUserId: string,
    username: string | null,
    commentText: string,
    postUrl?: string,
    metadata?: Record<string, any>
  ): Promise<CaptureResult> {
    try {
      console.log(`CAPTURE_COMMENT_START: ${platformUserId} | ${commentText.substring(0, 50)}...`);

      // Detectar triggers no comentário
      const triggers = acquisitionContentService.detectTriggers(commentText, 'instagram');
      
      if (triggers.length === 0) {
        return {
          success: false,
          errorMessage: 'No triggers detected in comment'
        };
      }

      // Usar trigger de maior prioridade
      const trigger = triggers[0];
      const content = acquisitionContentService.getContentByTrigger(trigger.id);

      if (!content) {
        return {
          success: false,
          errorMessage: 'Content not found for trigger'
        };
      }

      // Verificar se já capturamos este lead recentemente
      const existingLead = this.getRecentLead(platformUserId, 'instagram', 24); // 24 horas
      if (existingLead) {
        console.log(`LEAD_ALREADY_CAPTURED: ${platformUserId} | ${existingLead.sessionId}`);
        return {
          success: false,
          errorMessage: 'Lead already captured recently'
        };
      }

      // Criar lead capturado
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const capturedLead: CapturedLead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform: 'instagram',
        platformUserId,
        username: username || undefined,
        source: 'comment',
        trigger,
        content,
        capturedAt: new Date(),
        sessionId,
        initialMessage: commentText,
        metadata: {
          originalComment: commentText,
          postUrl,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          referrer: metadata?.referrer
        }
      };

      // Armazenar lead
      this.capturedLeads.set(sessionId, capturedLead);

      // Registrar aquisição
      const acquisition = await acquisitionContentService.registerAcquisition({
        leadId: capturedLead.id,
        contentId: content.id,
        triggerId: trigger.id,
        platform: 'instagram',
        source: 'comment',
        keyword: trigger.keyword,
        theme: trigger.theme,
        sessionId,
        metadata: {
          contentTitle: content.title,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          referrer: metadata?.referrer
        }
      });

      // Gerar mensagem inicial da NoemIA
      const noemiaMessage = acquisitionContentService.generateInitialDM(content, trigger);

      // Iniciar conversa com NoemIA (contextualizada)
      const noemiaResponse = await this.initiateNoemiaConversation(capturedLead, noemiaMessage);

      console.log(`CAPTURE_COMMENT_SUCCESS: ${platformUserId} | ${trigger.keyword} | ${sessionId}`);

      return {
        success: true,
        lead: capturedLead,
        acquisition,
        noemiaResponse: noemiaResponse?.reply
      };

    } catch (error) {
      console.error('CAPTURE_COMMENT_ERROR:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Captura lead de mensagem direta
   */
  async captureFromDM(
    platformUserId: string,
    username: string | null,
    messageText: string,
    metadata?: Record<string, any>
  ): Promise<CaptureResult> {
    try {
      console.log(`CAPTURE_DM_START: ${platformUserId} | ${messageText.substring(0, 50)}...`);

      // Detectar triggers na mensagem
      const triggers = acquisitionContentService.detectTriggers(messageText, 'instagram');
      
      if (triggers.length === 0) {
        // Se não há triggers, iniciar conversa normal da NoemIA
        const noemiaResponse = await this.initiateNoemiaConversation({
          id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          platform: 'instagram',
          platformUserId,
          username: username || undefined,
          source: 'dm',
          trigger: triggers[0] || { // Mock trigger para conversa normal
            id: 'trigger_normal',
            contentId: 'content_normal',
            keyword: 'geral',
            variations: [],
            theme: 'geral',
            priority: 'medium',
            isActive: true
          },
          content: {
            id: 'content_normal',
            title: 'Conversa Direta',
            description: 'Iniciado via DM',
            theme: 'geral',
            platform: 'instagram',
            contentType: 'message',
            triggers: [],
            cta: {
              text: '',
              action: 'dm',
              value: ''
            },
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              isActive: true
            }
          },
          capturedAt: new Date(),
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          initialMessage: messageText,
          metadata: {}
        });

        return {
          success: true,
          noemiaResponse: noemiaResponse?.reply
        };
      }

      // Usar trigger de maior prioridade
      const trigger = triggers[0];
      const content = acquisitionContentService.getContentByTrigger(trigger.id);

      if (!content) {
        return {
          success: false,
          errorMessage: 'Content not found for trigger'
        };
      }

      // Verificar se já capturamos este lead recentemente
      const existingLead = this.getRecentLead(platformUserId, 'instagram', 24);
      if (existingLead) {
        console.log(`LEAD_ALREADY_CAPTURED: ${platformUserId} | ${existingLead.sessionId}`);
        return {
          success: false,
          errorMessage: 'Lead already captured recently'
        };
      }

      // Criar lead capturado
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const capturedLead: CapturedLead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform: 'instagram',
        platformUserId,
        username: username || undefined,
        source: 'dm',
        trigger,
        content,
        capturedAt: new Date(),
        sessionId,
        initialMessage: messageText,
        metadata: metadata || {}
      };

      // Armazenar lead
      this.capturedLeads.set(sessionId, capturedLead);

      // Registrar aquisição
      const acquisition = await acquisitionContentService.registerAcquisition({
        leadId: capturedLead.id,
        contentId: content.id,
        triggerId: trigger.id,
        platform: 'instagram',
        source: 'dm',
        keyword: trigger.keyword,
        theme: trigger.theme,
        sessionId,
        metadata: {
          contentTitle: content.title,
          ...metadata
        }
      });

      // Gerar mensagem inicial da NoemIA
      const noemiaMessage = acquisitionContentService.generateInitialDM(content, trigger);

      // Iniciar conversa com NoemIA
      const noemiaResponse = await this.initiateNoemiaConversation(capturedLead, noemiaMessage);

      console.log(`CAPTURE_DM_SUCCESS: ${platformUserId} | ${trigger.keyword} | ${sessionId}`);

      return {
        success: true,
        lead: capturedLead,
        acquisition,
        noemiaResponse: noemiaResponse?.reply
      };

    } catch (error) {
      console.error('CAPTURE_DM_ERROR:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Inicia conversa com NoemIA contextualizada
   */
  private async initiateNoemiaConversation(
    capturedLead: CapturedLead,
    initialMessage?: string
  ): Promise<any> {
    try {
      // Criar estado inicial da conversação com contexto
      const conversationState: ConversationState = {
        currentStep: 'acolhimento',
        collectedData: {
          area: capturedLead.content.theme === 'geral' ? undefined : capturedLead.content.theme,
          problema_principal: undefined,
          timeframe: undefined,
          acontecendo_agora: false,
          tem_documentos: false,
          tipos_documentos: [],
          objetivo_cliente: undefined,
          nivel_urgencia: undefined,
          prejuizo_ativo: false,
          detalhes: [],
          palavras_chave: [capturedLead.trigger.keyword]
        },
        isHotLead: capturedLead.trigger.priority === 'high',
        needsHumanAttention: false,
        triageCompleteness: 0,
        leadTemperature: capturedLead.trigger.priority === 'high' ? 'hot' : 
                         capturedLead.trigger.priority === 'medium' ? 'warm' : 'cold',
        conversionScore: capturedLead.trigger.priority === 'high' ? 80 : 
                         capturedLead.trigger.priority === 'medium' ? 60 : 40,
        priorityLevel: capturedLead.trigger.priority === 'high' ? 'high' : 'medium',
        recommendedAction: 'continue_triage',
        readyForHandoff: false,
        commercialMomentDetected: capturedLead.trigger.priority === 'high',
        sessionId: capturedLead.sessionId,
        handoffReason: undefined,
        contactPreferences: undefined,
        commercialStatus: 'new_lead',
        handoffPackage: undefined
      };

      // Preparar input para NoemIA
      const noemiaInput: NoemiaCoreInput = {
        channel: capturedLead.platform as any,
        userType: 'visitor',
        message: initialMessage || capturedLead.initialMessage,
        history: [{
          role: 'assistant',
          content: initialMessage || ''
        }],
        context: {
          acquisitionSource: capturedLead.source,
          contentTitle: capturedLead.content.title,
          triggerKeyword: capturedLead.trigger.keyword,
          platformUserId: capturedLead.platformUserId
        },
        metadata: {
          sessionId: capturedLead.sessionId,
          platformUserId: capturedLead.platformUserId,
          acquisitionId: capturedLead.id
        },
        conversationState
      };

      // Processar com NoemIA
      const result = await processNoemiaCore(noemiaInput);

      console.log(`NOEMIA_CONVERSATION_STARTED: ${capturedLead.sessionId} | ${capturedLead.trigger.keyword}`);

      return result;

    } catch (error) {
      console.error('NOEMIA_CONVERSATION_ERROR:', error);
      throw error;
    }
  }

  /**
   * Verifica se lead já foi capturado recentemente
   */
  private getRecentLead(platformUserId: string, platform: string, hoursAgo: number): CapturedLead | null {
    const cutoff = Date.now() - (hoursAgo * 60 * 60 * 1000);

    for (const lead of this.capturedLeads.values()) {
      if (lead.platformUserId === platformUserId && 
          lead.platform === platform && 
          lead.capturedAt.getTime() > cutoff) {
        return lead;
      }
    }

    return null;
  }

  /**
   * Obtém lead por sessionId
   */
  getLeadBySessionId(sessionId: string): CapturedLead | null {
    return this.capturedLeads.get(sessionId) || null;
  }

  /**
   * Obtém todos os leads capturados
   */
  getAllCapturedLeads(): CapturedLead[] {
    return Array.from(this.capturedLeads.values());
  }

  /**
   * Obtém estatísticas de captura
   */
  getCaptureStats(): {
    totalCaptured: number;
    capturedByPlatform: Record<string, number>;
    capturedBySource: Record<string, number>;
    capturedByTheme: Record<string, number>;
    capturedToday: number;
    capturedThisWeek: number;
  } {
    const allLeads = this.getAllCapturedLeads();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const capturedByPlatform: Record<string, number> = {};
    const capturedBySource: Record<string, number> = {};
    const capturedByTheme: Record<string, number> = {};

    let capturedToday = 0;
    let capturedThisWeek = 0;

    allLeads.forEach(lead => {
      // Por plataforma
      capturedByPlatform[lead.platform] = (capturedByPlatform[lead.platform] || 0) + 1;

      // Por fonte
      capturedBySource[lead.source] = (capturedBySource[lead.source] || 0) + 1;

      // Por tema
      capturedByTheme[lead.content.theme] = (capturedByTheme[lead.content.theme] || 0) + 1;

      // Por período
      if (lead.capturedAt >= today) capturedToday++;
      if (lead.capturedAt >= weekAgo) capturedThisWeek++;
    });

    return {
      totalCaptured: allLeads.length,
      capturedByPlatform,
      capturedBySource,
      capturedByTheme,
      capturedToday,
      capturedThisWeek
    };
  }
}

export const leadCaptureService = new LeadCaptureService();
