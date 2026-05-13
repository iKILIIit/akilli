export const riskToneClassNames = {
  "Low complexity": "risk-low",
  "Moderate complexity": "risk-medium",
  "Higher protocol risk": "risk-high"
} as const;

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
