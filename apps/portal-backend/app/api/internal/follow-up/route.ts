import { NextRequest, NextResponse } from 'next/server';
import { requireInternalApiProfile } from "@/lib/auth/guards";
import { followUpEngine } from "@/lib/services/follow-up-engine";

export async function POST(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    
    const { action, clientId, pipelineId, channel, messageType, scheduledFor, followUpMessageId, status, limit } = body;

    if (action === 'getEligible') {
      // Listar clientes elegíveis para follow-up
      const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit || 20);
      
      return NextResponse.json({
        success: true,
        data: eligibleClients,
        count: eligibleClients.length
      });
    } else if (action === 'generateMessage') {
      // Gerar mensagem de follow-up
      if (!clientId || !pipelineId || !channel) {
        return NextResponse.json(
          { error: 'clientId, pipelineId, and channel are required for generateMessage action' },
          { status: 400 }
        );
      }

      const message = await followUpEngine.generateFollowUpMessageForClient({
        clientId,
        pipelineId,
        channel,
        messageType
      });

      if (!message) {
        return NextResponse.json(
          { error: 'Failed to generate follow-up message' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: message
      });

    } else if (action === 'scheduleFollowUp') {
      // Agendar follow-up
      if (!clientId || !pipelineId || !channel || !messageType || !scheduledFor) {
        return NextResponse.json(
          { error: 'clientId, pipelineId, channel, messageType, and scheduledFor are required for scheduleFollowUp action' },
          { status: 400 }
        );
      }

      const scheduled = await followUpEngine.scheduleFollowUpForClient({
        clientId,
        pipelineId,
        channel,
        messageType,
        scheduledFor: new Date(scheduledFor)
      });

      return NextResponse.json({
        success: scheduled,
        message: scheduled ? 'Follow-up scheduled successfully' : 'Failed to schedule follow-up'
      });

    } else if (action === 'markResult') {
      // Marcar resultado do follow-up
      if (!followUpMessageId || !status) {
        return NextResponse.json(
          { error: 'followUpMessageId and status are required for markResult action' },
          { status: 400 }
        );
      }

      const updated = await followUpEngine.markFollowUpResult({
        followUpMessageId,
        status,
        errorMessage: body.errorMessage
      });

      return NextResponse.json({
        success: updated,
        message: updated ? 'Follow-up result updated successfully' : 'Failed to update follow-up result'
      });

    } else if (action === 'saveMessage') {
      // Salvar mensagem gerada
      if (!clientId || !pipelineId || !channel || !messageType || !body.content) {
        return NextResponse.json(
          { error: 'clientId, pipelineId, channel, messageType, and content are required for saveMessage action' },
          { status: 400 }
        );
      }

      const messageId = await followUpEngine.saveFollowUpMessage({
        clientId,
        pipelineId,
        channel,
        messageType,
        content: body.content,
        status: body.status
      });

      if (!messageId) {
        return NextResponse.json(
          { error: 'Failed to save follow-up message' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { messageId }
      });

    } else if (action === 'getPriority') {
      // Listar follow-ups prioritários
      const priorityFollowUps = await followUpEngine.getPriorityFollowUps(limit || 20);
      
      return NextResponse.json({
        success: true,
        data: priorityFollowUps,
        count: priorityFollowUps.length
      });

    } else if (action === 'getScheduled') {
      // Listar follow-ups agendados
      const scheduledFollowUps = await followUpEngine.getScheduledFollowUps(limit || 50);
      
      return NextResponse.json({
        success: true,
        data: scheduledFollowUps,
        count: scheduledFollowUps.length
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: getEligible, generateMessage, scheduleFollowUp, markResult, saveMessage, getPriority, getScheduled' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('FOLLOW_UP_API_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET para consultas
export async function GET(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (action === 'getEligible') {
      const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit);
      
      return NextResponse.json({
        success: true,
        data: eligibleClients,
        count: eligibleClients.length
      });
    } else if (action === 'getPriority') {
      const priorityFollowUps = await followUpEngine.getPriorityFollowUps(limit);
      
      return NextResponse.json({
        success: true,
        data: priorityFollowUps,
        count: priorityFollowUps.length
      });
    } else if (action === 'getScheduled') {
      const scheduledFollowUps = await followUpEngine.getScheduledFollowUps(limit);
      
      return NextResponse.json({
        success: true,
        data: scheduledFollowUps,
        count: scheduledFollowUps.length
      });
    } else {
      // Default: listar elegíveis
      const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit);
      
      return NextResponse.json({
        success: true,
        data: eligibleClients,
        count: eligibleClients.length
      });
    }
  } catch (error) {
    console.error('FOLLOW_UP_API_GET_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
