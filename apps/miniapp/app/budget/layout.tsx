import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spend Sheet — Akili",
  description: "View your stablecoin spending, transaction history, and budget breakdown on Celo.",
};

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
