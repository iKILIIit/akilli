import type {
  ExecutionPlan,
  RecommendationRequest,
  RiskMeta,
  VenueAvailability,
  YieldQuote
} from "@yield-copilot/shared";

export type VenueInput = RecommendationRequest;
export type QuoteInput = RecommendationRequest;
export type DepositInput = RecommendationRequest;
export type WithdrawInput = Pick<RecommendationRequest, "walletAddress" | "token" | "amount">;

export type YieldVenueAdapter = {
  id: string;
  label: string;
  supportedTokens: string[];
  getAvailability(input: VenueInput): Promise<VenueAvailability>;
  getQuote(input: QuoteInput): Promise<YieldQuote>;
  getRiskMeta(): Promise<RiskMeta>;
  buildDepositPlan(input: DepositInput): Promise<ExecutionPlan>;
  buildWithdrawPlan(input: WithdrawInput): Promise<ExecutionPlan>;
};
