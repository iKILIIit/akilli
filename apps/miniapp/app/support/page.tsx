import { SUPPORT_EMAIL } from "@yield-copilot/shared";
import { AppShell } from "../../components/app-shell";

export default function SupportPage() {
  return (
    <AppShell
      eyebrow="Support"
      title="Support contact"
      intro="MiniPay submission requires an obvious support path. This scaffold keeps it visible from day one."
    >
      <section className="panel stack-md">
        <p>Email support: {SUPPORT_EMAIL}</p>
        <p>Response goal: within one business day for execution and venue availability issues.</p>
      </section>
    </AppShell>
  );
}
