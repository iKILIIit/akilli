import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const registryAbi = parseAbi([
  "function register(string calldata agentURI) external returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event AgentRegistered(address indexed owner, uint256 indexed tokenId, string agentURI)"
]);

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const agentURI =
    process.env.AGENT_URI ??
    "https://akilii.xyz/agent.json";

  if (!privateKey) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY not set. Export your wallet private key (without 0x prefix)."
    );
  }

  const account = privateKeyToAccount(`0x${privateKey}`);
  console.log(`Registering agent from ${account.address}`);
  console.log(`Agent URI: ${agentURI}`);

  const transport = http("https://forno.celo.org");

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport
  });

  const publicClient = createPublicClient({
    chain: celo,
    transport
  });

  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: registryAbi,
    functionName: "register",
    args: [agentURI]
  });

  console.log(`Tx submitted: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const registeredLog = receipt.logs.find((log) => {
    try {
      return log.address.toLowerCase() === IDENTITY_REGISTRY.toLowerCase();
    } catch {
      return false;
    }
  });

  console.log(`\n✓ Agent registered on Celo mainnet (ERC-8004)`);
  console.log(`  Registry:  ${IDENTITY_REGISTRY}`);
  console.log(`  Owner:     ${account.address}`);
  console.log(`  Agent URI: ${agentURI}`);
  console.log(`  Tx hash:   ${hash}`);
  console.log(`  Block:     ${receipt.blockNumber}`);
  if (registeredLog) {
    console.log(`  Log index: ${registeredLog.logIndex}`);
  }
  console.log(`\n  Celoscan: https://celoscan.io/tx/${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
