# Integrations

## Current state

The scaffold uses mock venue metadata so sprint 1 can prove the decision flow
before production integrations are added.

## Planned integrations

- MiniPay runtime detection and wallet auto-connect
- MiniPay Boost availability and quote adapter
- Kiln availability and execution adapter
- one direct third-party Celo venue only if the user journey remains simple

## Adapter contract

Each venue should implement the `YieldVenueAdapter` interface in
`packages/celo/src/venues/adapter.ts` so the recommendation engine can consume a
uniform quote, risk, and execution surface.
