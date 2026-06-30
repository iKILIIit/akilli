"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STEPS = [
  {
    icon: "A",
    title: "Meet Akili",
    body: "Your AI financial copilot on Celo. Ask questions about your G$ wallet in plain language — works in any web browser.",
  },
  {
    icon: "📊",
    title: "Understand your money",
    body: "Akili reads your transaction history and turns it into clear spending advice, health scores, and summaries.",
  },
  {
    icon: "🔒",
    title: "Your data, secured",
    body: "Analysis happens on-demand. Your private key never leaves your device. Built on Celo.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  useEffect(() => {
    try { localStorage.setItem("akili_onboarded", "1"); } catch { /* ignore */ }
  }, []);

  function next() {
    if (step < STEPS.length - 1) {
      setDirection("forward");
      setLeaving(true);
      setTimeout(() => { setStep((s) => s + 1); setLeaving(false); }, 180);
    }
  }

  function prev() {
    if (step > 0) {
      setDirection("back");
      setLeaving(true);
      setTimeout(() => { setStep((s) => s - 1); setLeaving(false); }, 180);
    }
  }

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <main className="page-shell" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "32px" }}>

        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: "4px", borderRadius: "2px",
                width: i === step ? "28px" : "10px",
                background: i <= step ? "var(--ink)" : "var(--line-strong)",
                transition: "width 0.25s ease, background 0.2s"
              }}
            />
          ))}
        </div>

        <div
          style={{ opacity: leaving ? 0 : 1, transform: leaving ? `translateX(${direction === "forward" ? "20px" : "-20px"})` : "translateX(0)", transition: "opacity 0.18s, transform 0.18s", display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div style={{ fontSize: "48px", textAlign: "center" }}>{current.icon}</div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 700, color: "var(--ink)", textAlign: "center", margin: 0 }}>
            {current.title}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--ink-70)", lineHeight: 1.65, textAlign: "center", margin: 0 }}>
            {current.body}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              style={{ padding: "14px 20px", borderRadius: "12px", background: "transparent", color: "var(--ink-55)", border: "1px solid var(--line)", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
            >
              ←
            </button>
          )}
          {isLast ? (
            <Link
              href="/"
              className="dashboard-primary-link"
              style={{ flex: 1, justifyContent: "center", padding: "14px 28px", borderRadius: "12px", background: "var(--ink)", color: "var(--surface)", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}
            >
              Get started
            </Link>
          ) : (
            <button
              type="button"
              onClick={next}
              style={{ flex: 1, padding: "14px 28px", borderRadius: "12px", background: "var(--ink)", color: "var(--surface)", border: "none", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
            >
              Next
            </button>
          )}
        </div>

        {!isLast && (
          <Link href="/" style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--ink-40)", textDecoration: "none" }}>
            Skip
          </Link>
        )}
      </div>
    </main>
  );
}
