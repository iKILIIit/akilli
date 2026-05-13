export type MiniPayRuntime = {
  isAvailable: boolean;
  isMiniPayProvider: boolean;
  walletAddress?: string;
};

type EthereumLike = {
  isMiniPay?: boolean;
  selectedAddress?: string | null;
};

export function detectMiniPayRuntime(
  ethereum?: EthereumLike,
  userAgent?: string
): MiniPayRuntime {
  const isMiniPayProvider = Boolean(ethereum?.isMiniPay);
  const isMiniPayUserAgent = Boolean(userAgent?.toLowerCase().includes("minipay"));
  const walletAddress = ethereum?.selectedAddress ?? undefined;

  return {
    isAvailable: isMiniPayProvider || isMiniPayUserAgent,
    isMiniPayProvider,
    ...(walletAddress ? { walletAddress } : {})
  };
}
