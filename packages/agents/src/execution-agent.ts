import type { ExecutionPlan, RecommendationRequest, VenueResult } from "@yield-copilot/shared";

export function buildExecutionPlan(
  input: RecommendationRequest,
  venue: VenueResult
): ExecutionPlan {
  if (venue.id === "wallet-liquid") {
    return {
      venueId: venue.id,
      venueLabel: venue.label,
      token: input.token,
      amount: input.amount,
      requiresWalletSignature: false,
      steps: [
        {
          title: "Stay in wallet",
          detail: `Keep ${input.amount} ${input.token} liquid in MiniPay for transfers and payments.`
        },
        {
          title: "Set review reminder",
          detail: "Check again when your balance grows or your time horizon changes."
        }
      ],
      cta: "Keep funds liquid"
    };
  }

  return {
    venueId: venue.id,
    venueLabel: venue.label,
    token: input.token,
    amount: input.amount,
    requiresWalletSignature: true,
    steps: [
      {
        title: "Review risk",
        detail: `${venue.riskLabel}: ${venue.riskReasons.join(" ")}`
      },
      {
        title: "Open venue flow",
        detail: `Route ${input.amount} ${input.token} into ${venue.label} through the MiniPay-compatible execution path.`
      },
      {
        title: "Confirm transaction",
        detail: "Request a wallet signature only after the destination and amount are confirmed."
      }
    ],
    cta: `Continue to ${venue.label}`
  };
}
