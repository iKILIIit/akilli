import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spending Alerts — Akili",
  description: "Set spending caps, savings goals, and yield targets that notify you when triggered.",
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
