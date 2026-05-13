import type { Alert, Position, VenueResult } from "@yield-copilot/shared";

export function buildPositionSnapshot(venue: VenueResult, amount: string): Position {
  const alerts: Alert[] = [];

  if (venue.riskLabel !== "Low complexity") {
    alerts.push({
      id: `${venue.id}-review-rate`,
      severity: "warning",
      title: "Review rate weekly",
      detail: "This venue can drift away from the original recommendation as rates change."
    });
  }

  if (venue.liquidityProfile !== "instant") {
    alerts.push({
      id: `${venue.id}-exit-friction`,
      severity: "info",
      title: "Exit may not be instant",
      detail: `Plan for ${venue.lockupDays || 0} day(s) of exit friction in stressed conditions.`
    });
  }

  return {
    venueId: venue.id,
    venueLabel: venue.label,
    token: venue.token,
    amount,
    currentApy: venue.apy,
    startedAt: new Date().toISOString(),
    status: venue.riskLabel === "Higher protocol risk" ? "watch" : "active",
    alerts
  };
}
