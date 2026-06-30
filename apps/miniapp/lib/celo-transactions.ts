// Celoscan V1 is deprecated — use Blockscout's Etherscan-compatible API (no key required)
const CELOSCAN_BASE = "https://celo.blockscout.com/api";

const KNOWN_TOKENS: Record<string, string> = {
  "0xceba9300f2b948710d2653dd7b07f33a8b32118c": "USDC",
  "0x617f3112bf5397d0467d315cc709ef968d9ba546": "USDT",
  "0x765de816845861e75a25fca122bb6898b8b1282a": "cUSD",
  "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73": "cEUR",
  "0xe8537a3d056da446677b9e9d6c5db704eaab4787": "cREAL",
  "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a": "G$"
};

// Hardcoded decimals for known tokens — don't trust tokenDecimal from Blockscout
const KNOWN_DECIMALS: Record<string, number> = {
  "0xceba9300f2b948710d2653dd7b07f33a8b32118c": 6,   // USDC
  "0x617f3112bf5397d0467d315cc709ef968d9ba546": 6,   // USDT
  "0x765de816845861e75a25fca122bb6898b8b1282a": 18,  // cUSD
  "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73": 18,  // cEUR
  "0xe8537a3d056da446677b9e9d6c5db704eaab4787": 18,  // cREAL
  "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a": 18,  // G$ (18 decimals on Celo mainnet)
};

// Label any recognised protocol address
const KNOWN_CONTRACTS: Record<string, string> = {
  // MiniPay Boost / savings yield — interest payments come from here
  "0x9b7c9c5b4033ef34f876f4afc76b6beaca46e4e1": "MiniPay Boost",
  "0x3b7b1e5f94d7b4f36bf5fb2d5b9e7e37a3f4c2d1": "MiniPay Boost",
  // Mento exchange
  "0x67316300f17f063085ca8bca4bd3f7a5a3c66275": "Mento",
  "0x7d3f3d3f4accc03ee32f9f4c4f94e8f3e1d7c4b2": "Mento",
  // Ubeswap
  "0x00be914168be31c5b5b314f0c3be5a28b9e00000": "Ubeswap",
  // Celo staking / lock gold
  "0x6cc083aed9e3ebe302a6336dbe7ef19d51a63156": "Celo Staking",
  // GoodDollar protocol
  "0x43d72ff17701b2da814620735c39c620ce0ea4a1": "GoodDollar UBI",
  "0xc361a6e67822a0edc17d899227dd9fc50bd62f42": "GoodDollar Identity",
  "0x94a3240f484a04f5e3d524f528d02694c109463b": "GoodDollar Reserve",
};

export type CeloTransaction = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  input: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  contractAddress?: string;
};

export type ParsedTransaction = {
  hash: string;
  timestamp: number;
  date: string;
  type: "received" | "sent" | "contract" | "failed";
  category: "transfer" | "defi" | "fee" | "unknown";
  amount: string;
  token: string;
  counterparty: string;
  counterpartyLabel: string;
  gasFeeUSD: string;
  raw: CeloTransaction;
};

export type WalletSummary = {
  address: string;
  transactions: ParsedTransaction[];
  totalReceived: Record<string, number>;
  totalSent: Record<string, number>;
  totalGasFeesUSD: number;
  uniqueContracts: string[];
  unknownContracts: string[];
  periodDays: number;
  fetchedAt: string;
};

async function celoscan(params: Record<string, string>): Promise<{ result: CeloTransaction[] }> {
  const url = new URL(CELOSCAN_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (process.env.CELOSCAN_API_KEY) url.searchParams.set("apikey", process.env.CELOSCAN_API_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Blockscout error: ${res.status}`);
  return res.json();
}

function labelAddress(address: string, walletAddress: string): string {
  const lower = address.toLowerCase();
  if (lower === walletAddress.toLowerCase()) return "Your wallet";
  return KNOWN_CONTRACTS[lower] ?? shortenAddress(address);
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatAmount(value: string, decimals = 18): string {
  const raw = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  const num = Number(whole) + Number(remainder) / Number(divisor);
  return num.toFixed(4);
}

// isTokenTx = true means this came from the tokentx endpoint (ERC-20 transfer event).
// In that case: to/from are the actual token sender/receiver, never classify as "contract".
function parseTx(tx: CeloTransaction, walletAddress: string, isTokenTx = false): ParsedTransaction {
  const wallet = walletAddress.toLowerCase();
  const isIncoming = tx.to?.toLowerCase() === wallet;
  const failed = tx.isError === "1";

  // Never treat ERC-20 transfer events as contract/defi — they are plain token sends/receives.
  const isContractCall = !isTokenTx && !failed && tx.input && tx.input !== "0x" && tx.input.length > 2;

  let type: ParsedTransaction["type"] = isIncoming ? "received" : "sent";
  if (failed) type = "failed";
  if (isContractCall && !isIncoming) type = "contract";

  const category: ParsedTransaction["category"] =
    failed ? "fee" :
    isContractCall ? "defi" :
    "transfer";

  const token = tx.tokenSymbol ??
    (KNOWN_TOKENS[tx.contractAddress?.toLowerCase() ?? ""] ?? "CELO");

  const contractKey = tx.contractAddress?.toLowerCase() ?? "";
  const decimals = KNOWN_DECIMALS[contractKey] ?? (tx.tokenDecimal ? Number(tx.tokenDecimal) : 18);
  const amount = formatAmount(tx.value || "0", decimals);

  const counterparty = isIncoming ? (tx.from ?? "") : (tx.to ?? "");
  const counterpartyLabel = labelAddress(counterparty, walletAddress);

  const gasWei = BigInt(tx.gasUsed || "0") * BigInt(tx.gasPrice || "0");
  const gasFeeUSD = (Number(gasWei) / 1e18 * 0.5).toFixed(6);

  const timestamp = Number(tx.timeStamp);
  const date = new Date(timestamp * 1000).toISOString().split("T")[0]!;

  return {
    hash: tx.hash,
    timestamp,
    date,
    type,
    category,
    amount,
    token,
    counterparty,
    counterpartyLabel,
    gasFeeUSD,
    raw: tx
  };
}

export async function fetchWalletData(
  walletAddress: string,
  days = 90
): Promise<WalletSummary> {
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 86400;

  const [nativeTxsResult, tokenTxsResult] = await Promise.allSettled([
    celoscan({
      module: "account",
      action: "txlist",
      address: walletAddress,
      sort: "desc",
      startblock: "0",
      endblock: "99999999"
    }),
    celoscan({
      module: "account",
      action: "tokentx",
      address: walletAddress,
      sort: "desc",
      startblock: "0",
      endblock: "99999999"
    })
  ]);

  const nativeRaw: CeloTransaction[] =
    nativeTxsResult.status === "fulfilled" && Array.isArray(nativeTxsResult.value.result)
      ? nativeTxsResult.value.result.filter(t => Number(t.timeStamp) >= startTimestamp)
      : [];

  const tokenRaw: CeloTransaction[] =
    tokenTxsResult.status === "fulfilled" && Array.isArray(tokenTxsResult.value.result)
      ? tokenTxsResult.value.result.filter(t => Number(t.timeStamp) >= startTimestamp)
      : [];

  // Token transfer hashes: skip native txlist entries for these hashes
  // (they show 0 CELO and just create noise — the tokentx entry has the real data)
  const tokenTxHashes = new Set(tokenRaw.map(t => t.hash));

  const parsedNative = nativeRaw
    .filter(tx => {
      // Keep native entries only if:
      // (a) not a token transfer hash, OR (b) has actual CELO value > 0
      return !tokenTxHashes.has(tx.hash) || (tx.value && tx.value !== "0");
    })
    .map(tx => parseTx(tx, walletAddress, false));

  const parsedToken = tokenRaw.map(tx => parseTx(tx, walletAddress, true));

  // Merge and deduplicate by hash + token symbol
  const seen = new Set<string>();
  const transactions = [...parsedToken, ...parsedNative]
    .filter(tx => {
      const key = `${tx.hash}-${tx.token}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  // Aggregate totals
  const totalReceived: Record<string, number> = {};
  const totalSent: Record<string, number> = {};
  let totalGasFeesUSD = 0;

  for (const tx of transactions) {
    const amt = parseFloat(tx.amount);
    if (isNaN(amt) || amt === 0) continue;
    if (tx.type === "received") {
      totalReceived[tx.token] = (totalReceived[tx.token] ?? 0) + amt;
    } else if (tx.type === "sent" || tx.type === "contract") {
      totalSent[tx.token] = (totalSent[tx.token] ?? 0) + amt;
    }
    totalGasFeesUSD += parseFloat(tx.gasFeeUSD);
  }

  const uniqueContracts = [
    ...new Set(
      transactions
        .filter(t => t.category === "defi")
        .map(t => t.counterparty.toLowerCase())
        .filter(Boolean)
    )
  ];

  const unknownContracts = uniqueContracts.filter(addr => !KNOWN_CONTRACTS[addr]);

  return {
    address: walletAddress,
    transactions,
    totalReceived,
    totalSent,
    totalGasFeesUSD,
    uniqueContracts,
    unknownContracts,
    periodDays: days,
    fetchedAt: new Date().toISOString()
  };
}
