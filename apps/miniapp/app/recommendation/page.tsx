import Link from "next/link";
import { formatGoalLabel, formatRiskLabel } from "../../lib/format";
import { getRecommendationView } from "../../lib/recommendation";
import { BackButton, HeaderBar, ScreenFrame, StepDots } from "../../components/screen-frame";
import { parseRecommendationInput } from "../../lib/request";

type RecommendationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "slab";
}) {
  return <span className={`inline-chip inline-chip--${tone}`}>{children}</span>;
}

function formatLiquidity(liquidityProfile: "instant" | "same-day" | "locked", lockupDays: number) {
  if (liquidityProfile === "instant") {
    return { label: "Instant", detail: "Exit anytime" };
  }

  if (liquidityProfile === "same-day") {
    return { label: "Same day", detail: "Fast exit" };
  }

  return {
    label: `${lockupDays}d`,
    detail: lockupDays > 0 ? "Lockup" : "Locked"
  };
}

function venueMark(label: string) {
  return label.trim().charAt(0).toUpperCase();
}

export default async function RecommendationPage({
  searchParams,
}: RecommendationPageProps) {
  const parsed = parseRecommendationInput(await searchParams);
  const nextParams = new URLSearchParams({
    token: parsed.token,
    amount: parsed.amount,
    goal: parsed.goal,
    timeHorizonDays: String(parsed.timeHorizonDays),
    riskComfort: parsed.riskComfort,
  });

  if (parsed.walletAddress) {
    nextParams.set("walletAddress", parsed.walletAddress);
  }

  const { recommendation, copilot } = await getRecommendationView(parsed);
  const topPick = recommendation.recommended;
  const backup = recommendation.backup;
  const liquidity = formatLiquidity(topPick.liquidityProfile, topPick.lockupDays);

  return (
    <ScreenFrame>
      <HeaderBar
        left={<BackButton href={`/check?${nextParams.toString()}`} />}
        title="Recommendation"
        right={<div style={{ width: 36 }} />}
      />

      <section className="screen-copy-block">
        <StepDots current={2} total={3} />
        <h1 className="screen-copy-block__title">
          Your best fit
          <br />
          right now.
        </h1>
      </section>

      <section className="brief-chip-row brief-chip-row--spacious">
        <Chip>{formatGoalLabel(parsed.goal)}</Chip>
        <Chip>{parsed.amount} {parsed.token}</Chip>
        <Chip>{parsed.timeHorizonDays} days</Chip>
        <Chip>{formatRiskLabel(parsed.riskComfort)}</Chip>
      </section>

      <section className="featured-route-card">
        <div className="featured-route-card__glow" aria-hidden="true" />
        <div className="featured-route-card__head">
          <span className="featured-route-card__logo">{venueMark(topPick.label)}</span>
          <div className="featured-route-card__title-wrap">
            <span className="featured-route-card__label">Top pick</span>
            <strong>{topPick.label}</strong>
          </div>
          <Chip tone="slab">{topPick.actionLabel}</Chip>
        </div>

        <div className="featured-route-card__stats">
          <div>
            <span>APY</span>
            <strong>{topPick.apy.toFixed(2)}%</strong>
            <small>{parsed.token}</small>
          </div>
          <div>
            <span>Risk</span>
            <strong>{topPick.riskLabel.replace(" complexity", "")}</strong>
            <small>{topPick.score.toFixed(0)} fit</small>
          </div>
          <div>
            <span>Liquidity</span>
            <strong>{liquidity.label}</strong>
            <small>{liquidity.detail}</small>
          </div>
        </div>
      </section>

      {backup ? (
        <section className="supporting-route-card">
          <span className="supporting-route-card__logo supporting-route-card__logo--amber">
            {venueMark(backup.label)}
          </span>
          <div className="supporting-route-card__body">
            <span className="supporting-route-card__label">Backup</span>
            <strong>{backup.label}</strong>
            <small>{backup.riskLabel} · {formatLiquidity(backup.liquidityProfile, backup.lockupDays).detail}</small>
          </div>
          <div className="supporting-route-card__metric">
            <strong>{backup.apy.toFixed(2)}%</strong>
            <small>APY · {parsed.token}</small>
          </div>
        </section>
      ) : null}

      <section className="screen-section">
        <div className="screen-section__head screen-section__head--split">
          <span>Copilot read</span>
          <span>{copilot.source === "anthropic" ? "AI" : "Rules"}</span>
        </div>
        <div className="notice-card compact recommendation-copilot-card">
          <p>{copilot.summary}</p>
        </div>
      </section>

      <section className="screen-section">
        <div className="screen-section__head">Why this wins</div>
        <div className="list-card">
          {copilot.whyNow.map((item, index, arr) => (
            <div
              key={item}
              className={
                index < arr.length - 1
                  ? "list-card__row"
                  : "list-card__row list-card__row--last"
              }
            >
              <span className="list-card__icon list-card__icon--green" />
              <div>
                <strong>{item}</strong>
                <p>{topPick.rationale[index] ?? topPick.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="screen-section">
        <div className="screen-section__head">Watch for</div>
        <div className="list-card">
          {copilot.watchFor.map((item, index, arr) => (
            <div
              key={item}
              className={
                index < arr.length - 1
                  ? "list-card__row"
                  : "list-card__row list-card__row--last"
              }
            >
              <span className="list-card__icon list-card__icon--amber" />
              <div>
                <strong>{item}</strong>
                <p>{topPick.warnings[index] ?? recommendation.warnings[index] ?? "Revisit the route if conditions drift."}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="screen-section">
        <div className="screen-section__head">Execution plan</div>
        <div className="plan-card">
          {recommendation.executionPlan.steps.map((step, index) => (
            <div key={step.title} className="plan-card__row">
              <span className="plan-card__index">{index + 1}</span>
              <span>{step.title}: {step.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="action-row">
        <Link href={`/position?${nextParams.toString()}`} className="primary-action">
          {recommendation.executionPlan.cta}
        </Link>
        <Link href={`/check?${nextParams.toString()}`} className="secondary-action">
          Change inputs
        </Link>
      </section>
    </ScreenFrame>
  );
}
