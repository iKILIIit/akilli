import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniPay Yield Copilot",
  description: "MiniPay-first guidance for deciding where to park idle stablecoins."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
