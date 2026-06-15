# Contracts

Onchain infrastructure for Akili — policy guardrails and FX-triggered escrow execution.

## PolicyRouter.sol

Deployed: [`0x0c0345b3DFBFFD4300255F9DB933A4751cCD2124`](https://celoscan.io/address/0x0c0345b3DFBFFD4300255F9DB933A4751cCD2124) (Celo Mainnet)

Enforces guardrails on Akili's financial recommendations:

- Token allowlists and venue allowlists
- Per-venue amount caps and user risk-score minimums
- Quote freshness and cooldown periods
- Recipient matching and pause controls
- `IYieldVenueExecutor` — adapter surface venue executors must implement

The LLM proposes an action off-chain; the router accepts or rejects it on-chain.

## AkiliEscrow.sol

Deployed: [`0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6`](https://celoscan.io/address/0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6) (Celo Mainnet)

FX-triggered escrow for autonomous remittance execution:

- User deposits USDC or USDT with a target FX rate, recipient address, and currency
- Akili's backend executor wallet calls `execute(orderId, currentRate)` when the live rate meets the target
- Funds transfer directly to the recipient — no custodial risk, no user private key exposure
- User can `cancel()` at any time to receive a full refund
- Rate is encoded as integer × 100 to preserve two decimal places without floating-point issues

### Deploy

```bash
DEPLOYER_PRIVATE_KEY=... npx hardhat run scripts/deploy-escrow.ts --network celo
```

The deployer wallet is set as both owner and initial executor. Rotate the executor via `setExecutor()` once a dedicated backend key is provisioned.
