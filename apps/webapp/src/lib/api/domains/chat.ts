import { clientApiJson } from "@/lib/api/client";

export async function createChatSession(): Promise<string> {
  const { data } = await clientApiJson<{ data: { id: string } }>("/api/chat/sessions", {
    method: "POST",
  });
  if (!data?.id) throw new Error("Chat session was created but response did not include id");
  return data.id;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await clientApiJson(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
}
