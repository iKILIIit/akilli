import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akili Copilot — AI Wallet Chat",
  description: "Chat with your AI financial copilot. Get spending advice, wallet audits, health scores, and formal statements.",
};

export default function CopilotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
