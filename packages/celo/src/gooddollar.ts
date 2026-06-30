import { ADDRESSES } from "./addresses";

const CELO_RPC = "https://forno.celo.org";

// ── ABIs (minimal) ────────────────────────────────────────────────────────────

const UBI_SCHEME_ABI = [
  {
    name: "checkEntitlement",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "currentDay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

const IDENTITY_ABI = [
  {
    name: "isWhitelisted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

// ── RPC helper ────────────────────────────────────────────────────────────────

const RPC_TIMEOUT_MS = 10_000;

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(CELO_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"]
    }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  const json = (await res.json()) as { result: string; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

type RpcLog = {
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
};

// ── ABI encode helpers (no ethers dependency) ─────────────────────────────────

function encodeCall(selector: string, address: string): string {
  // selector (4 bytes) + address padded to 32 bytes
  return selector + address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function decodeUint256(hex: string): bigint {
  if (!hex || hex === "0x" || hex === "0x0") return 0n;
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) return 0n; // malformed RPC response — fail safe
  return BigInt(hex);
}

function decodeBool(hex: string): boolean {
  return hex !== "0x" && BigInt(hex) !== 0n;
}

// keccak256 selectors (first 4 bytes of keccak256(signature))
const SEL_CHECK_ENTITLEMENT = "0x1a787f2e"; // checkEntitlement(address)
const SEL_IS_WHITELISTED    = "0x3af32abf"; // isWhitelisted(address)
const SEL_BALANCE_OF        = "0x70a08231"; // balanceOf(address)
const SEL_CURRENT_DAY       = "0x5c9302c9"; // currentDay()

// keccak256("UBIClaimed(address,uint256)")
const TOPIC_UBI_CLAIMED = "0x89ed24731df6b066e4c5186901fffdba18cd9a10f07494aff900bdee260d1304";

// ── Public API ────────────────────────────────────────────────────────────────

export type GDStatus = {
  address: string;
  isVerified: boolean;
  gdBalance: string;         // G$ balance formatted (2 decimals)
  gdBalanceRaw: bigint;
  entitlement: string;       // G$ claimable right now
  entitlementRaw: bigint;
  checkedAt: string;
};

export type UBIClaimEvent = {
  claimer: string;
  amount: string;            // G$ formatted
  amountRaw: bigint;
  transactionHash: string;
  blockNumber: number;
  date: string;              // YYYY-MM-DD from Blockscout
  timestamp: number;         // unix seconds
};

export type GDProtocolStats = {
  currentDay: number;
  reserveBalanceRaw: bigint;
  checkedAt: string;
};

export async function getGDStatus(walletAddress: string): Promise<GDStatus> {
  const [entitlementHex, isVerifiedHex, balanceHex] = await Promise.all([
    ethCall(ADDRESSES.GD_UBI_SCHEME, encodeCall(SEL_CHECK_ENTITLEMENT, walletAddress)),
    ethCall(ADDRESSES.GD_IDENTITY,   encodeCall(SEL_IS_WHITELISTED,    walletAddress)),
    ethCall(ADDRESSES.GD_TOKEN,      encodeCall(SEL_BALANCE_OF,        walletAddress))
  ]);

  const entitlementRaw = decodeUint256(entitlementHex);
  const gdBalanceRaw   = decodeUint256(balanceHex);
  const isVerified     = decodeBool(isVerifiedHex);

  return {
    address: walletAddress,
    isVerified,
    gdBalance:     formatGD(gdBalanceRaw),
    gdBalanceRaw,
    entitlement:   formatGD(entitlementRaw),
    entitlementRaw,
    checkedAt:     new Date().toISOString()
  };
}

// Fetch UBIClaimed events for a specific claimer using Blockscout's event log API.
// The UBIScheme emits UBIClaimed(address indexed claimer, uint256 amount).
// We filter server-side by matching topic1 = padded wallet address.
export async function fetchUBIClaimHistory(
  walletAddress: string,
  days = 90
): Promise<UBIClaimEvent[]> {
  const fromBlock = await approximateBlockFromDaysAgo(days);

  const paddedAddress = "0x" + walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");

  const res = await fetch(CELO_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        address: ADDRESSES.GD_UBI_SCHEME,
        topics: [TOPIC_UBI_CLAIMED, paddedAddress],
        fromBlock: "0x" + fromBlock.toString(16),
        toBlock: "latest"
      }]
    }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });

  const json = (await res.json()) as { result?: RpcLog[]; error?: { message: string } };

  if (json.error || !Array.isArray(json.result)) return [];

  // Fetch block timestamps from Blockscout for accurate dates
  const blockNumbers = [...new Set(json.result.map(l => parseInt(l.blockNumber, 16)))];
  const blockTimestamps = await fetchBlockTimestamps(blockNumbers);

  return json.result.map(log => {
    const amountRaw = decodeUint256(log.data);
    const blockNumber = parseInt(log.blockNumber, 16);
    const timestamp = blockTimestamps.get(blockNumber) ?? 0;
    const date = timestamp
      ? new Date(timestamp * 1000).toISOString().slice(0, 10)
      : "";
    return {
      claimer: walletAddress,
      amount: formatGD(amountRaw),
      amountRaw,
      transactionHash: log.transactionHash,
      blockNumber,
      date,
      timestamp,
    };
  });
}

// Fetch block timestamps via Blockscout API (batched, unique blocks only)
async function fetchBlockTimestamps(blockNumbers: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  // Blockscout supports eth_getBlockByNumber — batch via individual calls in parallel (max 10)
  const slice = blockNumbers.slice(0, 10);
  await Promise.all(slice.map(async (bn) => {
    try {
      const res = await fetch(CELO_RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: bn,
          method: "eth_getBlockByNumber",
          params: ["0x" + bn.toString(16), false]
        }),
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
      });
      const json = (await res.json()) as { result?: { timestamp: string } };
      if (json.result?.timestamp) {
        map.set(bn, parseInt(json.result.timestamp, 16));
      }
    } catch { /* skip — date will be empty */ }
  }));
  return map;
}

export async function getGDProtocolStats(): Promise<GDProtocolStats> {
  const [currentDayHex, reserveBalanceHex] = await Promise.all([
    ethCall(ADDRESSES.GD_UBI_SCHEME, SEL_CURRENT_DAY),
    ethCall(ADDRESSES.GD_TOKEN, encodeCall(SEL_BALANCE_OF, ADDRESSES.GD_RESERVE))
  ]);

  return {
    currentDay:         Number(decodeUint256(currentDayHex)),
    reserveBalanceRaw:  decodeUint256(reserveBalanceHex),
    checkedAt:          new Date().toISOString()
  };
}

// ── Internals ─────────────────────────────────────────────────────────────────

// G$ has 2 decimals on Celo
function formatGD(raw: bigint): string {
  return (Number(raw) / 100).toFixed(2);
}

// Celo produces ~1 block every 5 seconds → 17,280 blocks/day
async function approximateBlockFromDaysAgo(days: number): Promise<number> {
  const res = await fetch(CELO_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "eth_blockNumber", params: []
    }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  const json = (await res.json()) as { result: string };
  const latest = parseInt(json.result, 16);
  return Math.max(0, latest - days * 17_280);
}
