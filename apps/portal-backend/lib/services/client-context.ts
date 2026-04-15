import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientMergeService } from "./client-merge";

export interface ClientContextForAI {
  client: {
    id: string;
    full_name?: string;
    is_client: boolean;
    merge_status: 'active' | 'merged';
    created_at: string;
  };
  pipeline: {
    stage?: string;
    lead_temperature?: string;
    source_channel?: string;
    area_interest?: string;
    follow_up_status?: string;
    last_contact_at?: string;
    next_follow_up_at?: string;
    summary?: string;
  } | null;
  session: {
    lead_stage?: string;
    case_area?: string;
    current_intent?: string;
    last_summary?: string;
  } | null;
  channels: Array<{
    channel: string;
    external_user_id: string;
    last_contact_at: string;
  }>;
}

export interface GetClientContextForAIInput {
  clientId?: string;
  sessionId?: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal' | 'telegram';
}

class ClientContextService {
  private supabase = createWebhookSupabaseClient();

  // Fase 4.1 - Função principal getClientContextForAI
  async getClientContextForAI(input: GetClientContextForAIInput): Promise<ClientContextForAI | null> {
    console.log('CLIENT_CONTEXT_LOAD_START', {
      clientId: input.clientId,
      sessionId: input.sessionId,
      channel: input.channel
    });

    try {
      let targetClientId = input.clientId;

      // Se não tiver clientId, tentar obter da sessão
      if (!targetClientId && input.sessionId) {
        const { data: session } = await this.supabase
          .from('conversation_sessions')
          .select('client_id')
          .eq('id', input.sessionId)
          .single();

        if (session?.client_id) {
          targetClientId = session.client_id;
        }
      }

      // Se ainda não tiver, retornar null com segurança
      if (!targetClientId) {
        console.log('CLIENT_CONTEXT_MISSING', { reason: 'no_client_id' });
        return null;
      }

      // Fase 4.1 - Usar client canônico
      const canonicalClientId = await clientMergeService.getCanonicalClientId(targetClientId);

      // Buscar dados do cliente canônico
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', canonicalClientId)
        .single();

      if (clientError || !client) {
        console.log('CLIENT_CONTEXT_MISSING', { reason: 'client_not_found', canonicalClientId });
        return null;
      }

      // Verificar se é cliente (tem processo/caso) vs lead
      const isClient = await this.checkIfIsClient(canonicalClientId);

      // Buscar pipeline
      const pipeline = await this.getClientPipeline(canonicalClientId);

      // Buscar dados da sessão atual
      let session = null;
      if (input.sessionId) {
        session = await this.getSessionData(input.sessionId);
      }

      // Buscar canais do cliente
      const channels = await this.getClientChannels(canonicalClientId);

      const context: ClientContextForAI = {
        client: {
          id: client.id,
          full_name: client.name || undefined,
          is_client: isClient,
          merge_status: client.merge_status as 'active' | 'merged',
          created_at: client.created_at
        },
        pipeline,
        session,
        channels
      };

      console.log('CLIENT_CONTEXT_LOADED', {
        clientId: canonicalClientId,
        isClient,
        pipelineStage: pipeline?.stage,
        leadTemperature: pipeline?.lead_temperature,
        channelsCount: channels.length
      });

      return context;

    } catch (error) {
      console.error('CLIENT_CONTEXT_ERROR', error);
      return null;
    }
  }

  // Verificar se é cliente (tem processo/caso ativo)
  private async checkIfIsClient(clientId: string): Promise<boolean> {
    try {
      // Verificar se tem processo/caso ativo
      const { data: cases } = await this.supabase
        .from('cases')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['active', 'pending', 'in_progress'])
        .limit(1);

      // Verificar se tem consulta agendada
      const { data: appointments } = await this.supabase
        .from('appointments')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['scheduled', 'confirmed'])
        .limit(1);

      return !!(cases && cases.length > 0) || !!(appointments && appointments.length > 0);
    } catch (error) {
      console.error('CHECK_IS_CLIENT_ERROR', error);
      return false;
    }
  }

  // Buscar pipeline do cliente
  private async getClientPipeline(clientId: string): Promise<ClientContextForAI['pipeline']> {
    try {
      const { data, error } = await this.supabase
        .from('client_pipeline')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        stage: data.stage,
        lead_temperature: data.lead_temperature,
        source_channel: data.source_channel,
        area_interest: this.extractAreaInterest(data.tags, data.notes),
        follow_up_status: this.getFollowUpStatus(data.next_follow_up_at),
        last_contact_at: data.last_contact_at,
        next_follow_up_at: data.next_follow_up_at || undefined,
        summary: data.notes || undefined
      };
    } catch (error) {
      console.error('GET_CLIENT_PIPELINE_ERROR', error);
      return null;
    }
  }

  // Buscar dados da sessão
  private async getSessionData(sessionId: string): Promise<ClientContextForAI['session']> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select('lead_stage, case_area, current_intent, last_summary')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        lead_stage: data.lead_stage || undefined,
        case_area: data.case_area || undefined,
        current_intent: data.current_intent || undefined,
        last_summary: data.last_summary || undefined
      };
    } catch (error) {
      console.error('GET_SESSION_DATA_ERROR', error);
      return null;
    }
  }

  // Buscar canais do cliente
  private async getClientChannels(clientId: string): Promise<Array<{channel: string; external_user_id: string; last_contact_at: string}>> {
    try {
      const { data, error } = await this.supabase
        .from('client_channels')
        .select('channel, external_user_id, last_contact_at')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('last_contact_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(channel => ({
        channel: channel.channel,
        external_user_id: channel.external_user_id,
        last_contact_at: channel.last_contact_at
      }));
    } catch (error) {
      console.error('GET_CLIENT_CHANNELS_ERROR', error);
      return [];
    }
  }

  // Extrair área de interesse das tags/notes
  private extractAreaInterest(tags?: string[], notes?: string): string | undefined {
    if (!tags && !notes) return undefined;

    // Mapear tags para áreas
    const areaMapping: Record<string, string> = {
      'previdenciario': 'previdenciario',
      'aposentadoria': 'previdenciario',
      'inss': 'previdenciario',
      'bancario': 'bancario',
      'banco': 'bancario',
      'emprestimo': 'bancario',
      'familia': 'familia',
      'divorcio': 'familia',
      'pensao': 'familia',
      'civil': 'civil',
      'contrato': 'civil',
      'indenizacao': 'civil'
    };

    // Verificar tags primeiro
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase();
        if (areaMapping[normalizedTag]) {
          return areaMapping[normalizedTag];
        }
      }
    }

    // Verificar notes
    if (notes) {
      const normalizedNotes = notes.toLowerCase();
      for (const [key, area] of Object.entries(areaMapping)) {
        if (normalizedNotes.includes(key)) {
          return area;
        }
      }
    }

    return undefined;
  }

  // Determinar status de follow-up
  private getFollowUpStatus(nextFollowUpAt?: string): string | undefined {
    if (!nextFollowUpAt) return undefined;

    const now = new Date();
    const followUpDate = new Date(nextFollowUpAt);

    if (followUpDate < now) {
      return 'overdue';
    } else if (followUpDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) { // 24 horas
      return 'due_soon';
    } else {
      return 'scheduled';
    }
  }

  // Fase 4.5 - Atualização automática do pipeline
  async updatePipelineFromInteraction(
    clientId: string, 
    interactionData: {
      messageText: string;
      currentIntent?: string;
      caseArea?: string;
      leadTemperature?: 'cold' | 'warm' | 'hot';
    }
  ): Promise<boolean> {
    console.log('PIPELINE_UPDATE_FROM_INTERACTION_START', {
      clientId,
      messageLength: interactionData.messageText.length,
      currentIntent: interactionData.currentIntent
    });

    try {
      const canonicalClientId = await clientMergeService.getCanonicalClientId(clientId);
      
      // Buscar pipeline atual
      const { data: currentPipeline } = await this.supabase
        .from('client_pipeline')
        .select('*')
        .eq('client_id', canonicalClientId)
        .single();

      if (!currentPipeline) {
        console.log('PIPELINE_STAGE_UNCHANGED', { reason: 'no_pipeline' });
        return false;
      }

      const updates: any = {
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updated = false;

      // Atualizar área de interesse se identificada
      if (interactionData.caseArea && !currentPipeline.tags?.includes(interactionData.caseArea)) {
        const newTags = [...(currentPipeline.tags || []), interactionData.caseArea];
        updates.tags = newTags;
        updated = true;
        
        console.log('PIPELINE_AREA_UPDATED', {
          clientId: canonicalClientId,
          oldArea: currentPipeline.tags,
          newArea: newTags
        });
      }

      // Atualizar temperatura se for mais alta (conservador)
      if (interactionData.leadTemperature) {
        const tempOrder = { cold: 1, warm: 2, hot: 3 };
        const currentTemp = currentPipeline.lead_temperature;
        const newTemp = interactionData.leadTemperature;
        
        if (tempOrder[newTemp] > tempOrder[currentTemp as keyof typeof tempOrder]) {
          updates.lead_temperature = newTemp;
          updated = true;
          
          console.log('PIPELINE_TEMPERATURE_UPDATED', {
            clientId: canonicalClientId,
            oldTemperature: currentTemp,
            newTemperature: newTemp
          });
        }
      }

      // Atualizar notes com resumo da interação (opcional, apenas se não tiver notes)
      if (!currentPipeline.notes && interactionData.currentIntent) {
        updates.notes = `Interesse recente: ${interactionData.currentIntent}`;
        updated = true;
      }

      if (updated) {
        const { error } = await this.supabase
          .from('client_pipeline')
          .update(updates)
          .eq('client_id', canonicalClientId);

        if (error) {
          console.error('PIPELINE_UPDATE_ERROR', error);
          return false;
        }

        console.log('PIPELINE_UPDATED_FROM_INTERACTION', {
          clientId: canonicalClientId,
          updates: Object.keys(updates)
        });

        return true;
      }

      console.log('PIPELINE_STAGE_UNCHANGED', { reason: 'no_updates_needed' });
      return false;

    } catch (error) {
      console.error('PIPELINE_UPDATE_FROM_INTERACTION_ERROR', error);
      return false;
    }
  }

  // Formatar contexto para uso na IA (Fase 4.2)
  formatContextForAI(context: ClientContextForAI): string {
    const lines: string[] = [];
    
    lines.push('=== CLIENT_CONTEXT ===');
    
    // Informações do cliente
    lines.push(`CLIENTE:`);
    lines.push(`- ID: ${context.client.id}`);
    if (context.client.full_name) {
      lines.push(`- Nome: ${context.client.full_name}`);
    }
    lines.push(`- Tipo: ${context.client.is_client ? 'Cliente Existente' : 'Lead'}`);
    lines.push(`- Status: ${context.client.merge_status}`);
    
    // Pipeline
    if (context.pipeline) {
      lines.push(`\nPIPELINE:`);
      if (context.pipeline.stage) {
        lines.push(`- Estágio: ${context.pipeline.stage}`);
      }
      if (context.pipeline.lead_temperature) {
        lines.push(`- Temperatura: ${context.pipeline.lead_temperature}`);
      }
      if (context.pipeline.source_channel) {
        lines.push(`- Origem: ${context.pipeline.source_channel}`);
      }
      if (context.pipeline.area_interest) {
        lines.push(`- Área de Interesse: ${context.pipeline.area_interest}`);
      }
      if (context.pipeline.follow_up_status) {
        lines.push(`- Follow-up: ${context.pipeline.follow_up_status}`);
      }
      if (context.pipeline.last_contact_at) {
        lines.push(`- Último Contato: ${context.pipeline.last_contact_at}`);
      }
      if (context.pipeline.summary) {
        lines.push(`- Resumo: ${context.pipeline.summary}`);
      }
    }
    
    // Sessão atual
    if (context.session) {
      lines.push(`\nSESSÃO ATUAL:`);
      if (context.session.lead_stage) {
        lines.push(`- Estágio da Sessão: ${context.session.lead_stage}`);
      }
      if (context.session.case_area) {
        lines.push(`- Área do Caso: ${context.session.case_area}`);
      }
      if (context.session.current_intent) {
        lines.push(`- Intenção Atual: ${context.session.current_intent}`);
      }
      if (context.session.last_summary) {
        lines.push(`- Último Resumo: ${context.session.last_summary}`);
      }
    }
    
    // Canais
    if (context.channels.length > 0) {
      lines.push(`\nCANAIS:`);
      context.channels.forEach(channel => {
        lines.push(`- ${channel.channel}: ${channel.external_user_id} (${channel.last_contact_at})`);
      });
    }
    
    lines.push('=== END_CLIENT_CONTEXT ===');
    
    return lines.join('\n');
  }
}

export const clientContextService = new ClientContextService();
