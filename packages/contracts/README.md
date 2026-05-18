# Contracts

This folder contains the onchain policy router scaffold for recommendation
execution guardrails.

Current scope:

- `PolicyRouter.sol` enforces token allowlists, venue allowlists, per-venue
  amount caps, user risk-score minimums, quote freshness, cooldowns, recipient
  matching, and pause controls
- `IYieldVenueExecutor` defines the adapter surface a venue-specific executor
  must implement for guarded deposits

This scaffold is intentionally narrow. The LLM should propose an action offchain
and the router should accept or reject that action onchain.
