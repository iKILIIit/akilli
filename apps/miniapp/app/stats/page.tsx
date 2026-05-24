import Link from "next/link";
import { BackButton, HeaderBar, ScreenFrame } from "../../components/screen-frame";

function StatRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="list-card__row">
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: "0.82rem" }}>{label}</strong>
        {note ? <p style={{ fontSize: "0.72rem", color: "var(--ink-55)", margin: "2px 0 0" }}>{note}</p> : null}
      </div>
      <span style={{ fontSize: "0.82rem", fontVariantNumeric: "tabular-nums", color: "var(--ink-80)" }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="screen-section">
      <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
        <p className="section-label">{title}</p>
      </div>
      <div className="list-card">{children}</div>
    </section>
  );
}

export default function StatsPage() {
  return (
    <ScreenFrame>
      <HeaderBar left={<BackButton href="/" />} title="App Stats" subtle="Public" />

      <section className="screen-copy-block screen-copy-block--no-step">
        <h1 className="screen-copy-block__title">Akili — Usage Stats</h1>
        <p className="screen-copy-block__body">
          Read-only. No wallet required. Refreshed daily.
        </p>
      </section>

      <Section title="Engagement">
        <StatRow label="DAU" value="—" note="Wiring PostHog · available after launch" />
        <StatRow label="MAU" value="—" note="Wiring PostHog · available after launch" />
        <StatRow label="D1 retention" value="—" note="Cohort data accumulates post-launch" />
        <StatRow label="D7 retention" value="—" />
        <div className="list-card__row list-card__row--last">
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.82rem" }}>Top countries</strong>
            <p style={{ fontSize: "0.72rem", color: "var(--ink-55)", margin: "2px 0 0" }}>Per MiniPay availability regions</p>
          </div>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-80)" }}>—</span>
        </div>
      </Section>

      <Section title="On-chain activity">
        <StatRow
          label="App type"
          value="Read-only AI Copilot"
          note="No smart contracts — no on-chain footprint from Akili itself"
        />
        <StatRow
          label="Wallets analysed (lifetime)"
          value="—"
          note="Tracked via API request log · wiring Plausible"
        />
        <StatRow
          label="Reports generated"
          value="—"
          note="Spending advice · wallet audit · statements · account summary"
        />
        <div className="list-card__row list-card__row--last">
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.82rem" }}>Failed requests</strong>
            <p style={{ fontSize: "0.72rem", color: "var(--ink-55)", margin: "2px 0 0" }}>
              API error rate (target &lt; 1 %)
            </p>
          </div>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-80)" }}>—</span>
        </div>
      </Section>

      <Section title="Network manifest">
        <StatRow label="Celo RPC" value="forno.celo.org" note="Balance lookups" />
        <StatRow label="Celoscan API" value="api.celoscan.io" note="Transaction history" />
        <StatRow label="Linkup API" value="api.linkup.so" note="Contract + token research" />
        <StatRow label="OpenRouter API" value="openrouter.ai" note="AI responses via DeepSeek (server-side only)" />
        <div className="list-card__row list-card__row--last">
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.82rem" }}>Fonts / assets</strong>
            <p style={{ fontSize: "0.72rem", color: "var(--ink-55)", margin: "2px 0 0" }}>Self-hosted · no external CDN</p>
          </div>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-80)" }}>None</span>
        </div>
      </Section>

      <section className="screen-section">
        <div className="support-links-card">
          <Link
            href="/support"
            className="support-links-card__row support-links-card__row--last"
          >
            <div>
              <strong>Support</strong>
              <p>Questions, bugs, or SLA issues</p>
            </div>
            <span>→</span>
          </Link>
        </div>
      </section>
    </ScreenFrame>
  );
}
