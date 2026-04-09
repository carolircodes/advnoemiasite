import { NextRequest, NextResponse } from 'next/server';
import { operationalPanel } from "@/lib/services/operational-panel";
import { assistedFollowUpService } from "@/lib/services/assisted-follow-up";
import { followUpResponseHandler } from "@/lib/services/follow-up-response-handler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { action, clientId, pipelineId, filters, limit, offset, actionType, value, notes, channel, content, approvedBy, followUpMessageId } = body;

    if (action === 'getPanelData') {
      // Obter dados completos do painel
      const panelData = await operationalPanel.getPanelData(filters || {}, limit || 50, offset || 0);
      
      return NextResponse.json({
        success: true,
        data: panelData
      });

    } else if (action === 'getContacts') {
      // Listar contatos operacionais
      const contactsResult = await operationalPanel.getOperationalContacts(filters || {}, limit || 50, offset || 0);
      
      return NextResponse.json({
        success: true,
        data: contactsResult
      });

    } else if (action === 'getMetrics') {
      // Obter métricas operacionais
      const metrics = await operationalPanel.getOperationalMetrics();
      
      return NextResponse.json({
        success: true,
        data: metrics
      });

    } else if (action === 'applyAction') {
      // Aplicar ação operacional
      if (!clientId || !pipelineId || !actionType) {
        return NextResponse.json(
          { error: 'clientId, pipelineId, and actionType are required for applyAction' },
          { status: 400 }
        );
      }

      const success = await operationalPanel.applyOperationalAction({
        clientId,
        pipelineId,
        action: actionType,
        value,
        notes
      });

      return NextResponse.json({
        success,
        message: success ? 'Action applied successfully' : 'Failed to apply action'
      });

    } else if (action === 'generateSuggestedMessage') {
      // Gerar mensagem sugerida para um contato específico
      if (!clientId || !pipelineId) {
        return NextResponse.json(
          { error: 'clientId and pipelineId are required for generateSuggestedMessage' },
          { status: 400 }
        );
      }

      // Buscar dados do contato para determinar o canal
      const contactsResult = await operationalPanel.getOperationalContacts(
        { search: clientId }, 
        1, 
        0
      );

      if (contactsResult.contacts.length === 0) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        );
      }

      const contact = contactsResult.contacts[0];
      
      return NextResponse.json({
        success: true,
        data: {
          suggestedMessage: contact.suggestedMessage,
          contact: {
            clientId: contact.clientId,
            fullName: contact.fullName,
            pipelineStage: contact.pipelineStage,
            leadTemperature: contact.leadTemperature,
            priorityLabel: contact.priorityLabel
          }
        }
      });

    } else if (action === 'sendAssistedFollowUp') {
      // Enviar follow-up assistido
      if (!clientId || !pipelineId || !channel || !content || !approvedBy) {
        return NextResponse.json(
          { error: 'clientId, pipelineId, channel, content, and approvedBy are required for sendAssistedFollowUp' },
          { status: 400 }
        );
      }

      const result = await assistedFollowUpService.sendAssistedFollowUp({
        clientId,
        pipelineId,
        channel,
        content,
        approvedBy,
        followUpMessageId
      });

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? 'Follow-up enviado com sucesso' : 'Falha ao enviar follow-up'
      });

    } else if (action === 'getClientChannels') {
      // Obter canais disponíveis para um cliente
      if (!clientId) {
        return NextResponse.json(
          { error: 'clientId is required for getClientChannels' },
          { status: 400 }
        );
      }

      const channelsResult = await assistedFollowUpService.getClientAvailableChannels(clientId);
      
      return NextResponse.json({
        success: channelsResult.success,
        data: channelsResult.channels,
        error: channelsResult.error
      });

    } else if (action === 'getFollowUpMetrics') {
      // Obter métricas de follow-up
      const stats = await followUpResponseHandler.getFollowUpResponseStats(clientId);
      
      return NextResponse.json({
        success: true,
        data: stats
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: getPanelData, getContacts, getMetrics, applyAction, generateSuggestedMessage, sendAssistedFollowUp, getClientChannels, getFollowUpMetrics' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('OPERATIONAL_PANEL_API_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET para consultas simples
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'getPanelData';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Extrair filtros
    const filters: any = {};
    const stage = searchParams.get('stage');
    const leadTemperature = searchParams.get('leadTemperature');
    const areaInterest = searchParams.get('areaInterest');
    const sourceChannel = searchParams.get('sourceChannel');
    const priorityLabel = searchParams.get('priorityLabel');
    const followUpStatus = searchParams.get('followUpStatus');
    const isClient = searchParams.get('isClient');
    const search = searchParams.get('search');

    if (stage) filters.stage = stage;
    if (leadTemperature) filters.leadTemperature = leadTemperature;
    if (areaInterest) filters.areaInterest = areaInterest;
    if (sourceChannel) filters.sourceChannel = sourceChannel;
    if (priorityLabel) filters.priorityLabel = priorityLabel;
    if (followUpStatus) filters.followUpStatus = followUpStatus;
    if (isClient) filters.isClient = isClient === 'true';
    if (search) filters.search = search;

    if (action === 'getPanelData') {
      const panelData = await operationalPanel.getPanelData(filters, limit, offset);
      
      return NextResponse.json({
        success: true,
        data: panelData
      });

    } else if (action === 'getContacts') {
      const contactsResult = await operationalPanel.getOperationalContacts(filters, limit, offset);
      
      return NextResponse.json({
        success: true,
        data: contactsResult
      });

    } else if (action === 'getMetrics') {
      const metrics = await operationalPanel.getOperationalMetrics();
      
      return NextResponse.json({
        success: true,
        data: metrics
      });

    } else {
      // Default: retornar dados completos do painel
      const panelData = await operationalPanel.getPanelData(filters, limit, offset);
      
      return NextResponse.json({
        success: true,
        data: panelData
      });
    }
  } catch (error) {
    console.error('OPERATIONAL_PANEL_API_GET_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
