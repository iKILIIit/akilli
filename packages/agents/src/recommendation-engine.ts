import { buildExecutionPlan } from "./execution-agent";
import { buildRecommendationSummary, rankVenues } from "./goal-planner";
import { buildPositionSnapshot } from "./monitor-agent";
import { discoverVenueQuotes } from "./yield-scout";
import {
  buildPolicyExecutionRequest,
  getPolicyActionIndex,
  getPolicyTokenAddress,
  getPolicyVenueConfig
} from "@yield-copilot/celo";
import {
  llmRecommendationDraftSchema,
  readServerEnv,
  type LlmRecommendationDraft,
  type RecommendationConfidence,
  type RecommendationRequest,
  type RecommendationResponse,
  type VenueResult
} from "@yield-copilot/shared";

function uniqueStrings(values: string[], limit: number) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function buildDecisionEngineFallback(reason: string) {
  return {
    source: "deterministic" as const,
    fallbackReason: reason
  };
}

function buildPolicyExecutionPreview(
  input: RecommendationRequest,
  recommended: VenueResult,
  recommendedAction: RecommendationResponse["recommendedAction"]
) {
  const request = buildPolicyExecutionRequest(input, recommended, recommendedAction);

  return {
    action: request.action,
    actionIndex: getPolicyActionIndex(request.action),
    routerMethod: "executePolicyAction" as const,
    venueConfig: getPolicyVenueConfig(recommended.id),
    tokenAddress: getPolicyTokenAddress(request.token),
    request
  };
}

function buildDeterministicRecommendation(
  input: RecommendationRequest,
  fallbackReason?: string
): RecommendationResponse {
  const ranked = rankVenues(input, discoverVenueQuotes(input));
  const [recommended, backup] = ranked;

  if (!recommended) {
    throw new Error("No supported venues are available for this request.");
  }

  const summary = buildRecommendationSummary(input, ranked);

  return {
    recommended,
    backup: backup ?? null,
    consideredVenues: ranked,
    confidence: summary.confidence,
    recommendedAction: summary.recommendedAction,
    decisionSummary: summary.decisionSummary,
    rationale: summary.rationale,
    warnings: summary.warnings,
    generatedAt: new Date().toISOString(),
    executionPlan: buildExecutionPlan(input, recommended),
    policyExecution: buildPolicyExecutionPreview(
      input,
      recommended,
      summary.recommendedAction
    ),
    decisionEngine: fallbackReason
      ? buildDecisionEngineFallback(fallbackReason)
      : { source: "deterministic" }
  };
}

function buildPrompt(input: RecommendationRequest, venues: VenueResult[]) {
  const candidates = venues.map((venue) => ({
    id: venue.id,
    label: venue.label,
    kind: venue.kind,
    thirdParty: venue.thirdParty,
    available: venue.available,
    liquidityProfile: venue.liquidityProfile,
    lockupDays: venue.lockupDays,
    apy: venue.apy,
    estimatedNetReturn: venue.estimatedNetReturn,
    estimatedOneTimeFee: venue.estimatedOneTimeFee,
    freshnessStatus: venue.freshnessStatus,
    riskLabel: venue.riskLabel,
    riskReasons: venue.riskReasons,
    tradeoffSummary: venue.tradeoffSummary
  }));

  return [
    "You are selecting one yield recommendation and one backup from a fixed candidate list.",
    "Return valid JSON only. Do not include markdown fences or extra prose.",
    "Hard rules:",
    "- Choose only venue ids from the candidate list.",
    "- Never recommend an unavailable venue.",
    "- Never recommend a venue whose lockupDays exceeds the user's timeHorizonDays.",
    "- If riskComfort is low, do not recommend a third-party venue.",
    "- If a non-liquid venue has non-positive estimatedNetReturn, avoid recommending it.",
    "Required JSON shape:",
    '{"recommendedVenueId":"string","backupVenueId":"string|null","confidence":"Strong fit|Good fit|Hold for now","decisionSummary":"string","rationale":["string","string"],"warnings":["string"]}',
    `User brief: ${JSON.stringify(input)}`,
    `Candidates: ${JSON.stringify(candidates)}`
  ].join("\n");
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  throw new Error("OpenAI response did not contain a JSON object.");
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts: number, delayMs: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

async function requestOpenAIRecommendation(
  input: RecommendationRequest,
  venues: VenueResult[],
  apiKey: string,
  model: string
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildPrompt(input, venues)
        }
      ]
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI response did not include a message content block.");
  }

  return llmRecommendationDraftSchema.parse(JSON.parse(extractJson(text)));
}

function assertGuardrails(input: RecommendationRequest, venue: VenueResult) {
  if (!venue.available) {
    throw new Error(`${venue.label} is unavailable for the current input.`);
  }

  if (input.timeHorizonDays < venue.lockupDays) {
    throw new Error(`${venue.label} exceeds the user's time horizon.`);
  }

  if (input.riskComfort === "low" && venue.thirdParty) {
    throw new Error(`${venue.label} violates the low-risk third-party guardrail.`);
  }

  if (venue.id !== "wallet-liquid" && venue.estimatedNetReturn <= 0) {
    throw new Error(`${venue.label} does not clear the positive net-return guardrail.`);
  }
}

function normalizeConfidence(
  recommended: VenueResult,
  confidence: RecommendationConfidence
): RecommendationConfidence {
  if (recommended.id === "wallet-liquid" || recommended.estimatedNetReturn <= 0) {
    return "Hold for now";
  }

  return confidence === "Hold for now" ? "Good fit" : confidence;
}

function buildLlmRecommendation(
  input: RecommendationRequest,
  deterministic: RecommendationResponse,
  draft: LlmRecommendationDraft,
  model: string
): RecommendationResponse {
  const venueById = new Map(
    deterministic.consideredVenues.map((venue) => [venue.id, venue] as const)
  );
  const recommended = venueById.get(draft.recommendedVenueId);

  if (!recommended) {
    throw new Error(`Anthropic selected an unknown venue id: ${draft.recommendedVenueId}.`);
  }

  assertGuardrails(input, recommended);

  const fallbackBackup = deterministic.consideredVenues.find(
    (venue) => venue.id !== recommended.id
  ) ?? null;
  const requestedBackup = draft.backupVenueId
    ? venueById.get(draft.backupVenueId) ?? null
    : null;
  const backup =
    requestedBackup && requestedBackup.id !== recommended.id ? requestedBackup : fallbackBackup;
  const remaining = deterministic.consideredVenues.filter(
    (venue) => venue.id !== recommended.id && venue.id !== backup?.id
  );
  const recommendedAction =
    recommended.id === "wallet-liquid" || recommended.estimatedNetReturn <= 0
      ? "stay-liquid"
      : "move-funds";

  return {
    recommended,
    backup,
    consideredVenues: [recommended, ...(backup ? [backup] : []), ...remaining],
    confidence: normalizeConfidence(recommended, draft.confidence),
    recommendedAction,
    decisionSummary: draft.decisionSummary,
    rationale: uniqueStrings(draft.rationale, 4),
    warnings: uniqueStrings(
      [...draft.warnings, ...recommended.warnings, ...(backup?.warnings ?? [])],
      6
    ),
    generatedAt: new Date().toISOString(),
    executionPlan: buildExecutionPlan(input, recommended),
    policyExecution: buildPolicyExecutionPreview(
      input,
      recommended,
      recommendedAction
    ),
    decisionEngine: {
      source: "openai",
      model
    }
  };
}

export function generateRecommendation(input: RecommendationRequest): RecommendationResponse {
  return buildDeterministicRecommendation(input);
}

export async function generateRecommendationWithLLM(
  input: RecommendationRequest
): Promise<RecommendationResponse> {
  const env = readServerEnv(process.env);

  if (!env.OPENAI_API_KEY) {
    return buildDeterministicRecommendation(
      input,
      "OPENAI_API_KEY is not configured. Using deterministic fallback."
    );
  }

  const deterministic = buildDeterministicRecommendation(input);

  try {
    const draft = await withRetry(
      () =>
        requestOpenAIRecommendation(
          input,
          deterministic.consideredVenues,
          env.OPENAI_API_KEY!,
          env.OPENAI_MODEL
        ),
      2,
      600
    );

    return buildLlmRecommendation(input, deterministic, draft, env.OPENAI_MODEL);
  } catch (error) {
    console.error(
      `[recommendation-engine] OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return buildDeterministicRecommendation(
      input,
      error instanceof Error
        ? `${error.message} Using deterministic fallback.`
        : "OpenAI request failed. Using deterministic fallback."
    );
  }
}

export function generatePositionView(input: RecommendationRequest) {
  const recommendation = generateRecommendation(input);
  return buildPositionSnapshot(recommendation.recommended, input.amount);
}
