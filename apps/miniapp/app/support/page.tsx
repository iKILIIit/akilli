import { AppShell } from "../../components/app-shell";

export default function SupportPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@yieldcopilot.app";

  return (
    <AppShell
      eyebrow="Support"
      title="Support contact"
      intro="MiniPay submission requires an obvious support path. This scaffold keeps it visible from day one."
    >
      <section className="panel stack-md">
        <p>Email support: {supportEmail}</p>
        <p>Response goal: within one business day for execution and venue availability issues.</p>
      </section>
    </AppShell>
  );
}
