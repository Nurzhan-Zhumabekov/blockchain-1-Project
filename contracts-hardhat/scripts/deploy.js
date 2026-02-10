const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Token = await hre.ethers.getContractFactory("CharityToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("CharityToken deployed to:", tokenAddress);

  const Crowdfunding = await hre.ethers.getContractFactory("CharityCrowdfunding");
  const crowdfunding = await Crowdfunding.deploy(tokenAddress);
  await crowdfunding.waitForDeployment();

  const crowdfundingAddress = await crowdfunding.getAddress();
  console.log("CharityCrowdfunding deployed to:", crowdfundingAddress);

  const tx = await token.transferOwnership(crowdfundingAddress);
  await tx.wait();

  console.log("Ownership transferred to Crowdfunding contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
