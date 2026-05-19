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
        width: "64px",
        height: "64px",
        borderRadius: "20px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        fontFamily: "var(--slab)",
        fontWeight: 700,
        color: "var(--green)"
      }}>
        A
      </div>
      <h1 style={{ fontFamily: "var(--slab)", fontSize: "1.5rem", color: "var(--ink)", margin: 0 }}>
        Page not found
      </h1>
      <p style={{ color: "var(--ink-55)", fontSize: "0.95rem", maxWidth: "280px", margin: 0 }}>
        This page doesn't exist. Head back to Akili to check your wallet.
      </p>
      <Link href="/" className="primary-action" style={{ marginTop: "8px", textDecoration: "none" }}>
        Back to Akili
      </Link>
    </div>
  );
}
