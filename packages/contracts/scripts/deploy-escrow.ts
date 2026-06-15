import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AkiliEscrow with:", deployer.address);

  // The executor is the same wallet doing the deployment for now.
  // Rotate via setExecutor() once a dedicated backend key is set up.
  const executorAddress = process.env.EXECUTOR_ADDRESS ?? deployer.address;
  console.log("Executor:", executorAddress);

  const AkiliEscrow = await ethers.getContractFactory("AkiliEscrow");
  const escrow = await AkiliEscrow.deploy(executorAddress);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("AkiliEscrow deployed to:", address);
  console.log(`Celoscan: https://celoscan.io/address/${address}`);

  // Update deployments/celo.json
  const deploymentsPath = join(__dirname, "../deployments/celo.json");
  const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));

  deployments.contracts.AkiliEscrow = {
    address,
    executor: executorAddress,
    celoscan: `https://celoscan.io/address/${address}`,
    deployedAt: new Date().toISOString().split("T")[0],
  };

  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("Updated deployments/celo.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
