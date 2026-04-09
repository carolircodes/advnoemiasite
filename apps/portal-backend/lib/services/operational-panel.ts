import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientMergeService } from "./client-merge";
import { followUpEngine } from "./follow-up-engine";

export interface OperationalContact {
  clientId: string;
  fullName: string;
  phone?: string;
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  areaInterest?: string;
  sourceChannel: string;
  followUpStatus?: string;
  nextFollowUpAt?: string;
  lastContactAt: string;
  latestSessionSummary?: string;
  latestMessagePreview?: string;
  channels: Array<{
    channel: string;
    externalUserId: string;
    lastContactAt: string;
  }>;
  followUpCount: number;
  priorityScore: number;
  priorityLabel: 'high' | 'medium' | 'low';
  daysSinceLastContact: number;
  isOverdue: boolean;
  suggestedMessage?: {
    messageType: string;
    content: string;
    channel: string;
  };
}

export interface OperationalPanelFilters {
  stage?: string;
  leadTemperature?: string;
  areaInterest?: string;
  sourceChannel?: string;
  priorityLabel?: 'high' | 'medium' | 'low';
  followUpStatus?: string;
  isClient?: boolean;
  search?: string;
}

export interface OperationalPanelMetrics {
  totalLeads: number;
  warmHotLeads: number;
  followUpPending: number;
  consultationOffered: number;
  consultationScheduled: number;
  proposalSent: number;
  contractPending: number;
  totalClients: number;
  inactiveLost: number;
  todayOverdue: number;
  overdueCount: number;
  topPriorities: number;
}

export interface OperationalAction {
  clientId: string;
  pipelineId: string;
  action: 'update_stage' | 'update_temperature' | 'mark_consultation_offered' | 'mark_consultation_scheduled' | 'mark_proposal_sent' | 'mark_contract_pending' | 'mark_client' | 'mark_lost' | 'mark_inactive';
  value?: string;
  notes?: string;
}

class OperationalPanel {
  private supabase = createWebhookSupabaseClient();

  // Fase 6.1 - Listagem operacional completa
  async getOperationalContacts(filters: OperationalPanelFilters = {}, limit: number = 50, offset: number = 0): Promise<{ contacts: OperationalContact[]; total: number }> {
    console.log('FOLLOW_UP_PANEL_LIST_START', { filters, limit, offset });

    try {
      // Construir query base
      let query = this.supabase
        .from('clients')
        .select(`
          id,
          full_name,
          phone,
          is_client,
          merge_status,
          created_at,
          client_pipeline!inner (
            id,
            stage,
            lead_temperature,
            source_channel,
            area_interest,
            follow_up_status,
            next_follow_up_at,
            last_contact_at,
            tags,
            notes,
            summary
          ),
          client_channels (
            id,
            channel,
            external_user_id,
            last_contact_at
          ),
          conversation_sessions (
            id,
            lead_stage,
            case_area,
            current_intent,
            last_summary,
            created_at
          ),
          follow_up_messages (
            id,
            message_type,
            status,
            content,
            scheduled_for,
            created_at
          )
        `, { count: 'exact' })
        .eq('merge_status', 'active');

      // Aplicar filtros
      if (filters.stage) {
        query = query.eq('client_pipeline.stage', filters.stage);
      }
      if (filters.leadTemperature) {
        query = query.eq('client_pipeline.lead_temperature', filters.leadTemperature);
      }
      if (filters.areaInterest) {
        query = query.contains('client_pipeline.tags', [filters.areaInterest]);
      }
      if (filters.sourceChannel) {
        query = query.eq('client_pipeline.source_channel', filters.sourceChannel);
      }
      if (filters.isClient !== undefined) {
        query = query.eq('is_client', filters.isClient);
      }
      if (filters.followUpStatus) {
        query = query.eq('client_pipeline.follow_up_status', filters.followUpStatus);
      }
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      // Ordenação e paginação
      query = query
        .order('client_pipeline.last_contact_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('FOLLOW_UP_PANEL_LIST_ERROR', error);
        return { contacts: [], total: 0 };
      }

      if (!data || data.length === 0) {
        console.log('FOLLOW_UP_PANEL_LIST_EMPTY');
        return { contacts: [], total: 0 };
      }

      // Processar e enriquecer dados
      const contacts: OperationalContact[] = [];

      for (const client of data) {
        const operationalContact = await this.processOperationalContact(client, filters.priorityLabel);
        contacts.push(operationalContact);
      }

      // Aplicar filtro de prioridade se especificado
      let filteredContacts = contacts;
      if (filters.priorityLabel) {
        filteredContacts = contacts.filter(c => c.priorityLabel === filters.priorityLabel);
      }

      // Ordenar final por prioridade e tempo sem contato
      filteredContacts.sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) {
          return b.priorityScore - a.priorityScore; // Maior prioridade primeiro
        }
        return a.daysSinceLastContact - b.daysSinceLastContact; // Mais antigo primeiro
      });

      console.log('FOLLOW_UP_PANEL_LIST_SUCCESS', {
        total: count || 0,
        filtered: filteredContacts.length,
        priorities: filteredContacts.map(c => ({ id: c.clientId, priority: c.priorityLabel, score: c.priorityScore }))
      });

      return { contacts: filteredContacts, total: count || 0 };

    } catch (error) {
      console.error('FOLLOW_UP_PANEL_LIST_ERROR', error);
      return { contacts: [], total: 0 };
    }
  }

  // Fase 6.2 - Cálculo de prioridade operacional
  private async processOperationalContact(client: any, priorityFilter?: 'high' | 'medium' | 'low'): Promise<OperationalContact> {
    const pipeline = client.client_pipeline;
    const channels = client.client_channels || [];
    const sessions = client.conversation_sessions || [];
    const followUps = client.follow_up_messages || [];

    // Calcular métricas básicas
    const now = new Date();
    const lastContact = new Date(pipeline.last_contact_at);
    const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = pipeline.next_follow_up_at ? new Date(pipeline.next_follow_up_at) < now : false;

    // Fase 6.2 - Calcular prioridade
    const priority = this.calculateOperationalPriority(pipeline, daysSinceLastContact, isOverdue);

    // Obter última sessão
    const latestSession = sessions[0];
    const latestMessagePreview = latestSession ? this.getMessagePreview(latestSession.last_summary) : '';

    // Preparar mensagem sugerida
    let suggestedMessage;
    if (priority.label !== 'low') {
      suggestedMessage = await this.prepareSuggestedMessage(client.id, pipeline.id, pipeline.source_channel);
    }

    return {
      clientId: client.id,
      fullName: client.full_name || '',
      phone: client.phone,
      isClient: client.is_client,
      pipelineStage: pipeline.stage,
      leadTemperature: pipeline.lead_temperature,
      areaInterest: pipeline.area_interest,
      sourceChannel: pipeline.source_channel,
      followUpStatus: pipeline.follow_up_status,
      nextFollowUpAt: pipeline.next_follow_up_at,
      lastContactAt: pipeline.last_contact_at,
      latestSessionSummary: latestSession?.last_summary,
      latestMessagePreview,
      channels: channels.map((ch: any) => ({
        channel: ch.channel,
        externalUserId: ch.external_user_id,
        lastContactAt: ch.last_contact_at
      })),
      followUpCount: followUps.length,
      priorityScore: priority.score,
      priorityLabel: priority.label,
      daysSinceLastContact,
      isOverdue,
      suggestedMessage
    };
  }

  // Fase 6.2 - Regras de prioridade operacional
  private calculateOperationalPriority(pipeline: any, daysSinceLastContact: number, isOverdue: boolean): { score: number; label: 'high' | 'medium' | 'low' } {
    let score = 3; // Base score
    let label: 'high' | 'medium' | 'low' = 'medium';

    // PRIORIDADE ALTA
    if (pipeline.lead_temperature === 'hot') {
      score += 3;
      label = 'high';
    }
    if (pipeline.stage === 'consultation_offered' || pipeline.stage === 'proposal_sent' || pipeline.stage === 'contract_pending') {
      score += 2;
      label = 'high';
    }
    if (isOverdue) {
      score += 2;
      label = 'high';
    }
    if (daysSinceLastContact <= 1 && pipeline.lead_temperature === 'hot') {
      score += 1;
      label = 'high';
    }

    // PRIORIDADE MÉDIA
    if (pipeline.lead_temperature === 'warm') {
      score += 1;
      if (label !== 'high') label = 'medium';
    }
    if (pipeline.stage === 'engaged' || pipeline.stage === 'warm_lead') {
      score += 1;
      if (label !== 'high') label = 'medium';
    }
    if (daysSinceLastContact >= 2 && daysSinceLastContact <= 7) {
      score += 1;
      if (label !== 'high') label = 'medium';
    }

    // PRIORIDADE BAIXA
    if (pipeline.lead_temperature === 'cold' && pipeline.stage === 'new_lead') {
      score -= 1;
      label = 'low';
    }
    if (daysSinceLastContact >= 14) {
      score -= 1;
      label = 'low';
    }
    if (pipeline.stage === 'closed_lost' || pipeline.stage === 'inactive') {
      score -= 2;
      label = 'low';
    }

    // Limitar score entre 1-10
    score = Math.max(1, Math.min(10, score));

    console.log('FOLLOW_UP_PRIORITY_CALCULATED', {
      clientId: pipeline.client_id,
      stage: pipeline.stage,
      temperature: pipeline.lead_temperature,
      score,
      label,
      daysSinceLastContact,
      isOverdue
    });

    return { score, label };
  }

  // Fase 6.5 - Preparar mensagem sugerida
  private async prepareSuggestedMessage(clientId: string, pipelineId: string, channel: string): Promise<{ messageType: string; content: string; channel: string } | undefined> {
    try {
      const message = await followUpEngine.generateFollowUpMessageForClient({
        clientId,
        pipelineId,
        channel: channel as any
      });

      if (message) {
        return {
          messageType: message.messageType,
          content: message.content,
          channel: message.channel
        };
      }
    } catch (error) {
      console.error('FOLLOW_UP_MESSAGE_PREPARE_ERROR', error);
    }

    return undefined;
  }

  // Fase 6.4 - Ações operacionais
  async applyOperationalAction(action: OperationalAction): Promise<boolean> {
    console.log('FOLLOW_UP_ACTION_APPLIED', action);

    try {
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (action.action) {
        case 'update_stage':
          updateData.stage = action.value;
          break;
        case 'update_temperature':
          updateData.lead_temperature = action.value;
          break;
        case 'mark_consultation_offered':
          updateData.stage = 'consultation_offered';
          updateData.follow_up_status = 'pending';
          break;
        case 'mark_consultation_scheduled':
          updateData.stage = 'consultation_scheduled';
          updateData.follow_up_status = 'completed';
          break;
        case 'mark_proposal_sent':
          updateData.stage = 'proposal_sent';
          updateData.follow_up_status = 'pending';
          break;
        case 'mark_contract_pending':
          updateData.stage = 'contract_pending';
          updateData.follow_up_status = 'pending';
          break;
        case 'mark_client':
          // Atualizar tabela clients
          await this.supabase
            .from('clients')
            .update({ is_client: true })
            .eq('id', action.clientId);
          break;
        case 'mark_lost':
          updateData.stage = 'closed_lost';
          updateData.follow_up_status = 'completed';
          break;
        case 'mark_inactive':
          updateData.stage = 'inactive';
          updateData.follow_up_status = 'completed';
          break;
      }

      // Adicionar notas se fornecidas
      if (action.notes) {
        updateData.notes = action.notes;
      }

      // Atualizar pipeline
      const { error } = await this.supabase
        .from('client_pipeline')
        .update(updateData)
        .eq('id', action.pipelineId)
        .eq('client_id', action.clientId);

      if (error) {
        console.error('FOLLOW_UP_ACTION_ERROR', error);
        return false;
      }

      console.log('PIPELINE_MANUAL_UPDATE_APPLIED', {
        clientId: action.clientId,
        pipelineId: action.pipelineId,
        action: action.action,
        value: action.value
      });

      return true;

    } catch (error) {
      console.error('FOLLOW_UP_ACTION_ERROR', error);
      return false;
    }
  }

  // Fase 6.7 - Métricas operacionais
  async getOperationalMetrics(): Promise<OperationalPanelMetrics> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Buscar todos os pipelines ativos
      const { data, error } = await this.supabase
        .from('client_pipeline')
        .select(`
          stage,
          lead_temperature,
          follow_up_status,
          next_follow_up_at,
          last_contact_at,
          clients!inner (
            is_client
          )
        `)
        .not('last_contact_at', 'is', null);

      if (error || !data) {
        console.error('OPERATIONAL_METRICS_ERROR', error);
        return this.getEmptyMetrics();
      }

      const metrics: OperationalPanelMetrics = {
        totalLeads: 0,
        warmHotLeads: 0,
        followUpPending: 0,
        consultationOffered: 0,
        consultationScheduled: 0,
        proposalSent: 0,
        contractPending: 0,
        totalClients: 0,
        inactiveLost: 0,
        todayOverdue: 0,
        overdueCount: 0,
        topPriorities: 0
      };

      for (const pipeline of data) {
        const isOverdue = pipeline.next_follow_up_at ? new Date(pipeline.next_follow_up_at) < now : false;
        const nextFollowUpToday = pipeline.next_follow_up_at ? pipeline.next_follow_up_at.split('T')[0] === today : false;

        // Contadores básicos
        if (!pipeline.clients[0]?.is_client) {
          metrics.totalLeads++;
        } else {
          metrics.totalClients++;
        }

        // Temperatura
        if (pipeline.lead_temperature === 'warm' || pipeline.lead_temperature === 'hot') {
          metrics.warmHotLeads++;
        }

        // Follow-up pendente
        if (pipeline.follow_up_status === 'pending' || pipeline.follow_up_status === 'scheduled') {
          metrics.followUpPending++;
        }

        // Estágios específicos
        switch (pipeline.stage) {
          case 'consultation_offered':
            metrics.consultationOffered++;
            break;
          case 'consultation_scheduled':
            metrics.consultationScheduled++;
            break;
          case 'proposal_sent':
            metrics.proposalSent++;
            break;
          case 'contract_pending':
            metrics.contractPending++;
            break;
          case 'closed_lost':
          case 'inactive':
            metrics.inactiveLost++;
            break;
        }

        // Follow-ups vencidos
        if (isOverdue) {
          metrics.overdueCount++;
          if (nextFollowUpToday) {
            metrics.todayOverdue++;
          }
        }

        // Top prioridades (calcular similar ao processOperationalContact)
        const daysSinceLastContact = Math.floor((now.getTime() - new Date(pipeline.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
        const priority = this.calculateOperationalPriority(pipeline, daysSinceLastContact, isOverdue);
        if (priority.label === 'high') {
          metrics.topPriorities++;
        }
      }

      return metrics;

    } catch (error) {
      console.error('OPERATIONAL_METRICS_ERROR', error);
      return this.getEmptyMetrics();
    }
  }

  private getEmptyMetrics(): OperationalPanelMetrics {
    return {
      totalLeads: 0,
      warmHotLeads: 0,
      followUpPending: 0,
      consultationOffered: 0,
      consultationScheduled: 0,
      proposalSent: 0,
      contractPending: 0,
      totalClients: 0,
      inactiveLost: 0,
      todayOverdue: 0,
      overdueCount: 0,
      topPriorities: 0
    };
  }

  // Métodos auxiliares
  private getMessagePreview(summary?: string): string {
    if (!summary) return '';
    
    const preview = summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
    return preview.replace(/\n/g, ' ').trim();
  }

  // Fase 6.3 - Endpoint de painel (será usado pela API route)
  async getPanelData(filters: OperationalPanelFilters = {}, limit: number = 50, offset: number = 0) {
    const [contactsResult, metrics] = await Promise.all([
      this.getOperationalContacts(filters, limit, offset),
      this.getOperationalMetrics()
    ]);

    return {
      contacts: contactsResult.contacts,
      total: contactsResult.total,
      metrics,
      filters
    };
  }
}

export const operationalPanel = new OperationalPanel();
