import { ChatSessionLoader } from "../ChatSessionLoader";

/**
 * Dynamic chat session page — loads existing messages and renders the chat view.
 */
export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ChatSessionLoader sessionId={sessionId} />;
}
