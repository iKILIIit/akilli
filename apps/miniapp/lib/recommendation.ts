import { generateRecommendation } from "@yield-copilot/agents";
import type {
  RecommendationRequest,
  RecommendationResponse
} from "@yield-copilot/shared";

export type CopilotNarrative = {
  source: "anthropic" | "deterministic";
  summary: string;
  whyNow: string[];
  watchFor: string[];
};

export type RecommendationView = {
  recommendation: RecommendationResponse;
  copilot: CopilotNarrative;
};

type AnthropicTextBlock = {
  type: string;
  text?: string;
};

type AnthropicResponse = {
  content?: AnthropicTextBlock[];
};

function parseJsonBlock(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    const cleaned = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(cleaned);
  }

  return JSON.parse(trimmed);
}

function humanizeLiquidity(
  liquidityProfile: RecommendationResponse["recommended"]["liquidityProfile"],
  lockupDays: number
) {
  if (liquidityProfile === "instant") {
    return "instant access";
  }

  if (liquidityProfile === "same-day") {
    return "same-day exit";
  }

  return lockupDays > 0 ? `${lockupDays}-day lockup` : "locked liquidity";
}

function buildDeterministicNarrative(
  input: RecommendationRequest,
  recommendation: RecommendationResponse
): CopilotNarrative {
  const { recommended, backup } = recommendation;
  const whyNow = [
    `${recommended.apy.toFixed(2)}% APY is the strongest fit among the currently supported ${input.token} venues.`,
    recommended.rationale[2] ?? recommended.rationale[0],
    backup
      ? `${backup.label} stays available as the fallback if you want a different yield or liquidity tradeoff.`
      : "No second route cleared the current constraints strongly enough to become a backup."
  ].filter((item): item is string => Boolean(item)).slice(0, 3);

  return {
    source: "deterministic",
    summary: `${recommended.label} leads for ${input.amount} ${input.token} because it balances ${input.goal.replace("-", " ")}, ${input.riskComfort} risk comfort, and ${humanizeLiquidity(recommended.liquidityProfile, recommended.lockupDays)} better than the other routes.`,
    whyNow,
    watchFor: Array.from(new Set([...recommended.warnings, ...recommendation.warnings])).slice(
      0,
      3
    )
  };
}

async function generateAnthropicNarrative(
  input: RecommendationRequest,
  recommendation: RecommendationResponse
): Promise<CopilotNarrative | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  if (!apiKey) {
    return null;
  }

  const prompt = {
    userInput: input,
    recommendation: {
      topPick: recommendation.recommended,
      backup: recommendation.backup,
      rationale: recommendation.rationale,
      warnings: recommendation.warnings,
      executionPlan: recommendation.executionPlan
    }
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 320,
      system:
        "You explain a deterministic stablecoin yield recommendation. Return strict JSON only with keys summary, whyNow, watchFor. summary must be one short paragraph. whyNow and watchFor must each be arrays of 2 to 3 short strings. Do not invent venues, rates, or risks. Stay faithful to the provided recommendation data.",
      messages: [
        {
          role: "user",
          content: `Explain this recommendation for a mobile MiniPay app user.\n${JSON.stringify(prompt)}`
        }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as AnthropicResponse;
  const text = payload.content?.find((entry) => entry.type === "text")?.text;

  if (!text) {
    return null;
  }

  const parsed = parseJsonBlock(text) as {
    summary?: unknown;
    whyNow?: unknown;
    watchFor?: unknown;
  };

  if (
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.whyNow) ||
    !Array.isArray(parsed.watchFor)
  ) {
    return null;
  }

  const whyNow = parsed.whyNow.filter((item): item is string => typeof item === "string").slice(0, 3);
  const watchFor = parsed.watchFor
    .filter((item): item is string => typeof item === "string")
    .slice(0, 3);

  if (whyNow.length === 0 || watchFor.length === 0) {
    return null;
  }

  return {
    source: "anthropic",
    summary: parsed.summary,
    whyNow,
    watchFor
  };
}

export async function getRecommendationView(
  input: RecommendationRequest
): Promise<RecommendationView> {
  const recommendation = generateRecommendation(input);
  const fallback = buildDeterministicNarrative(input, recommendation);

  try {
    const aiNarrative = await generateAnthropicNarrative(input, recommendation);

    return {
      recommendation,
      copilot: aiNarrative ?? fallback
    };
  } catch {
    return {
      recommendation,
      copilot: fallback
    };
  }
}
