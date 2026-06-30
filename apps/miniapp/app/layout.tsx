import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "../components/toast";
import { ServiceWorkerRegistrar } from "../components/service-worker-registrar";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Akili — AI Financial Copilot on Celo",
  description:
    "Your AI financial copilot for G$ and the web. Analyze wallet spending, audit activity, set budget alerts, and get a personalized financial health score — all on Celo.",
  manifest: "/manifest.json",
  keywords: ["G$", "Celo", "DeFi", "AI", "financial copilot", "USDC", "USDT", "wallet analysis"],
  openGraph: {
    title: "Akili — AI Financial Copilot on Celo",
    description: "AI-powered wallet analysis for G$ and the web. Spending advice, health scores, and budget alerts.",
    url: "https://akilii-minipay.vercel.app",
    siteName: "Akili",
    type: "website",
    images: [{ url: "https://akilii-minipay.vercel.app/og.png", width: 1200, height: 630, alt: "Akili AI Financial Copilot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Akili — AI Financial Copilot on Celo",
    description: "AI-powered wallet analysis for G$ and the web. Spending advice, health scores, and budget alerts.",
    images: ["https://akilii-minipay.vercel.app/og.png"],
  },
  other: {
    "talentapp:project_verification":
      "498ae78c26111ee7ebbbfd03df60200926d9e23df2de6d1d70f3e72ced631dfeee6f9926665d80e9ac4ba0d1674139043d4f8eac967234569d2fc4955269b717",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <ToastContainer />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
