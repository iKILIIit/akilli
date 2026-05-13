import {
  alertSchema,
  executionPlanRequestSchema,
  executionPlanSchema,
  goalSchema,
  positionSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  riskComfortSchema,
  riskLabelSchema,
  riskMetaSchema,
  tokenSchema,
  venueAvailabilitySchema,
  venueDefinitionSchema,
  venueResultSchema,
  yieldQuoteSchema
} from "./schemas";
import type { z } from "zod";

export type Token = z.infer<typeof tokenSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type RiskComfort = z.infer<typeof riskComfortSchema>;
export type RiskLabel = z.infer<typeof riskLabelSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type VenueDefinition = z.infer<typeof venueDefinitionSchema>;
export type VenueAvailability = z.infer<typeof venueAvailabilitySchema>;
export type RiskMeta = z.infer<typeof riskMetaSchema>;
export type YieldQuote = z.infer<typeof yieldQuoteSchema>;
export type VenueResult = z.infer<typeof venueResultSchema>;
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;
export type ExecutionPlanRequest = z.infer<typeof executionPlanRequestSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type Position = z.infer<typeof positionSchema>;
