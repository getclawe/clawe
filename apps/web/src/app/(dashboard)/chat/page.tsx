import { Chat } from "@/components/chat";

// Use the full agent session key format for consistency with OpenClaw
const SESSION_KEY = "agent:main:main";

export default function ChatPage() {
  return <Chat sessionKey={SESSION_KEY} mode="full" className="h-full" />;
}
