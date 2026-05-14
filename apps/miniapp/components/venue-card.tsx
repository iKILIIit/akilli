import { cx, riskToneClassNames } from "@yield-copilot/ui";
import type { VenueResult } from "@yield-copilot/shared";

type VenueCardProps = {
  heading: string;
  venue: VenueResult | null;
  timeHorizonDays: number;
  featured?: boolean;
};

function formatUnits(amount: number) {
  return amount.toFixed(2);
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getFreshnessLabel(venue: VenueResult) {
  if (venue.freshnessStatus === "fresh") {
    return "Fresh snapshot";
  }

  if (venue.freshnessStatus === "stale") {
    return "Stale snapshot";
  }

  return "Unavailable";
}

export function VenueCard({
  heading,
  venue,
  timeHorizonDays,
  featured = false
}: VenueCardProps) {
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
        <div>
          <p className="section-label">{heading}</p>
          <h2>{venue.label}</h2>
          <div className="meta-pill-row">
            <span className={cx("meta-pill", `meta-pill-${venue.freshnessStatus}`)}>
              {getFreshnessLabel(venue)}
            </span>
            <span className="meta-pill meta-pill-neutral">{venue.sourceLabel}</span>
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
            <span>Estimated net</span>
            <strong>{formatUnits(venue.estimatedNetReturn)}</strong>
          </div>
        </div>
      ) : null}

      <div className="metric-row">
        <div>
          <span>APY</span>
          <strong>{venue.apy.toFixed(2)}%</strong>
        </div>
        <div>
          <span>{timeHorizonDays}d net</span>
          <strong>{formatUnits(venue.estimatedNetReturn)}</strong>
        </div>
        <div>
          <span>Exit</span>
          <strong>{venue.exitWindowLabel}</strong>
        </div>
        <div>
          <span>One-time fee</span>
          <strong>{formatUnits(venue.estimatedOneTimeFee)}</strong>
        </div>
      </div>

      <p>{venue.summary}</p>

      <div className="notice-card compact stack-sm">
        <p className="section-label">{featured ? "Why this fits" : "Key tradeoff"}</p>
        <strong>{venue.actionLabel}</strong>
        <p>{venue.tradeoffSummary}</p>
      </div>

      <ul className={featured ? "bullet-list emphasis" : "bullet-list"}>
        {venue.rationale.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {venue.availabilityReasons.length > 0 ? (
        <div className="warning-box">
          <p className="section-label">Availability and timing</p>
          <ul className="bullet-list compact">
            {venue.availabilityReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="warning-box">
        <p className="section-label">Major risks</p>
        <ul className="bullet-list compact">
          {venue.riskReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <p className="fine-print">Quote snapshot updated at {formatUpdatedAt(venue.quoteUpdatedAt)}.</p>
    </section>
  );
}
