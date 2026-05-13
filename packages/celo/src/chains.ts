export const celoMainnet = {
  id: 42220,
  name: "Celo",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io"
} as const;

export const celoAlfajores = {
  id: 44787,
  name: "Alfajores",
  rpcUrl: "https://alfajores-forno.celo-testnet.org",
  explorerUrl: "https://alfajores.celoscan.io"
} as const;

export const supportedChains = [celoMainnet, celoAlfajores] as const;
