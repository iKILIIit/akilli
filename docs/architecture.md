# Architecture

## Monorepo split

- `apps/miniapp`: MiniPay UI shell, intake flow, recommendation view, position UI
- `apps/api`: JSON endpoints for recommendations, venues, execution plans, and positions
- `packages/shared`: schemas, enums, types, env parsing, and venue constants
- `packages/agents`: deterministic venue discovery, risk labels, ranking, execution, monitoring
- `packages/celo`: chain metadata, token metadata, MiniPay runtime detection, adapter interfaces
- `packages/ui`: shared presentation helpers for risk tones and class composition

## Recommendation flow

1. Frontend collects token, amount, goal, time horizon, and risk comfort.
2. `Yield Scout` discovers supported venues for the token.
3. `Risk Guard` attaches narrow risk labels with explicit reasons.
4. `Goal Planner` scores venues deterministically.
5. `Execution Agent` turns the recommendation into concrete next steps.
6. `Monitor Agent` derives alerts and position status after deposit.

## Why this shape

The Mini App stays thin. Most behavior is modeled in shared TypeScript packages
so the API and UI cannot silently drift apart during early iteration.
