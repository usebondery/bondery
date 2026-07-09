import { ChatClient } from "./ChatClient";

/**
 * Chat index page — shows an empty chat interface.
 * A new session is only created when the user sends their first message.
 */
export default function ChatPage() {
  return <ChatClient key="new-chat" />;
}
