import Link from "next/link";
import { APP_NAME } from "@yield-copilot/shared";
import { AppShell } from "../components/app-shell";
import { IntakeForm } from "../components/intake-form";
import { MiniPayGate } from "../components/minipay-gate";

export default function HomePage() {
  return (
    <AppShell
      eyebrow="MiniPay-first savings guidance"
      title="Find the best home for idle stablecoins"
      intro="Answer three quick questions and get one clear MiniPay-friendly move instead of a protocol list."
      aside={<MiniPayGate />}
      step={{ current: 1, total: 3, label: "Intake" }}
    >
      <section className="panel app-overview-card">
        <div>
          <p className="section-label">How it works</p>
          <h2>{APP_NAME}</h2>
        </div>
        <div className="summary-grid soft">
          <div>
            <span>1</span>
            <strong>Set your goal</strong>
          </div>
          <div>
            <span>2</span>
            <strong>Review the best fit</strong>
          </div>
          <div>
            <span>3</span>
            <strong>Take action in MiniPay</strong>
          </div>
        </div>
      </section>

      <IntakeForm />

      <section className="panel mini-feature-list">
        <div className="mini-feature-item">
          <p className="section-label">Decision style</p>
          <strong>Risk before APY</strong>
        </div>
        <div className="mini-feature-item">
          <p className="section-label">Coverage</p>
          <strong>MiniPay-first venues</strong>
        </div>
        <div className="mini-feature-item">
          <p className="section-label">Output</p>
          <strong>One answer and one backup</strong>
        </div>
        <div className="foot-links">
          <Link href="/legal/terms" className="secondary-action">
            Terms
          </Link>
          <Link href="/legal/privacy" className="secondary-action">
            Privacy
          </Link>
          <Link href="/support" className="secondary-action">
            Support
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
