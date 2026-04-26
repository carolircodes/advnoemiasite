import { processNoemiaCore, type ConversationState } from "../lib/ai/noemia-core.ts";
import { evaluateConversationPolicy } from "../lib/services/channel-conversation-policy.ts";
import type { ConversationSession } from "../lib/services/conversation-persistence.ts";

function buildSession(
  conversationState: ConversationState | null,
  handoffToHuman = false,
  lawyerNotificationGenerated = false
): ConversationSession {
  return {
    id: "validation-session",
    channel: "whatsapp",
    external_user_id: "validation-user",
    lead_stage: "initial",
    current_intent: "conversation",
    handoff_to_human: handoffToHuman,
    metadata: {
      conversation_state: conversationState,
      lawyer_notification_generated: lawyerNotificationGenerated,
      operational_handoff_recorded: handoffToHuman || lawyerNotificationGenerated,
      ai_active_on_channel: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function runFlow(messages: string[]) {
  let conversationState: ConversationState | undefined;

  for (const [index, message] of messages.entries()) {
    const result = await processNoemiaCore({
      channel: "whatsapp",
      userType: "visitor",
      message,
      history: [],
      metadata: {
        sessionId: "validation-session",
        userId: "validation-user",
        eventId: `validation-${index + 1}`
      },
      conversationState
    });

    conversationState = result.metadata.conversationState;

    const fakeSession = buildSession(conversationState || null);
    const policy = evaluateConversationPolicy({
      channel: "whatsapp",
      session: fakeSession,
      conversationState: conversationState || null,
      messageText: message
    });

    console.log(
      JSON.stringify({
        step: index + 1,
        phase: "pre_handoff",
        message,
        replyPreview: result.reply.slice(0, 140),
        conversationStatus: conversationState?.conversationStatus || null,
        explanationStage: conversationState?.explanationStage || null,
        triageStage: conversationState?.triageStage || null,
        consultationStage: conversationState?.consultationStage || null,
        readyForHandoff: conversationState?.readyForHandoff || false,
        policyState: policy.state,
        handoffAllowed: policy.handoffAllowed,
        handoffBlocked: policy.handoffBlocked,
        aiActiveOnChannel: policy.aiActiveOnChannel,
        schedulingComplete: policy.schedulingComplete
      })
    );
  }

  return conversationState || null;
}

async function runPostHandoffValidation(conversationState: ConversationState | null) {
  const postHandoffMessage = "Tenho mais uma dúvida: quais documentos devo separar antes da consulta?";
  const result = await processNoemiaCore({
    channel: "whatsapp",
    userType: "visitor",
    message: postHandoffMessage,
    history: [],
    metadata: {
      sessionId: "validation-session",
      userId: "validation-user",
      eventId: "validation-post-handoff"
    },
    conversationState: conversationState || undefined
  });

  const fakeSession = buildSession(result.metadata.conversationState || conversationState, true, true);
  const policy = evaluateConversationPolicy({
    channel: "whatsapp",
    session: fakeSession,
    conversationState: result.metadata.conversationState || conversationState,
    messageText: postHandoffMessage
  });

  console.log(
    JSON.stringify({
      phase: "post_handoff",
      message: postHandoffMessage,
      replyPreview: result.reply.slice(0, 180),
      policyState: policy.state,
      handoffAllowed: policy.handoffAllowed,
      operationalHandoffRecorded: policy.operationalHandoffRecorded,
      lawyerNotificationGenerated: policy.lawyerNotificationGenerated,
      aiActiveOnChannel: policy.aiActiveOnChannel,
      aiShouldRespond: policy.aiShouldRespond,
      humanFollowUpPending: policy.humanFollowUpPending
    })
  );
}

async function main() {
  const messages = [
    "Oi, preciso de ajuda com um desconto indevido no meu benefício.",
    "Isso começou há 3 meses e continua acontecendo agora.",
    "Tenho extratos e notificações do banco.",
    "Quero resolver isso e entender se tenho direito.",
    "É urgente porque continuam descontando todo mês.",
    "Quero agendar uma consulta.",
    "Prefiro quinta à tarde e o melhor canal pra mim é WhatsApp."
  ];

  const finalState = await runFlow(messages);
  await runPostHandoffValidation(finalState);
}

void main();
