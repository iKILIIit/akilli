import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      background: "var(--bg)",
      textAlign: "center",
      gap: "16px"
    }}>
      <div style={{
        width: "72px",
        height: "72px",
        borderRadius: "22px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: 800,
        color: "var(--green)",
        boxShadow: "var(--shadow)"
      }}>
        A
      </div>
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>404</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Page not found
        </h1>
        <p style={{ color: "var(--ink-55)", fontSize: "0.95rem", maxWidth: "26ch", margin: "0 auto", lineHeight: 1.55 }}>
          This page doesn&apos;t exist. Head back to Akili to check your wallet.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "280px" }}>
        <Link href="/" className="primary-action" style={{ textDecoration: "none" }}>
          Back to Akili
        </Link>
        <Link href="/copilot" style={{ textAlign: "center", fontSize: "13px", color: "var(--ink-55)", textDecoration: "none", padding: "4px" }}>
          Open Copilot →
        </Link>
      </div>
    </div>
  );
}
