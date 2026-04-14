import { requireProfile } from "@/lib/auth/guards";

import { ConversationInboxDashboard } from "./dashboard";

export default async function InternalConversationInboxPage() {
  await requireProfile(["advogada", "admin"]);

  return <ConversationInboxDashboard />;
}
