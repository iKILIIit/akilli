import Link from "next/link";
import { generateRecommendation } from "@yield-copilot/agents";
import { AppShell } from "../../components/app-shell";
import { VenueCard } from "../../components/venue-card";
import { parseRecommendationInput } from "../../lib/request";

type RecommendationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecommendationPage({
  searchParams
}: RecommendationPageProps) {
  const parsed = parseRecommendationInput(await searchParams);
  const recommendation = generateRecommendation(parsed);
  const nextParams = new URLSearchParams({
    token: parsed.token,
    amount: parsed.amount,
    goal: parsed.goal,
    timeHorizonDays: String(parsed.timeHorizonDays),
    riskComfort: parsed.riskComfort
  });

  return (
    <AppShell
      eyebrow="Recommendation"
      title="Your best fit right now"
      intro="This ranking stays deterministic. It weighs liquidity, current yield, risk comfort, and whether the route stays close to MiniPay."
      step={{ current: 2, total: 3, label: "Decision" }}
    >
      <section className="panel brief-card">
        <p className="section-label">Your brief</p>
        <div className="brief-chip-row">
          <span className="brief-chip">{parsed.goal}</span>
          <span className="brief-chip">
            {parsed.amount} {parsed.token}
          </span>
          <span className="brief-chip">{parsed.timeHorizonDays} days</span>
          <span className="brief-chip">{parsed.riskComfort} risk comfort</span>
        </div>
      </section>

      <VenueCard heading="Top pick" venue={recommendation.recommended} featured />
      <VenueCard heading="Backup option" venue={recommendation.backup} />

      <section className="panel stack-md">
        <p className="section-label">Why this wins</p>
        <ul className="bullet-list">
          {recommendation.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel stack-md">
        <p className="section-label">Execution plan</p>
        <h2>{recommendation.executionPlan.cta}</h2>
        <ul className="timeline-list">
          {recommendation.executionPlan.steps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </li>
          ))}
        </ul>
        <div className="action-row">
          <Link href={`/position?${nextParams.toString()}`} className="primary-action">
            Continue
          </Link>
          <Link href="/" className="secondary-action">
            Change inputs
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
