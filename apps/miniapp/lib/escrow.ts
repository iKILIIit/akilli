import { encodeFunctionData, parseUnits } from "viem";

export const ESCROW_ADDRESS = "0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6" as const;
export const USDC_ADDRESS   = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDT_ADDRESS   = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;

export const ESCROW_ABI = [
  {
    name: "createOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token",      type: "address" },
      { name: "recipient",  type: "address" },
      { name: "amount",     type: "uint256" },
      { name: "targetRate", type: "uint256" },
      { name: "currency",   type: "string"  },
    ],
    outputs: [{ name: "orderId", type: "bytes32" }],
  },
  {
    name: "cancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "getOrderIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Encodes `targetRate` as integer × 100 to preserve 2 decimal places. */
export function encodeRate(rate: number): bigint {
  return BigInt(Math.round(rate * 100));
}

type EthRequest = (args: { method: string; params?: unknown[] }) => Promise<unknown>;

function getEthRequest(): EthRequest {
  const eth = window.ethereum;
  if (!eth?.request) throw new Error("No wallet found");
  return eth.request.bind(eth) as EthRequest;
}

/**
 * Step 1: approve the escrow to spend tokens.
 * Step 2: call createOrder.
 * Both go through window.ethereum → MiniPay biometric prompt.
 */
export async function lockInEscrow(params: {
  token: "USDC" | "USDT";
  recipient: string;
  amountUSD: number;
  targetRate: number;
  currency: string;
  account: string;
}): Promise<{ approveTx: string; orderTx: string }> {
  const request = getEthRequest();
  const tokenAddress = params.token === "USDC" ? USDC_ADDRESS : USDT_ADDRESS;
  // USDC and USDT on Celo both use 6 decimals
  const amountRaw = parseUnits(params.amountUSD.toFixed(6), 6);
  const rateEncoded = encodeRate(params.targetRate);

  // Step 1 — ERC-20 approve
  const approveData = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [ESCROW_ADDRESS, amountRaw],
  });

  const approveTx = await request({
    method: "eth_sendTransaction",
    params: [{ from: params.account, to: tokenAddress, data: approveData }],
  }) as string;

  // Step 2 — createOrder
  const orderData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: "createOrder",
    args: [
      tokenAddress,
      params.recipient as `0x${string}`,
      amountRaw,
      rateEncoded,
      params.currency,
    ],
  });

  const orderTx = await request({
    method: "eth_sendTransaction",
    params: [{ from: params.account, to: ESCROW_ADDRESS, data: orderData }],
  }) as string;

  return { approveTx, orderTx };
}
