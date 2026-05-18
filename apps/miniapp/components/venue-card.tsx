import { cx, riskToneClassNames } from "@yield-copilot/ui";
import type { VenueResult } from "@yield-copilot/shared";

type VenueCardProps = {
  heading: string;
  venue: VenueResult | null;
  featured?: boolean;
};

export function VenueCard({ heading, venue, featured = false }: VenueCardProps) {
  if (!venue) {
    return (
      <section className="panel">
        <p className="section-label">{heading}</p>
        <h2>No backup venue</h2>
        <p>No second option qualified for the current token and user constraints.</p>
      </section>
    );
  }

  return (
    <section className={featured ? "panel venue-card featured stack-md" : "panel venue-card stack-md"}>
      <div className="row-between">
        <div className="venue-card__brand">
          <span className="venue-card__logo" aria-hidden="true">
            {venue.label.charAt(0)}
          </span>
          <div>
            <p className="section-label">{heading}</p>
            <h2>{venue.label}</h2>
          </div>
        </div>
        <span className={cx("risk-pill", riskToneClassNames[venue.riskLabel])}>
          {venue.riskLabel}
        </span>
      </div>

      {featured ? (
        <div className="featured-yield-row">
          <div>
            <span>Estimated APY</span>
            <strong>{venue.apy.toFixed(2)}%</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{venue.actionLabel}</strong>
          </div>
        </div>
      ) : null}

      <div className="metric-row">
        <div>
          <span>APY</span>
          <strong>{venue.apy.toFixed(2)}%</strong>
          <small>30d</small>
        </div>
        <div>
          <span>Liquidity</span>
          <strong>{venue.liquidityProfile}</strong>
          <small>{venue.lockupDays > 0 ? `${venue.lockupDays}d lockup` : "No lockup"}</small>
        </div>
        <div>
          <span>Score</span>
          <strong>{venue.score.toFixed(2)}</strong>
          <small>Best-fit rank</small>
        </div>
      </div>

      <p>{venue.summary}</p>

      <ul className={featured ? "bullet-list emphasis" : "bullet-list"}>
        {venue.rationale.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="warning-box">
        <p className="section-label">Major risks</p>
        <ul className="bullet-list compact">
          {venue.riskReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
