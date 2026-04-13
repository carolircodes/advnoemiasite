"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const noemia_core_1 = require("../lib/ai/noemia-core");
const channel_conversation_policy_1 = require("../lib/services/channel-conversation-policy");
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
    let conversationState;
    for (const [index, message] of messages.entries()) {
        const result = await (0, noemia_core_1.processNoemiaCore)({
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
        const fakeSession = {
            id: "validation-session",
            channel: "whatsapp",
            external_user_id: "validation-user",
            lead_stage: "initial",
            current_intent: "conversation",
            handoff_to_human: false,
            metadata: {
                conversation_state: conversationState
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const policy = (0, channel_conversation_policy_1.evaluateConversationPolicy)({
            channel: "whatsapp",
            session: fakeSession,
            conversationState: conversationState || null,
            messageText: message
        });
        console.log(JSON.stringify({
            step: index + 1,
            message,
            replyPreview: result.reply.slice(0, 120),
            conversationStatus: conversationState?.conversationStatus || null,
            triageStage: conversationState?.triageStage || null,
            consultationStage: conversationState?.consultationStage || null,
            readyForHandoff: conversationState?.readyForHandoff || false,
            policyState: policy.state,
            handoffAllowed: policy.handoffAllowed,
            handoffBlocked: policy.handoffBlocked,
            schedulingComplete: policy.schedulingComplete
        }));
    }
}
void main();
