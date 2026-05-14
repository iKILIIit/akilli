import Link from "next/link";
import { generateRecommendation } from "@yield-copilot/agents";
import { cx } from "@yield-copilot/ui";
import { AppShell } from "../../components/app-shell";
import { VenueCard } from "../../components/venue-card";
import { parseRecommendationInput } from "../../lib/request";

type RecommendationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const confidenceToneClassNames = {
  "Strong fit": "decision-pill-strong",
  "Good fit": "decision-pill-good",
  "Hold for now": "decision-pill-hold"
} as const;

function formatUnits(amount: number) {
  return amount.toFixed(2);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

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
  const alternatives = recommendation.consideredVenues.slice(1);

  return (
    <AppShell
      eyebrow="Recommendation"
      title={
        recommendation.recommendedAction === "stay-liquid"
          ? "Stay liquid for now"
          : "Your best fit right now"
      }
      intro="This result weighs expected net gain, exit friction, risk comfort, and whether the path stays close to MiniPay before it recommends any move."
      step={{ current: 2, total: 3, label: "Decision" }}
    >
      <section className="panel decision-summary-card stack-md">
        <div className="row-between">
          <div className="stack-sm">
            <p className="section-label">Decision stance</p>
            <h2>{recommendation.decisionSummary}</h2>
          </div>
          <span
            className={cx(
              "decision-pill",
              confidenceToneClassNames[recommendation.confidence]
            )}
          >
            {recommendation.confidence}
          </span>
        </div>

        <div className="metric-row metric-row-wide">
          <div>
            <span>Recommended action</span>
            <strong>
              {recommendation.recommendedAction === "stay-liquid"
                ? "Stay in MiniPay"
                : recommendation.recommended.label}
            </strong>
          </div>
          <div>
            <span>{parsed.timeHorizonDays}d net</span>
            <strong>{formatUnits(recommendation.recommended.estimatedNetReturn)} {parsed.token}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{formatTimestamp(recommendation.generatedAt)}</strong>
          </div>
        </div>
      </section>

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

      <VenueCard
        heading="Top pick"
        venue={recommendation.recommended}
        timeHorizonDays={parsed.timeHorizonDays}
        featured
      />
      <VenueCard
        heading="Backup option"
        venue={recommendation.backup}
        timeHorizonDays={parsed.timeHorizonDays}
      />

      <section className="panel stack-md">
        <p className="section-label">Why this wins</p>
        <ul className="bullet-list">
          {recommendation.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {alternatives.length > 0 ? (
        <section className="panel stack-md">
          <p className="section-label">Why not the others</p>
          <div className="comparison-list">
            {alternatives.map((venue) => (
              <article key={venue.id} className="comparison-card">
                <div className="row-between">
                  <div>
                    <strong>{venue.label}</strong>
                    <p>{venue.tradeoffSummary}</p>
                  </div>
                  <span className="comparison-score">{venue.score.toFixed(2)}</span>
                </div>
                <div className="comparison-metrics">
                  <span>{venue.apy.toFixed(2)}% APY</span>
                  <span>{formatUnits(venue.estimatedNetReturn)} {venue.token} net</span>
                  <span>{venue.exitWindowLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel stack-md">
        <p className="section-label">Watchouts</p>
        <ul className="bullet-list">
          {recommendation.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
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
