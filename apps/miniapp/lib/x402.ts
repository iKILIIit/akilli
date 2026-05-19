import { createThirdwebClient } from "thirdweb";
import { celo } from "thirdweb/chains";
import { facilitator as createFacilitator, settlePayment } from "thirdweb/x402";

const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;

// Enabled only when both THIRDWEB_SECRET_KEY and AGENT_PAYMENT_RECIPIENT are set
export const X402_ENABLED = Boolean(
  process.env.THIRDWEB_SECRET_KEY && process.env.AGENT_PAYMENT_RECIPIENT
);

export async function handleX402(
  resourceUrl: string,
  method: string,
  paymentData: string | null
) {
  const client = createThirdwebClient({
    secretKey: process.env.THIRDWEB_SECRET_KEY!,
  });
  const payTo = process.env.AGENT_PAYMENT_RECIPIENT! as `0x${string}`;
  const thirdwebFacilitator = createFacilitator({ client, serverWalletAddress: payTo });

  return settlePayment({
    resourceUrl,
    method,
    paymentData,
    payTo,
    network: celo,
    // 0.01 USDC (6 decimals)
    price: { amount: "10000", asset: { address: USDC_ADDRESS, decimals: 6 } },
    facilitator: thirdwebFacilitator,
    routeConfig: {
      description: "Akili AI analysis — 0.01 USDC on Celo",
      mimeType: "application/json",
    },
  });
}
