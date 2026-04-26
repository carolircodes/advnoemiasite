/**
 * SERVIÇO DE AGENDAMENTO E PROCESSAMENTO DE FOLLOW-UP
 * 
 * Responsável por agendar e executar follow-ups automáticos
 */

import { shouldTriggerFollowUp, ConversationState } from '../ai/noemia-core.ts';
import { followUpPersistence, FollowUpRecord } from './followup-persistence.ts';

export interface FollowUpSchedule {
  sessionId: string;
  userId?: string;
  channel: string;
  lastMessageTime: Date;
  conversationState: ConversationState;
  lastMessage: string;
}

export interface FollowUpResult {
  success: boolean;
  followUpId?: string;
  message?: string;
  error?: string;
  nextAttemptAt?: Date;
}

class FollowUpScheduler {
  private scheduledFollowUps: Map<string, FollowUpSchedule> = new Map();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  /**
   * Agenda um follow-up para uma sessão
   */
  async scheduleFollowUp(schedule: FollowUpSchedule): Promise<FollowUpResult> {
    try {
      // Recuperar histórico de follow-ups anteriores
      const history = await followUpPersistence.getFollowUpHistory(schedule.sessionId);
      const previousAttempts = history.map(record => ({
        id: record.id,
        sessionId: record.sessionId,
        attemptNumber: record.attemptNumber,
        trigger: record.trigger,
        message: record.message,
        sentAt: record.sentAt,
        responseReceived: record.responseReceived,
        nextAttemptAt: record.nextAttemptAt
      }));

      // Verificar se deve acionar follow-up
      const followUpCheck = shouldTriggerFollowUp(
        schedule.conversationState,
        schedule.lastMessageTime,
        previousAttempts
      );

      if (!followUpCheck.shouldTrigger) {
        // Agendar para verificação futura
        if (followUpCheck.nextAttemptAt) {
          this.scheduledFollowUps.set(schedule.sessionId, {
            ...schedule,
            lastMessageTime: schedule.lastMessageTime
          });
        }

        return {
          success: false,
          nextAttemptAt: followUpCheck.nextAttemptAt
        };
      }

      // Gerar ID para o follow-up
      const followUpId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar registro de tentativa
      const attempt = {
        id: followUpId,
        sessionId: schedule.sessionId,
        attemptNumber: previousAttempts.filter(a => a.trigger === followUpCheck.trigger).length + 1,
        trigger: followUpCheck.trigger!,
        message: followUpCheck.message!,
        sentAt: new Date(),
        responseReceived: false,
        nextAttemptAt: followUpCheck.nextAttemptAt
      };

      // Salvar tentativa
      await followUpPersistence.saveFollowUpAttempt(attempt);

      // Enviar follow-up (dependendo do canal)
      const sendResult = await this.sendFollowUpMessage(schedule.channel, schedule.sessionId, followUpCheck.message!);

      if (sendResult.success) {
        // Agendar próxima verificação se houver
        if (followUpCheck.nextAttemptAt) {
          this.scheduledFollowUps.set(schedule.sessionId, {
            ...schedule,
            lastMessageTime: schedule.lastMessageTime
          });
        }

        return {
          success: true,
          followUpId,
          message: followUpCheck.message,
          nextAttemptAt: followUpCheck.nextAttemptAt
        };
      } else {
        // Marcar como falha
        await followUpPersistence.markAsResponded(schedule.sessionId, followUpId);
        
        return {
          success: false,
          error: sendResult.error || 'Failed to send follow-up message'
        };
      }

    } catch (error) {
      console.error('FOLLOWUP_SCHEDULE_ERROR:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Envia mensagem de follow-up pelo canal apropriado
   */
  private async sendFollowUpMessage(channel: string, sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      switch (channel) {
        case 'whatsapp':
          return await this.sendWhatsAppFollowUp(sessionId, message);
        case 'instagram':
          return await this.sendInstagramFollowUp(sessionId, message);
        case 'chat':
        case 'portal':
          return await this.sendPortalFollowUp(sessionId, message);
        default:
          return { success: false, error: `Unsupported channel: ${channel}` };
      }
    } catch (error) {
      console.error(`FOLLOWUP_SEND_ERROR_${channel}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed'
      };
    }
  }

  /**
   * Envia follow-up por WhatsApp
   */
  private async sendWhatsAppFollowUp(sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Implementar integração com WhatsApp API
    // Por enquanto, apenas simula envio
    console.log(`WHATSAPP_FOLLOWUP_SENT: ${sessionId} | ${message.substring(0, 50)}...`);
    
    // Aqui seria a chamada real para a API do WhatsApp
    // await whatsappApi.sendMessage(sessionId, message);
    
    return { success: true };
  }

  /**
   * Envia follow-up por Instagram
   */
  private async sendInstagramFollowUp(sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Implementar integração com Instagram Graph API
    console.log(`INSTAGRAM_FOLLOWUP_SENT: ${sessionId} | ${message.substring(0, 50)}...`);
    
    // await instagramApi.sendDirectMessage(sessionId, message);
    
    return { success: true };
  }

  /**
   * Envia follow-up pelo portal
   */
  private async sendPortalFollowUp(sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Implementar notificação no portal
    console.log(`PORTAL_FOLLOWUP_SENT: ${sessionId} | ${message.substring(0, 50)}...`);
    
    // await notificationService.sendNotification(sessionId, message);
    
    return { success: true };
  }

  /**
   * Inicia o processador automático de follow-ups
   */
  startProcessor(intervalMinutes: number = 5): void {
    if (this.isProcessing) {
      console.log('Follow-up processor already running');
      return;
    }

    this.isProcessing = true;
    console.log(`Starting follow-up processor with ${intervalMinutes} minutes interval`);

    this.processingInterval = setInterval(async () => {
      await this.processPendingFollowUps();
    }, intervalMinutes * 60 * 1000);

    // Processar imediatamente ao iniciar
    this.processPendingFollowUps();
  }

  /**
   * Para o processador automático
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    console.log('Follow-up processor stopped');
  }

  /**
   * Processa follow-ups pendentes
   */
  private async processPendingFollowUps(): Promise<void> {
    try {
      const pendingFollowUps = await followUpPersistence.getPendingFollowUps(20);
      
      if (pendingFollowUps.length === 0) {
        return;
      }

      console.log(`Processing ${pendingFollowUps.length} pending follow-ups`);

      for (const followUp of pendingFollowUps) {
        try {
          // Enviar mensagem diretamente (o estado já foi validado no agendamento)
          const sendResult = await this.sendFollowUpMessage(
            followUp.channel || 'chat',
            followUp.sessionId,
            followUp.message
          );

          if (sendResult.success) {
            console.log(`Follow-up sent successfully: ${followUp.id}`);
          } else {
            console.error(`Failed to send follow-up ${followUp.id}: ${sendResult.error}`);
            await followUpPersistence.markAsResponded(followUp.sessionId, followUp.id);
          }

        } catch (error) {
          console.error(`Error processing follow-up ${followUp.id}:`, error);
        }
      }

    } catch (error) {
      console.error('FOLLOWUP_PROCESSOR_ERROR:', error);
    }
  }

  /**
   * Marca um follow-up como respondido
   */
  async markAsResponded(sessionId: string, followUpId?: string): Promise<void> {
    if (followUpId) {
      await followUpPersistence.markAsResponded(sessionId, followUpId);
    } else {
      // Marcar todos os follow-ups ativos da sessão como respondidos
      const history = await followUpPersistence.getFollowUpHistory(sessionId);
      const activeFollowUps = history.filter(f => f.isActive);
      
      for (const followUp of activeFollowUps) {
        await followUpPersistence.markAsResponded(sessionId, followUp.id);
      }
    }

    // Remover da lista de agendados
    this.scheduledFollowUps.delete(sessionId);
  }

  /**
   * Cancela todos os follow-ups de uma sessão
   */
  async cancelSessionFollowUps(sessionId: string, reason: string): Promise<void> {
    await followUpPersistence.cancelFollowUp(sessionId, reason);
    this.scheduledFollowUps.delete(sessionId);
  }

  /**
   * Obtém estatísticas do sistema de follow-up
   */
  async getStats(): Promise<any> {
    return await followUpPersistence.getFollowUpStats();
  }

  /**
   * Limpa follow-ups antigos
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    return await followUpPersistence.cleanupOldFollowUps(daysToKeep);
  }
}

export const followUpScheduler = new FollowUpScheduler();
