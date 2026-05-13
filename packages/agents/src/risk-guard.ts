import type { RiskMeta, YieldQuote } from "@yield-copilot/shared";

export function assessVenueRisk(venue: YieldQuote): RiskMeta {
  if (venue.id === "wallet-liquid") {
    return {
      venueId: venue.id,
      label: "Low complexity",
      reasons: [
        "No additional protocol hop is required.",
        "Funds remain highly liquid for transfers and payments."
      ],
      warnings: ["No yield upside while funds stay idle."]
    };
  }

  if (venue.kind === "native") {
    return {
      venueId: venue.id,
      label: "Moderate complexity",
      reasons: [
        "Execution stays close to the MiniPay user journey.",
        "Yield and exit conditions can still change over time."
      ],
      warnings: [
        venue.lockupDays > 0
          ? `Expect roughly ${venue.lockupDays} day(s) of exit friction in some conditions.`
          : "Review same-day availability before depending on instant exits."
      ]
    };
  }

  return {
    venueId: venue.id,
    label: "Higher protocol risk",
    reasons: [
      "This route introduces third-party smart contract exposure.",
      "The yield premium depends on conditions outside the MiniPay shell."
    ],
    warnings: [
      "Use only when the extra APY clearly compensates for extra complexity.",
      "Confirm contract addresses and venue status before live deposits."
    ]
  };
}
