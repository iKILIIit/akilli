import {
  alertSchema,
  executionPlanRequestSchema,
  executionPlanSchema,
  goalSchema,
  policyActionSchema,
  policyExecutionPreviewSchema,
  policyExecutionRequestSchema,
  policyVenueConfigSchema,
  positionSchema,
  quoteFreshnessSchema,
  quoteSourceSchema,
  recommendationActionSchema,
  recommendationConfidenceSchema,
  recommendationEngineSchema,
  recommendationEngineSourceSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  riskComfortSchema,
  riskLabelSchema,
  riskMetaSchema,
  tokenSchema,
  venueAvailabilitySchema,
  venueDefinitionSchema,
  llmRecommendationDraftSchema,
  venueResultSchema,
  yieldQuoteSchema
} from "./schemas";
import type { z } from "zod";

export type Token = z.infer<typeof tokenSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type RiskComfort = z.infer<typeof riskComfortSchema>;
export type RiskLabel = z.infer<typeof riskLabelSchema>;
export type QuoteFreshness = z.infer<typeof quoteFreshnessSchema>;
export type QuoteSource = z.infer<typeof quoteSourceSchema>;
export type RecommendationConfidence = z.infer<typeof recommendationConfidenceSchema>;
export type RecommendationAction = z.infer<typeof recommendationActionSchema>;
export type RecommendationEngineSource = z.infer<typeof recommendationEngineSourceSchema>;
export type RecommendationEngine = z.infer<typeof recommendationEngineSchema>;
export type PolicyAction = z.infer<typeof policyActionSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type VenueDefinition = z.infer<typeof venueDefinitionSchema>;
export type VenueAvailability = z.infer<typeof venueAvailabilitySchema>;
export type RiskMeta = z.infer<typeof riskMetaSchema>;
export type YieldQuote = z.infer<typeof yieldQuoteSchema>;
export type VenueResult = z.infer<typeof venueResultSchema>;
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;
export type ExecutionPlanRequest = z.infer<typeof executionPlanRequestSchema>;
export type PolicyExecutionPreview = z.infer<typeof policyExecutionPreviewSchema>;
export type PolicyExecutionRequest = z.infer<typeof policyExecutionRequestSchema>;
export type PolicyVenueConfig = z.infer<typeof policyVenueConfigSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type LlmRecommendationDraft = z.infer<typeof llmRecommendationDraftSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type Position = z.infer<typeof positionSchema>;
