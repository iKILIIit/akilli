import Link from "next/link";
import { generatePositionView, generateRecommendation } from "@yield-copilot/agents";
import { AppShell } from "../../components/app-shell";
import { PositionTracker } from "../../components/position-tracker";
import { parseRecommendationInput } from "../../lib/request";

type PositionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PositionPage({ searchParams }: PositionPageProps) {
  const parsed = parseRecommendationInput(await searchParams);
  const recommendation = generateRecommendation(parsed);
  const position = generatePositionView(parsed);
  const alertParams = new URLSearchParams({
    token: parsed.token,
    amount: parsed.amount,
    goal: parsed.goal,
    timeHorizonDays: String(parsed.timeHorizonDays),
    riskComfort: parsed.riskComfort
  });

  return (
    <AppShell
      eyebrow="Active position"
      title="Your position at a glance"
      intro="Once a deposit is approved, the app should keep the state simple: current venue, current yield, and whether any action is needed."
      step={{ current: 3, total: 3, label: "Monitoring" }}
    >
      <section className="panel hero-metric-card">
        <p className="section-label">Current position</p>
        <h2>{position.venueLabel}</h2>
        <div className="metric-row">
          <div>
            <span>Amount</span>
            <strong>
              {position.amount} {position.token}
            </strong>
          </div>
          <div>
            <span>Current APY</span>
            <strong>{position.currentApy.toFixed(2)}%</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{position.status}</strong>
          </div>
        </div>
        <p>{recommendation.recommended.summary}</p>
      </section>

      <section className="panel brief-card">
        <p className="section-label">Original brief</p>
        <div className="brief-chip-row">
          <span className="brief-chip">{parsed.goal}</span>
          <span className="brief-chip">
            {parsed.amount} {parsed.token}
          </span>
          <span className="brief-chip">{parsed.timeHorizonDays} day horizon</span>
        </div>
      </section>

      <PositionTracker serverPosition={position} />

      <section className="panel stack-md">
        <p className="section-label">Monitoring rules</p>
        <ul className="timeline-list">
          {position.alerts.length > 0 ? (
            position.alerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
              </li>
            ))
          ) : (
            <li>
              <strong>No active alerts</strong>
              <p>This venue still fits the original goal and liquidity needs.</p>
            </li>
          )}
        </ul>
        <div className="action-row">
          <Link href={`/alerts?${alertParams.toString()}`} className="primary-action">
            View alerts
          </Link>
          <Link href="/recommendation" className="secondary-action">
            Back to result
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
