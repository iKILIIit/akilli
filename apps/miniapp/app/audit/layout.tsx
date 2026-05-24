import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet Audit Trail — Akili",
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
