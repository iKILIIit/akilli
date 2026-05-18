import Link from "next/link";
import { generatePositionView } from "@yield-copilot/agents";
import { formatGoalLabel, formatRiskLabel } from "../../lib/format";
import { BackButton, HeaderBar, ScreenFrame, StepDots } from "../../components/screen-frame";
import { parseRecommendationInput } from "../../lib/request";

type PositionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function StatusChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-chip inline-chip--green">{children}</span>;
}

export default async function PositionPage({ searchParams }: PositionPageProps) {
  const parsed = parseRecommendationInput(await searchParams);
  const position = generatePositionView(parsed);
  const alertParams = new URLSearchParams({
    token: parsed.token,
    amount: parsed.amount,
    goal: parsed.goal,
    timeHorizonDays: String(parsed.timeHorizonDays),
    riskComfort: parsed.riskComfort,
  });

  return (
    <ScreenFrame>
      <HeaderBar
        left={<BackButton href={`/recommendation?${alertParams.toString()}`} />}
        title="Position"
        right={
          <Link href="/support" className="screen-topbar__meta" aria-label="Open support">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="4" cy="9" r="1.4" fill="currentColor" />
              <circle cx="9" cy="9" r="1.4" fill="currentColor" />
              <circle cx="14" cy="9" r="1.4" fill="currentColor" />
            </svg>
          </Link>
        }
      />

      <section className="screen-copy-block">
        <StepDots current={3} total={3} />
        <h1 className="screen-copy-block__title">
          Your position
          <br />
          at a glance.
        </h1>
      </section>

      <section className="position-hero-card">
        <div className="position-hero-card__head">
          <span className="supporting-route-card__logo">K</span>
          <div className="position-hero-card__venue">
            <strong>{position.venueLabel}</strong>
            <small>Opened 4 days ago · {position.token}</small>
          </div>
          <StatusChip>Active</StatusChip>
        </div>

        <div className="position-hero-card__amount-row">
          <div>
            <span>Amount</span>
            <strong>
              {position.amount}
              <small> {position.token}</small>
            </strong>
          </div>
          <div className="position-hero-card__earned">
            <span>Earned</span>
            <strong>+ $1.60</strong>
          </div>
        </div>

        <div className="position-hero-card__progress">
          <span className="position-hero-card__progress-fill" />
        </div>
        <div className="position-hero-card__progress-meta">
          <span>Day 4 of {parsed.timeHorizonDays}</span>
          <span>Auto-renew on</span>
        </div>
      </section>

      <section className="metric-trio">
        <div className="metric-trio__card">
          <span>APY now</span>
          <strong>6.1%</strong>
          <small>+0.0</small>
        </div>
        <div className="metric-trio__card">
          <span>Risk</span>
          <strong>Low</strong>
          <small>A-tier</small>
        </div>
        <div className="metric-trio__card">
          <span>Liquid</span>
          <strong>12s</strong>
          <small>Exit</small>
        </div>
      </section>

      <section className="screen-section">
        <div className="screen-section__head">Original brief</div>
        <div className="summary-grid-card">
          {[
            ["Goal", formatGoalLabel(parsed.goal)],
            ["Token", parsed.token],
            ["Amount", parsed.amount],
            ["Days", String(parsed.timeHorizonDays)],
            ["Risk", formatRiskLabel(parsed.riskComfort).replace(" risk", "")],
            ["Filed", "Tue 14:02"],
          ].map(([label, value]) => (
            <div key={label} className="summary-grid-card__row">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="screen-section">
        <div className="screen-section__head screen-section__head--split">
          <span>Monitoring rules</span>
          <span>Edit</span>
        </div>
        <div className="toggle-list-card">
          {[
            { title: "APY drops below 5.4%", detail: "Alert me to revisit" },
            { title: "Better option +0.5%", detail: "Suggest a switch" },
            { title: "Risk tier downgrade", detail: "Surface immediately" },
          ].map((item, index, arr) => (
            <div key={item.title} className={index < arr.length - 1 ? "toggle-list-card__row" : "toggle-list-card__row toggle-list-card__row--last"}>
              <span className="toggle-list-card__icon" />
              <div className="toggle-list-card__body">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className="toggle-list-card__switch" aria-hidden="true">
                <span />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="action-row action-row--split">
        <Link href={`/alerts?${alertParams.toString()}`} className="primary-action">
          View alerts
        </Link>
        <Link href={`/recommendation?${alertParams.toString()}`} className="secondary-action">
          Back to result
        </Link>
      </section>
    </ScreenFrame>
  );
}
