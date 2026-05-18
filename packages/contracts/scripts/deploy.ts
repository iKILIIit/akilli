import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PolicyRouter with account:", deployer.address);

  const PolicyRouter = await ethers.getContractFactory("PolicyRouter");
  const router = await PolicyRouter.deploy(deployer.address);
  await router.waitForDeployment();

  const address = await router.getAddress();
  console.log("PolicyRouter deployed to:", address);
  console.log("Owner:", deployer.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
