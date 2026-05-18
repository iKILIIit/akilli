import { GOAL_OPTIONS, type Goal, type RiskComfort } from "@yield-copilot/shared";

const goalLabels = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.id, option.label]),
) as Record<Goal, string>;

const riskLabels: Record<RiskComfort, string> = {
  low: "Low risk",
  medium: "Medium risk",
};

export function formatGoalLabel(goal: Goal) {
  return goalLabels[goal] ?? goal;
}

export function formatRiskLabel(riskComfort: RiskComfort) {
  return riskLabels[riskComfort] ?? riskComfort;
}
