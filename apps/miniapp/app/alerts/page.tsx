import { generatePositionView } from "@yield-copilot/agents";
import { AppShell } from "../../components/app-shell";
import { parseRecommendationInput } from "../../lib/request";

type AlertsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const parsed = parseRecommendationInput(await searchParams);
  const position = generatePositionView(parsed);

  return (
    <AppShell
      eyebrow="Alerts"
      title="Know when to revisit"
      intro="Monitoring should stay lightweight. Flag rate drift, exit friction, and moments where the original recommendation is no longer the best fit."
      step={{ current: 3, total: 3, label: "Monitoring" }}
    >
      <section className="panel stack-md">
        <p className="section-label">Active alerts</p>
        <h2>{position.venueLabel}</h2>
        <ul className="alert-card-list">
          {position.alerts.length > 0 ? (
            position.alerts.map((alert) => (
              <li key={alert.id}>
                <span className={`alert-dot ${alert.severity}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </li>
            ))
          ) : (
            <li>
              <span className="alert-dot info" />
              <div>
                <strong>No alerts</strong>
                <p>The current position still fits the original brief.</p>
              </div>
            </li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
