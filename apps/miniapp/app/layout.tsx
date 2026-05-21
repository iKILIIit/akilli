import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "../components/toast";
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
  title: "Akili — AI Financial Copilot",
  description:
    "AI-powered financial intelligence for MiniPay users. Analyze spending, audit your wallet, and get a personalized financial health score.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Akili — AI Financial Copilot",
    description: "AI-powered financial intelligence for MiniPay users on Celo.",
    url: "https://akilii-minipay.vercel.app",
    siteName: "Akili",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Akili — AI Financial Copilot",
    description: "AI-powered financial intelligence for MiniPay users on Celo."
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
      </body>
    </html>
  );
}
