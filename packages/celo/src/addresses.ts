// Verified Celo mainnet contract addresses for Akili

export const ADDRESSES = {
  // ERC-8004 agent identity registry
  ERC8004_REGISTRY: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,

  // Stablecoins (Celo mainnet)
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,

  // CIP-64 fee currency adapters (use these for feeCurrency, NOT token addresses)
  USDC_FEE_ADAPTER: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`,
  USDT_FEE_ADAPTER: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72" as `0x${string}`,

  // GoodDollar protocol (Celo mainnet)
  GD_TOKEN:      "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as `0x${string}`,
  GD_UBI_SCHEME: "0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1" as `0x${string}`,
  GD_IDENTITY:   "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as `0x${string}`,
  GD_RESERVE:    "0x94A3240f484A04F5e3d524f528d02694c109463b" as `0x${string}`,
  GD_NAME_SERVICE: "0x0F5dB7a64A6a64052693676CA898EC7F7A94FF4e" as `0x${string}`
} as const;
