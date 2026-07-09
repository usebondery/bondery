import { ChatView } from "./components/ChatView";

/**
 * Chat index page — shows an empty chat interface.
 * A new session is only created when the user sends their first message.
 */
export default function ChatPage() {
  return <ChatView key="new-chat" />;
}
