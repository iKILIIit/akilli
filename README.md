# MiniPay Yield Copilot

MiniPay Yield Copilot is a MiniPay-first Mini App for helping users decide where
to keep stablecoins liquid or move them into simple, trusted earning options on
Celo. This repo is structured as a TypeScript monorepo so the recommendation
logic, venue adapters, API contracts, and frontend stay aligned.

## Workspace

```text
apps/
  miniapp/  Next.js App Router Mini App
  api/      lightweight Node API for recommendations and execution plans
packages/
  agents/   deterministic recommendation, risk, and monitoring logic
  celo/     Celo chain config, token metadata, and venue adapter contracts
  shared/   shared schemas, types, env parsing, and constants
  ui/       shared UI tokens and presentation helpers
docs/       PRD, architecture, and integration notes
```

## First sprint target

- MiniPay-aware app shell with mobile-first intake flow
- deterministic recommendation engine with one recommendation and one backup
- API endpoints for `recommend`, `venues`, `positions`, and `execution-plan`
- legal, privacy, and support pages required for Mini App submission

## Getting started

```bash
pnpm install
pnpm dev:miniapp
pnpm dev:api
```

The repo currently ships with mock venue data and deterministic scoring. It is
designed to prove the core path first:

`open app -> answer intake -> get recommendation -> review action plan`
