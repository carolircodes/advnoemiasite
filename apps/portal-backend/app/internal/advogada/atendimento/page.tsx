import { requireProfile } from "@/lib/auth/guards";
import { conversationInboxService } from "@/lib/services/conversation-inbox";

import { ConversationInboxDashboard } from "./dashboard";

export default async function InternalConversationInboxPage() {
  await requireProfile(["advogada", "admin"]);

  let initialPayload = null;
  let initialSelectedThreadId: string | null = null;

  try {
    const initialList = await conversationInboxService.listThreads({});
    initialSelectedThreadId = initialList.threads[0]?.id || null;
    const initialSelectedThread = initialSelectedThreadId
      ? await conversationInboxService.getThreadDetail(initialSelectedThreadId)
      : null;

    initialPayload = JSON.parse(
      JSON.stringify({
        ...initialList,
        selectedThread: initialSelectedThread
      })
    );
  } catch (error) {
    console.error("[internal.atendimento.page] SSR preload failed", {
      message: error instanceof Error ? error.message : String(error),
      selectedThreadId: initialSelectedThreadId
    });
  }

  return (
    <ConversationInboxDashboard
      initialPayload={initialPayload}
      initialSelectedThreadId={initialSelectedThreadId}
    />
  );
}
