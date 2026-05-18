import { generateRecommendationWithLLM } from "@yield-copilot/agents";
import type {
  RecommendationRequest,
  RecommendationResponse
} from "@yield-copilot/shared";

export type CopilotNarrative = {
  source: "openai" | "deterministic";
  summary: string;
  whyNow: string[];
  watchFor: string[];
};

export type RecommendationView = {
  recommendation: RecommendationResponse;
  copilot: CopilotNarrative;
};

function humanizeLiquidity(
  liquidityProfile: RecommendationResponse["recommended"]["liquidityProfile"],
  lockupDays: number
) {
  if (liquidityProfile === "instant") return "instant access";
  if (liquidityProfile === "same-day") return "same-day exit";
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
    watchFor: Array.from(new Set([...recommended.warnings, ...recommendation.warnings])).slice(0, 3)
  };
}

async function generateOpenAINarrative(
  input: RecommendationRequest,
  recommendation: RecommendationResponse
): Promise<CopilotNarrative | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) return null;

  const context = {
    userBrief: {
      goal: input.goal,
      token: input.token,
      amount: input.amount,
      timeHorizonDays: input.timeHorizonDays,
      riskComfort: input.riskComfort
    },
    recommendation: {
      topPick: {
        id: recommendation.recommended.id,
        label: recommendation.recommended.label,
        apy: recommendation.recommended.apy,
        riskLabel: recommendation.recommended.riskLabel,
        liquidityProfile: recommendation.recommended.liquidityProfile,
        lockupDays: recommendation.recommended.lockupDays,
        estimatedNetReturn: recommendation.recommended.estimatedNetReturn,
        tradeoffSummary: recommendation.recommended.tradeoffSummary
      },
      backup: recommendation.backup
        ? {
            label: recommendation.backup.label,
            apy: recommendation.backup.apy,
            liquidityProfile: recommendation.backup.liquidityProfile
          }
        : null,
      confidence: recommendation.confidence,
      decisionSummary: recommendation.decisionSummary,
      warnings: recommendation.warnings,
      decisionEngine: recommendation.decisionEngine.source
    }
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are an autonomous AI yield agent for MiniPay users on Celo.",
            "Your job: explain a yield recommendation in plain language so the user can act with confidence.",
            "Return strict JSON with exactly these keys: summary, whyNow, watchFor.",
            "summary: 2–3 sentences. Open with a clear verdict. Explain why the top pick wins for this user's specific goal, amount, and risk comfort. Sound like a trusted advisor.",
            "whyNow: array of exactly 2–3 short strings. Each is a concrete, specific reason to act now. Use real numbers from the data.",
            "watchFor: array of exactly 2–3 short strings. Each is a real risk or condition that could invalidate this recommendation. Be honest, not reassuring.",
            "Rules: never invent rates or venues not in the data. Write for a mobile screen — short sentences, no jargon. Be decisive."
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify(context)
        }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) return null;

  const parsed = JSON.parse(text) as {
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
  const watchFor = parsed.watchFor.filter((item): item is string => typeof item === "string").slice(0, 3);

  if (whyNow.length === 0 || watchFor.length === 0) return null;

  return {
    source: "openai",
    summary: parsed.summary,
    whyNow,
    watchFor
  };
}

export async function getRecommendationView(
  input: RecommendationRequest
): Promise<RecommendationView> {
  const recommendation = await generateRecommendationWithLLM(input);
  const fallback = buildDeterministicNarrative(input, recommendation);

  try {
    const aiNarrative = await generateOpenAINarrative(input, recommendation);
    return { recommendation, copilot: aiNarrative ?? fallback };
  } catch {
    return { recommendation, copilot: fallback };
  }
}
