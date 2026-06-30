import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "CELO");

  // ── Deploy AkiliLog ───────────────────────────────────────────────────────
  console.log("\nDeploying AkiliLog...");
  const AkiliLog = await ethers.getContractFactory("AkiliLog");
  const log = await AkiliLog.deploy();
  await log.waitForDeployment();
  const logAddress = await log.getAddress();
  console.log("AkiliLog deployed to:", logAddress);
  console.log(`Celoscan: https://celoscan.io/address/${logAddress}`);

  // ── Deploy AkiliCredits ───────────────────────────────────────────────────
  // Agent = deployer for now; rotate via setAgent() once backend key is ready
  const agentAddress = process.env.AGENT_ADDRESS ?? deployer.address;
  console.log("\nDeploying AkiliCredits...");
  console.log("Agent:", agentAddress);
  const AkiliCredits = await ethers.getContractFactory("AkiliCredits");
  const credits = await AkiliCredits.deploy(agentAddress);
  await credits.waitForDeployment();
  const creditsAddress = await credits.getAddress();
  console.log("AkiliCredits deployed to:", creditsAddress);
  console.log(`Celoscan: https://celoscan.io/address/${creditsAddress}`);

  // ── Update deployments/celo.json ──────────────────────────────────────────
  const deploymentsPath = join(__dirname, "../deployments/celo.json");
  const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
  const today = new Date().toISOString().split("T")[0];

  deployments.contracts.AkiliLog = {
    address: logAddress,
    owner: deployer.address,
    celoscan: `https://celoscan.io/address/${logAddress}`,
    deployedAt: today,
  };

  deployments.contracts.AkiliCredits = {
    address: creditsAddress,
    agent: agentAddress,
    owner: deployer.address,
    celoscan: `https://celoscan.io/address/${creditsAddress}`,
    deployedAt: today,
  };

  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\nUpdated deployments/celo.json");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
