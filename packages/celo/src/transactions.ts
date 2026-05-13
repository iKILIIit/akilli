import type { ExecutionPlan, Token } from "@yield-copilot/shared";

export function formatExecutionSummary(plan: ExecutionPlan) {
  return `${plan.cta} ${plan.amount} ${plan.token} via ${plan.venueLabel}`;
}

export function describeTokenAmount(amount: string, token: Token) {
  return `${amount} ${token}`;
}
