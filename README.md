# MiniPay Yield Copilot

MiniPay Yield Copilot is a MiniPay-first decision product for users holding
stablecoins on Celo. Instead of showing a long list of protocols and APYs, it
asks a few simple questions and returns one clear recommendation, one backup
option, and a plain-language action plan.

The product is designed for people who want help deciding whether to:

- stay liquid inside MiniPay
- use a MiniPay-native earning path
- move into a narrowly approved third-party venue on Celo

## What problem it solves

Most yield products optimize for power users. MiniPay users need something much
simpler: a safe, understandable answer about where idle stablecoins should live
right now.

This product focuses on:

- clarity over protocol sprawl
- risk framing before APY chasing
- MiniPay-native paths before external venues
- deterministic recommendations instead of opaque scoring

## Product experience

The current experience follows a tight loop:

1. User selects token, amount, goal, time horizon, and risk comfort.
2. The system evaluates the supported venues for that exact input.
3. The app returns one top recommendation and one backup.
4. The user sees risk labels, rationale, and concrete execution steps.
5. The app can also show a lightweight position and alerts view after deposit.

## Current MVP scope

The repository already includes a working scaffold for:

- a mobile-first MiniPay mini app built with Next.js App Router
- a lightweight Node API for recommendations and execution plans
- deterministic venue ranking logic in shared TypeScript packages
- legal, privacy, and support routes needed for Mini App submission prep
- active position and monitoring-oriented alert screens

Current supported venue set:

- Stay liquid in MiniPay
- MiniPay Boost
- Kiln in MiniPay
- Direct Celo Lending

Important: the project currently uses mock venue metadata and deterministic
logic to validate the core product flow. It is not wired to production yield
sources yet.

## Decision model

The recommendation engine is intentionally narrow and explainable.

It scores venues using:

- the user's goal: `keep-flexible`, `earn-more`, or `save-safely`
- risk comfort
- token support
- time horizon versus lockup constraints
- liquidity profile
- venue type: liquid, native, or third-party
- yield as one factor, not the only factor

The output is designed to answer:

- What is the best fit right now?
- Why is it the best fit?
- What is the safer or more flexible fallback?
- What should the user do next inside MiniPay?

## Monorepo structure

```text
apps/
  miniapp/   Next.js MiniPay-facing frontend
  api/       Node HTTP API for recommendations, venues, positions, and execution plans
packages/
  agents/    deterministic ranking, risk, execution, and monitoring logic
  celo/      Celo chain metadata, MiniPay helpers, and venue adapter contracts
  shared/    schemas, constants, enums, types, and env parsing
  ui/        shared presentation helpers
docs/        product, architecture, and integration notes
```

## How the system is split

- `apps/miniapp` keeps the user experience thin and mobile-first.
- `apps/api` exposes the recommendation and execution surface as JSON.
- `packages/agents` contains the product logic that ranks venues and explains why.
- `packages/shared` prevents the API and UI from drifting apart on request and response shapes.
- `packages/celo` is where live chain and venue integrations can be added over time.

## Quick start

### Requirements

- Node.js 20+
- `pnpm` 10+

### Install

```bash
pnpm install
cp .env.example .env
```

### Run both apps

```bash
pnpm dev
```

### Run them separately

```bash
pnpm dev:miniapp
pnpm dev:api
```

Expected local services:

- mini app: `http://localhost:3000`
- API: `http://localhost:4000`

## Deploy on Vercel

The current MVP frontend can be deployed to Vercel now.

- Deploy `apps/miniapp` as its own Vercel project
- Use the `Next.js` framework preset
- Set the project's Root Directory to `apps/miniapp`
- Use Node.js 20 or newer
- Keep the Install Command on Vercel's default `pnpm install`
- Set the Build Command to `pnpm build`
- Keep the API in `apps/api` on a separate host unless you convert it to Vercel Functions or Next route handlers

Recommended environment variables for the Vercel project:

```bash
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEFAULT_CHAIN=celo
NEXT_PUBLIC_MINIPAY_ONLY=false
NEXT_PUBLIC_SUPPORT_EMAIL=support@yieldcopilot.app
ANTHROPIC_API_KEY=your_server_side_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Notes:

- The current recommendation flow is generated inside the Next app, so the frontend does not require the separate API to be deployed
- The Node server in `apps/api` is not deployable to Vercel as a long-running process in its current form
- `ANTHROPIC_API_KEY` must stay server-side and must not use a `NEXT_PUBLIC_` prefix

## Onchain guardrails

The repository now includes a scaffolded onchain policy layer for execution
guardrails:

- shared action and execution request types in `packages/shared`
- Celo-side router ABI and request builders in `packages/celo/src/policy-router.ts`
- Solidity policy router scaffold in `packages/contracts/src/PolicyRouter.sol`

The intended split is:

- Anthropic proposes a structured recommendation
- shared schemas validate the model output
- the app maps the selected venue into a narrow policy action
- the onchain router enforces whether that action is allowed

## Environment variables

The project ships with the following local defaults:

```bash
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEFAULT_CHAIN=celo
NEXT_PUBLIC_MINIPAY_ONLY=false
NEXT_PUBLIC_SUPPORT_EMAIL=support@yieldcopilot.app
API_BASE_URL=http://localhost:4000
PORT=4000
```

## API routes

The current API surface is intentionally small:

- `GET /health`
- `GET /venues`
- `POST /recommend`
- `POST /execution-plan`
- `GET /positions/:address`

Example recommendation request:

```bash
curl -X POST http://localhost:4000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000000",
    "token": "USDC",
    "amount": "150",
    "goal": "save-safely",
    "timeHorizonDays": 30,
    "riskComfort": "low"
  }'
```

## Product principles

This repo is opinionated about what a MiniPay yield decision tool should be:

- recommendation-first, not dashboard-first
- risk-aware, not APY-maximizing by default
- MiniPay-native before third-party routing
- explainable enough for users to understand the tradeoff they are taking

## Roadmap direction

The next layer of work is clear:

- replace mock venue data with real availability and quote adapters
- connect MiniPay runtime and wallet state more deeply
- validate execution flows for MiniPay-native venues
- tighten monitoring and alerts around rate drift and exit friction
- expand legal, compliance, and support content before production use

## Docs

- [PRD](docs/prd.md)
- [Architecture](docs/architecture.md)
- [Integrations](docs/integrations.md)

## Status

This is an MVP scaffold for proving the core user journey:

`open app -> answer intake -> get recommendation -> review action plan`
