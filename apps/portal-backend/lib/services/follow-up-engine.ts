import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientMergeService } from "./client-merge";
import { clientContextService } from "./client-context";
import { recordProductEvent } from "./public-intake";

export interface FollowUpEligibility {
  clientId: string;
  pipelineId: string;
  stage: string;
  leadTemperature: string;
  lastContactAt: string;
  nextFollowUpAt?: string;
  followUpStatus?: string;
  areaInterest?: string;
  sourceChannel: string;
  daysSinceLastContact: number;
  isOverdue: boolean;
  priority: number; // 1-5, 5 = highest priority
  reason: string;
}

export interface FollowUpMessage {
  id?: string;
  clientId: string;
  pipelineId: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  messageType:
    | 'reengagement'
    | 'post_contact_followup'
    | 'consultation_invite'
    | 'consultation_followup'
    | 'scheduling_followup'
    | 'pre_consultation_confirmation'
    | 'no_show_reengagement'
    | 'post_triage_useful'
    | 'proposal_reminder'
    | 'contract_nudge'
    | 'inactive_reengagement'
    | 'document_request_nudge'
    | 'intake_completion_reminder'
    | 'strong_source_reengagement'
    | 'custom';
  content: string;
  scheduledFor?: Date;
  status?: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'cancelled' | 'no_response';
}

export interface FollowUpGenerationInput {
  clientId: string;
  pipelineId: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  messageType?: string;
  customContext?: any;
}

export interface FollowUpScheduleInput {
  clientId: string;
  pipelineId: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  messageType: string;
  scheduledFor: Date;
  customContext?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FollowUpResultInput {
  followUpMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'cancelled' | 'no_response';
  errorMessage?: string;
}

class FollowUpEngine {
  private supabase = createWebhookSupabaseClient();

  private async getLatestCommercialSnapshot(clientId: string) {
    const { data: sessions } = await this.supabase
      .from('conversation_sessions')
      .select('id, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5);

    const sessionIds = (sessions || []).map((session) => session.id).filter(Boolean);

    if (sessionIds.length === 0) {
      return null;
    }

    const { data: summaries } = await this.supabase
      .from('noemia_triage_summaries')
      .select('session_id, user_friendly_summary, report_data, updated_at')
      .in('session_id', sessionIds)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!summaries?.length) {
      return null;
    }

    const summary = summaries[0];
    const report = (summary.report_data || {}) as Record<string, unknown>;

    return {
      summary: summary.user_friendly_summary || '',
      commercialStage: typeof report.commercial_funnel_stage === 'string' ? report.commercial_funnel_stage : '',
      consultationInviteState:
        typeof report.consultation_invite_state === 'string' ? report.consultation_invite_state : '',
      consultationValueAngle:
        typeof report.consultation_value_angle === 'string' ? report.consultation_value_angle : '',
      schedulingStatus: typeof report.scheduling_status === 'string' ? report.scheduling_status : '',
      nextBestActionDetail:
        typeof report.next_best_action_detail === 'string' ? report.next_best_action_detail : '',
    };
  }

  // Fase 5.1 - Função principal: getClientsEligibleForFollowUp
  async getClientsEligibleForFollowUp(limit: number = 50): Promise<FollowUpEligibility[]> {
    console.log('FOLLOW_UP_ELIGIBILITY_CHECK_START', { limit });

    try {
      // Buscar clientes com pipeline ativo
      const { data: pipelines, error: pipelineError } = await this.supabase
        .from('client_pipeline')
        .select(`
          id,
          client_id,
          stage,
          lead_temperature,
          source_channel,
          area_interest,
          follow_up_status,
          next_follow_up_at,
          last_contact_at,
          tags,
          notes,
          clients!inner (
            id,
            merge_status,
            created_at
          )
        `)
        .eq('clients.merge_status', 'active')
        .not('last_contact_at', 'is', null)
        .order('last_contact_at', { ascending: true })
        .limit(limit * 2); // Buscar mais para filtrar depois

      if (pipelineError) {
        console.error('FOLLOW_UP_ELIGIBILITY_ERROR', pipelineError);
        return [];
      }

      if (!pipelines || pipelines.length === 0) {
        console.log('FOLLOW_UP_ELIGIBLE_NONE_FOUND');
        return [];
      }

      const eligibleClients: FollowUpEligibility[] = [];

      for (const pipeline of pipelines) {
        const eligibility = await this.evaluateFollowUpEligibility(pipeline);
        
        if (eligibility && eligibility.priority >= 3) { // Apenas prioridade média ou alta
          eligibleClients.push(eligibility);
        }
      }

      // Ordenar por prioridade (maior primeiro) e data de último contato (mais antigo primeiro)
      eligibleClients.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Maior prioridade primeiro
        }
        return a.daysSinceLastContact - b.daysSinceLastContact; // Mais antigo primeiro
      });

      const result = eligibleClients.slice(0, limit);

      console.log('FOLLOW_UP_ELIGIBLE_CLIENT_FOUND', {
        totalFound: result.length,
        priorities: result.map(c => ({ id: c.clientId, priority: c.priority, reason: c.reason }))
      });

      return result;

    } catch (error) {
      console.error('FOLLOW_UP_ELIGIBILITY_ERROR', error);
      return [];
    }
  }

  // Fase 5.2 - Avaliar elegibilidade para follow-up
  private async evaluateFollowUpEligibility(pipeline: any): Promise<FollowUpEligibility | null> {
    const now = new Date();
    const lastContact = new Date(pipeline.last_contact_at);
    const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

    // Regras de elegibilidade
    const eligibility = this.checkEligibilityRules(pipeline, daysSinceLastContact, now);
    
    if (!eligibility.isEligible) {
      console.log('FOLLOW_UP_SKIPPED', {
        clientId: pipeline.client_id,
        reason: eligibility.reason
      });
      return null;
    }

    // Calcular prioridade
    const priority = this.calculatePriority(pipeline, daysSinceLastContact);

    return {
      clientId: pipeline.client_id,
      pipelineId: pipeline.id,
      stage: pipeline.stage,
      leadTemperature: pipeline.lead_temperature,
      lastContactAt: pipeline.last_contact_at,
      nextFollowUpAt: pipeline.next_follow_up_at || undefined,
      followUpStatus: pipeline.follow_up_status || undefined,
      areaInterest: pipeline.area_interest || undefined,
      sourceChannel: pipeline.source_channel,
      daysSinceLastContact,
      isOverdue: pipeline.next_follow_up_at ? new Date(pipeline.next_follow_up_at) < now : false,
      priority,
      reason: eligibility.reason
    };
  }

  // Fase 5.2 - Regras de elegibilidade
  private checkEligibilityRules(pipeline: any, daysSinceLastContact: number, now: Date): { isEligible: boolean; reason: string } {
    const { stage, lead_temperature, follow_up_status, next_follow_up_at } = pipeline;

    // 1. LEAD NOVO PARADO
    if ((stage === 'new_lead' || stage === 'engaged') && daysSinceLastContact >= 3) {
      if (follow_up_status === 'completed') {
        return { isEligible: false, reason: 'follow_up_already_completed' };
      }
      return { isEligible: true, reason: 'new_lead_stalled' };
    }

    // 2. LEAD QUENTE
    if ((lead_temperature === 'warm' || lead_temperature === 'hot') && daysSinceLastContact >= 2) {
      if (follow_up_status === 'completed') {
        return { isEligible: false, reason: 'follow_up_already_completed' };
      }
      return { isEligible: true, reason: 'hot_lead_needs_attention' };
    }

    // 3. CONSULTA OFERECIDA
    if (stage === 'consultation_offered' && daysSinceLastContact >= 1) {
      return { isEligible: true, reason: 'consultation_offered_follow_up' };
    }

    // 4. PROPOSTA ENVIADA / CONTRATO PENDENTE
    if ((stage === 'proposal_sent' || stage === 'contract_pending') && daysSinceLastContact >= 2) {
      return { isEligible: true, reason: 'proposal_contract_follow_up' };
    }

    // 5. NEXT_FOLLOW_UP_AT VENCIDO
    if (next_follow_up_at && new Date(next_follow_up_at) < now) {
      return { isEligible: true, reason: 'scheduled_follow_up_overdue' };
    }

    // 6. LEAD INATIVO (longo período sem contato)
    if (daysSinceLastContact >= 7 && stage !== 'client') {
      return { isEligible: true, reason: 'inactive_lead_reengagement' };
    }

    return { isEligible: false, reason: 'not_eligible_yet' };
  }

  // Calcular prioridade (1-5)
  private calculatePriority(pipeline: any, daysSinceLastContact: number): number {
    let priority = 3; // Base priority

    // Aumentar por temperatura
    if (pipeline.lead_temperature === 'hot') priority += 2;
    else if (pipeline.lead_temperature === 'warm') priority += 1;

    // Aumentar por estágio avançado
    if (pipeline.stage === 'contract_pending') priority += 2;
    else if (pipeline.stage === 'proposal_sent') priority += 1;
    else if (pipeline.stage === 'consultation_offered') priority += 1;

    // Aumentar por tempo sem contato (até certo ponto)
    if (daysSinceLastContact >= 7) priority += 1;
    else if (daysSinceLastContact >= 14) priority += 2;

    // Limitar entre 1-5
    return Math.min(5, Math.max(1, priority));
  }

  // Fase 5.3 - Mapear estágio para tipo de mensagem
  private mapStageToMessageType(stage: string, leadTemperature: string, daysSinceLastContact: number): string {
    // Fase 5.3 - Escada de Conversão
    const stageMapping: Record<string, string> = {
      'new_lead': 'reengagement',
      'engaged': 'post_contact_followup',
      'warm_lead': 'consultation_invite',
      'hot_lead': 'consultation_invite',
      'consultation_offered': 'consultation_invite',
      'proposal_sent': 'proposal_reminder',
      'contract_pending': 'contract_nudge'
    };

    // Se estágio não mapeado, verificar se é inativo
    if (!stageMapping[stage] && daysSinceLastContact >= 7) {
      return 'inactive_reengagement';
    }

    return stageMapping[stage] || 'reengagement';
  }

  // Fase 5.4 - Gerar mensagem de follow-up
  async generateFollowUpMessageForClient(input: FollowUpGenerationInput): Promise<FollowUpMessage | null> {
    console.log('FOLLOW_UP_MESSAGE_GENERATION_START', {
      clientId: input.clientId,
      pipelineId: input.pipelineId,
      channel: input.channel
    });

    try {
      // Buscar contexto completo do cliente
      const clientContext = await clientContextService.getClientContextForAI({
        clientId: input.clientId,
        channel: input.channel
      });

      if (!clientContext) {
        console.log('FOLLOW_UP_MESSAGE_GENERATION_FAILED', { reason: 'no_client_context' });
        return null;
      }

      // Determinar tipo de mensagem
      const commercialSnapshot = await this.getLatestCommercialSnapshot(input.clientId);
      let messageType = input.messageType || this.mapStageToMessageType(
        clientContext.pipeline?.stage || 'new_lead',
        clientContext.pipeline?.lead_temperature || 'cold',
        Math.floor((Date.now() - new Date(clientContext.pipeline?.last_contact_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
      );

      // Gerar conteúdo da mensagem
      if (!input.messageType && commercialSnapshot) {
        if (commercialSnapshot.schedulingStatus === 'collecting_preferences') {
          messageType = 'scheduling_followup';
        } else if (commercialSnapshot.schedulingStatus === 'pending_confirmation') {
          messageType = 'pre_consultation_confirmation';
        } else if (
          commercialSnapshot.consultationInviteState === 'awaiting_response' ||
          commercialSnapshot.consultationInviteState === 'invite_now'
        ) {
          messageType = 'consultation_followup';
        } else if (commercialSnapshot.commercialStage === 'triage_useful') {
          messageType = 'post_triage_useful';
        }
      }

      const content = this.generateMessageContent(messageType, clientContext, commercialSnapshot);

      const followUpMessage: FollowUpMessage = {
        clientId: input.clientId,
        pipelineId: input.pipelineId,
        channel: input.channel,
        messageType: messageType as any,
        content,
        status: 'draft'
      };

      console.log('FOLLOW_UP_MESSAGE_GENERATED', {
        clientId: input.clientId,
        messageType,
        contentLength: content.length
      });

      return followUpMessage;

    } catch (error) {
      console.error('FOLLOW_UP_MESSAGE_GENERATION_ERROR', error);
      return null;
    }
  }

  // Fase 5.4 - Gerar conteúdo da mensagem por contexto
  private generateMessageContent(messageType: string, context: any, commercialSnapshot?: any): string {
    const saudacao = this.getSaudacao();
    const nome = context.client.full_name || '';
    const dias = this.getDaysSinceLastContact(context.pipeline?.last_contact_at);
    const valueAngle =
      commercialSnapshot?.consultationValueAngle ||
      'clareza sobre o melhor proximo passo com seguranca e contexto';
    const nextActionDetail = commercialSnapshot?.nextBestActionDetail || '';

    // Fase 5.4 - Mensagens humanas e elegantes por estágio
    switch (messageType) {
      case 'reengagement':
        return `${saudacao}${nome ? ', ' + nome : ''}! Fiquei pensando no que você comentou comigo ${this.getEmoji('thinking')}
Em muitos casos, quando isso acaba ficando para depois, a pessoa continua com a dúvida sem conseguir enxergar com clareza quais caminhos realmente fazem sentido.
Se você quiser, podemos retomar de onde paramos.`;

      case 'post_contact_followup':
        return `${saudacao}${nome ? ', ' + nome : ''}! Passando por aqui para retomar nossa conversa ${this.getEmoji('smile')}
Pelo que você me contou, faz sentido dar uma olhada mais cuidadosa na sua situação.
Se você quiser continuar conversando sobre isso, estou aqui para ajudar.`;

      case 'consultation_invite':
        return `${saudacao}${nome ? ', ' + nome : ''}! Pelo que você me contou, faz sentido olhar isso com mais cuidado ${this.getEmoji('focus')}
Quando a situação é analisada com mais detalhe, fica muito mais fácil entender quais próximos passos valem a pena no seu caso.
Se você quiser, posso te explicar como funciona essa análise.`;

      case 'consultation_followup':
        return `${saudacao}${nome ? ', ' + nome : ''}! Quis retomar sua conversa com mais cuidado.
Pelo que você compartilhou, ainda faz sentido avançar para uma consulta mais cuidadosa, porque ela ajuda a trazer ${valueAngle}.
Se estiver em um bom momento, posso seguir com você a partir daqui sem deixar essa continuidade morna.`;

      case 'scheduling_followup':
        return `${saudacao}${nome ? ', ' + nome : ''}! Estou retomando seu atendimento para não perdermos o timing.
Falta só alinharmos melhor o horário que funciona para você, para essa próxima etapa ficar organizada com tranquilidade.
Se quiser, me diga o turno ou dia que tende a funcionar melhor e seguimos.`;

      case 'pre_consultation_confirmation':
        return `${saudacao}${nome ? ', ' + nome : ''}! Passando para confirmar a continuidade do seu atendimento com todo cuidado.
Seu caso já está em um ponto bom para consulta, e essa confirmação ajuda a preservar contexto e evitar ruído.
Se estiver tudo certo, seguimos com a confirmação do melhor horário.`;

      case 'no_show_reengagement':
        return `${saudacao}${nome ? ', ' + nome : ''}! Quis retomar com delicadeza porque sua consulta não avançou como esperado.
Se ainda fizer sentido para você, conseguimos reorganizar essa continuidade sem precisar recomeçar a conversa do zero.
Posso te ajudar a destravar isso com mais simplicidade.`;

      case 'post_triage_useful':
        return `${saudacao}${nome ? ', ' + nome : ''}! Sua conversa já trouxe contexto suficiente para uma leitura mais cuidadosa.
Nessa fase, faz sentido transformar o que você contou em direção concreta para o caso.
${nextActionDetail || 'Se quiser, posso te explicar com calma qual é o próximo passo mais indicado.'}`;

      case 'proposal_reminder':
        return `${saudacao}${nome ? ', ' + nome : ''}! Passando por aqui para retomar com você um ponto importante ${this.getEmoji('lightbulb')}
Quando existe interesse em avançar, às vezes uma conversa rápida já ajuda a destravar a decisão e organizar melhor os próximos passos.
Se fizer sentido para você, podemos continuar.`;

      case 'contract_nudge':
        return `${saudacao}${nome ? ', ' + nome : ''}! Só quis retomar com você de forma leve ${this.getEmoji('gentle')}
Em alguns momentos, dar sequência com clareza acaba evitando que a situação fique parada sem necessidade.
Se você quiser, posso te ajudar a seguir com os próximos passos.`;

      case 'inactive_reengagement':
        return `${saudacao}${nome ? ', ' + nome : ''}! Faz tempo que não conversamos ${this.getEmoji('friendly')}
Estava pensando em você e queria saber como está indo. Às vezes a vida fica corrida e acabamos deixando algumas coisas importantes para depois.
Se ainda fizer sentido, podemos retomar nossa conversa.`;

      case 'document_request_nudge':
        return `${saudacao}${nome ? ', ' + nome : ''}! Estou retomando seu atendimento porque ainda existe documento pendente por aqui ${this.getEmoji('focus')}
Sem esse envio, a equipe fica com menos contexto para seguir com segurança.
Se você quiser, posso te ajudar a destravar esse próximo passo.`;

      case 'intake_completion_reminder':
        return `${saudacao}${nome ? ', ' + nome : ''}! Sua triagem ficou no meio do caminho ${this.getEmoji('friendly')}
Quando ela é concluída, fica muito mais fácil orientar com clareza o melhor próximo passo.
Se ainda fizer sentido, podemos retomar de forma simples.`;

      case 'strong_source_reengagement':
        return `${saudacao}${nome ? ', ' + nome : ''}! Quis retomar nossa conversa enquanto seu tema ainda está fresco ${this.getEmoji('lightbulb')}
Esse tipo de situação costuma avançar melhor quando a retomada acontece com contexto e no tempo certo.
Se você quiser, seguimos daqui com mais clareza.`;

      default:
        return `${saudacao}${nome ? ', ' + nome : ''}! Como você está? ${this.getEmoji('hello')}
Estava pensando na nossa conversa e queria saber como está indo. Se precisar de algo, estou aqui para ajudar.`;
    }
  }

  // Fase 5.5 - Agendar follow-up para cliente
  async scheduleFollowUpForClient(input: FollowUpScheduleInput): Promise<boolean> {
    console.log('FOLLOW_UP_MESSAGE_SCHEDULED', {
      clientId: input.clientId,
      pipelineId: input.pipelineId,
      channel: input.channel,
      messageType: input.messageType,
      scheduledFor: input.scheduledFor
    });

    try {
      // Gerar mensagem
      const message = await this.generateFollowUpMessageForClient({
        clientId: input.clientId,
        pipelineId: input.pipelineId,
        channel: input.channel,
        messageType: input.messageType
      });

      if (!message) {
        return false;
      }

      // Inserir no banco
      const { error } = await this.supabase
        .from('follow_up_messages')
        .insert({
          client_id: input.clientId,
          pipeline_id: input.pipelineId,
          channel: input.channel,
          message_type: input.messageType,
          content: message.content,
          scheduled_for: input.scheduledFor.toISOString(),
          status: 'scheduled',
          metadata: {
            generated_at: new Date().toISOString(),
            generation_context: 'scheduled_follow_up',
            ...(input.metadata || {})
          }
        });

      if (error) {
        console.error('FOLLOW_UP_SCHEDULE_ERROR', error);
        return false;
      }

      // Fase 5.6 - Atualizar pipeline
      await this.updatePipelineFollowUpStatus(input.clientId, input.pipelineId, {
        followUpStatus: 'scheduled',
        nextFollowUpAt: input.scheduledFor
      });

      console.log('FOLLOW_UP_MESSAGE_SCHEDULED_SUCCESS', {
        clientId: input.clientId,
        scheduledFor: input.scheduledFor
      });

      if (input.messageType === 'pre_consultation_confirmation') {
        try {
          await recordProductEvent({
            eventKey: 'reminder_sent',
            eventGroup: 'revenue_funnel',
            payload: {
              clientId: input.clientId,
              pipelineId: input.pipelineId,
              channel: input.channel,
              messageType: input.messageType,
              scheduledFor: input.scheduledFor.toISOString()
            }
          });
        } catch (trackingError) {
          console.error('FOLLOW_UP_REMINDER_EVENT_ERROR', trackingError);
        }
      }

      return true;

    } catch (error) {
      console.error('FOLLOW_UP_SCHEDULE_ERROR', error);
      return false;
    }
  }

  // Fase 5.6 - Marcar resultado do follow-up
  async markFollowUpResult(input: FollowUpResultInput): Promise<boolean> {
    console.log('FOLLOW_UP_MESSAGE_STATUS_UPDATED', {
      followUpMessageId: input.followUpMessageId,
      status: input.status
    });

    try {
      const updateData: any = {
        status: input.status,
        updated_at: new Date().toISOString()
      };

      // Adicionar timestamp específico
      switch (input.status) {
        case 'sent':
          updateData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'read':
          updateData.read_at = new Date().toISOString();
          break;
        case 'replied':
          updateData.replied_at = new Date().toISOString();
          break;
      }

      // Adicionar erro se houver
      if (input.errorMessage) {
        updateData.error_message = input.errorMessage;
      }

      const { data, error } = await this.supabase
        .from('follow_up_messages')
        .update(updateData)
        .eq('id', input.followUpMessageId)
        .select('client_id, pipeline_id')
        .single();

      if (error || !data) {
        console.error('FOLLOW_UP_RESULT_UPDATE_ERROR', error);
        return false;
      }

      // Fase 5.6 - Atualizar pipeline baseado no resultado
      await this.updatePipelineFollowUpStatus(data.client_id, data.pipeline_id, {
        followUpStatus: input.status
      });

      console.log('FOLLOW_UP_PIPELINE_UPDATED', {
        clientId: data.client_id,
        pipelineId: data.pipeline_id,
        status: input.status
      });

      return true;

    } catch (error) {
      console.error('FOLLOW_UP_RESULT_UPDATE_ERROR', error);
      return false;
    }
  }

  // Fase 5.6 - Atualizar status de follow-up no pipeline
  private async updatePipelineFollowUpStatus(clientId: string, pipelineId: string, updates: {
    followUpStatus?: string;
    nextFollowUpAt?: Date;
  }): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.followUpStatus) {
        updateData.follow_up_status = updates.followUpStatus;
      }

      if (updates.nextFollowUpAt) {
        updateData.next_follow_up_at = updates.nextFollowUpAt.toISOString();
      }

      const { error } = await this.supabase
        .from('client_pipeline')
        .update(updateData)
        .eq('id', pipelineId)
        .eq('client_id', clientId);

      if (error) {
        console.error('PIPELINE_FOLLOW_UP_UPDATE_ERROR', error);
      }

    } catch (error) {
      console.error('PIPELINE_FOLLOW_UP_UPDATE_ERROR', error);
    }
  }

  // Fase 5.7 - Consulta de prioridade
  async getPriorityFollowUps(limit: number = 20): Promise<FollowUpEligibility[]> {
    return this.getClientsEligibleForFollowUp(limit);
  }

  // Métodos auxiliares
  private getSaudacao(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  private getEmoji(type: 'thinking' | 'smile' | 'focus' | 'lightbulb' | 'gentle' | 'friendly' | 'hello'): string {
    const emojis = {
      thinking: 'ð\x9f¤\x94',
      smile: 'ð\x9f\x98\x8a',
      focus: 'ð\x9f\x8e\xaf',
      lightbulb: 'ð\x9f\x92\xa1',
      gentle: 'ð\x9f\x8c\xb8',
      friendly: 'ð\x9f\x91\x8b',
      hello: 'ð\x9f\x91\x8b'
    };
    return emojis[type] || 'ð\x9f\x98\x8a';
  }

  private getDaysSinceLastContact(lastContactAt?: string): string {
    if (!lastContactAt) return '';
    
    const days = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    if (days <= 7) return `há ${days} dias`;
    if (days <= 30) return `há ${Math.floor(days / 7)} semanas`;
    return `há ${Math.floor(days / 30)} meses`;
  }

  // Fase 5.5 - Salvar mensagem gerada
  async saveFollowUpMessage(message: FollowUpMessage): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_messages')
        .insert({
          client_id: message.clientId,
          pipeline_id: message.pipelineId,
          channel: message.channel,
          message_type: message.messageType,
          content: message.content,
          scheduled_for: message.scheduledFor?.toISOString(),
          status: message.status || 'draft',
          metadata: {
            created_at: new Date().toISOString(),
            generation_context: 'manual_save'
          }
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('FOLLOW_UP_SAVE_ERROR', error);
        return null;
      }

      return data.id;

    } catch (error) {
      console.error('FOLLOW_UP_SAVE_ERROR', error);
      return null;
    }
  }

  // Fase 5.7 - Listar follow-ups agendados
  async getScheduledFollowUps(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_messages')
        .select(`
          *,
          client:client_id(id, name),
          pipeline:pipeline_id(id, stage, lead_temperature)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('GET_SCHEDULED_FOLLOW_UPS_ERROR', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('GET_SCHEDULED_FOLLOW_UPS_ERROR', error);
      return [];
    }
  }
}

export const followUpEngine = new FollowUpEngine();
