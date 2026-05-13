import { z } from "zod";

export const tokenSchema = z.enum(["USDT", "USDC", "USDm"]);
export const goalSchema = z.enum(["keep-flexible", "earn-more", "save-safely"]);
export const riskComfortSchema = z.enum(["low", "medium"]);
export const riskLabelSchema = z.enum([
  "Low complexity",
  "Moderate complexity",
  "Higher protocol risk"
]);
export const venueKindSchema = z.enum(["liquid", "native", "third-party"]);
export const liquidityProfileSchema = z.enum(["instant", "same-day", "locked"]);

export const recommendationRequestSchema = z.object({
  walletAddress: z.string().min(1).default("0x0000000000000000000000000000000000000000"),
  token: tokenSchema,
  amount: z.string().min(1),
  goal: goalSchema,
  timeHorizonDays: z.number().int().positive(),
  riskComfort: riskComfortSchema
});

export const venueDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: venueKindSchema,
  supportedTokens: z.array(tokenSchema).min(1),
  thirdParty: z.boolean(),
  baseApy: z.number().min(0),
  liquidityProfile: liquidityProfileSchema,
  lockupDays: z.number().int().min(0),
  summary: z.string().min(1),
  guardrails: z.array(z.string()).min(1)
});

export const venueAvailabilitySchema = z.object({
  venueId: z.string().min(1),
  available: z.boolean(),
  reasons: z.array(z.string()),
  minAmount: z.string().optional()
});

export const riskMetaSchema = z.object({
  venueId: z.string().min(1),
  label: riskLabelSchema,
  reasons: z.array(z.string()).min(1),
  warnings: z.array(z.string())
});

export const yieldQuoteSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: venueKindSchema,
  token: tokenSchema,
  apy: z.number().min(0),
  available: z.boolean(),
  availabilityReasons: z.array(z.string()),
  supportedTokens: z.array(tokenSchema).min(1),
  thirdParty: z.boolean(),
  liquidityProfile: liquidityProfileSchema,
  lockupDays: z.number().int().min(0),
  summary: z.string().min(1),
  guardrails: z.array(z.string()).min(1)
});

export const venueResultSchema = yieldQuoteSchema.extend({
  score: z.number(),
  riskLabel: riskLabelSchema,
  riskReasons: z.array(z.string()).min(1),
  warnings: z.array(z.string()),
  rationale: z.array(z.string()).min(1),
  actionLabel: z.string().min(1)
});

export const executionStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1)
});

export const executionPlanSchema = z.object({
  venueId: z.string().min(1),
  venueLabel: z.string().min(1),
  token: tokenSchema,
  amount: z.string().min(1),
  requiresWalletSignature: z.boolean(),
  steps: z.array(executionStepSchema).min(1),
  cta: z.string().min(1)
});

export const recommendationResponseSchema = z.object({
  recommended: venueResultSchema,
  backup: venueResultSchema.nullable(),
  rationale: z.array(z.string()).min(1),
  warnings: z.array(z.string()),
  generatedAt: z.string().datetime(),
  executionPlan: executionPlanSchema
});

export const executionPlanRequestSchema = z.object({
  walletAddress: z.string().min(1).optional(),
  token: tokenSchema,
  amount: z.string().min(1),
  venueId: z.string().min(1)
});

export const alertSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["info", "warning", "action"]),
  title: z.string().min(1),
  detail: z.string().min(1)
});

export const positionSchema = z.object({
  venueId: z.string().min(1),
  venueLabel: z.string().min(1),
  token: tokenSchema,
  amount: z.string().min(1),
  currentApy: z.number().min(0),
  startedAt: z.string().datetime(),
  status: z.enum(["active", "watch", "ready-to-exit"]),
  alerts: z.array(alertSchema)
});
