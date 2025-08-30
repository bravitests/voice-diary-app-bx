const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VoiceDiaryPayments contract...");

  // Get the contract factory
  const VoiceDiaryPayments = await ethers.getContractFactory("VoiceDiaryPayments");

  // Deploy the contract
  const contract = await VoiceDiaryPayments.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("VoiceDiaryPayments deployed to:", contractAddress);

  // Get deployment transaction
  const deploymentTx = contract.deploymentTransaction();
  console.log("Deployment transaction hash:", deploymentTx.hash);

  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await deploymentTx.wait(5);

  console.log("Contract deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Owner address:", await contract.owner());
  console.log("PRO subscription price:", ethers.formatEther(await contract.subscriptionPrices(1)), "ETH");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentTxHash: deploymentTx.hash,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    owner: await contract.owner(),
    proPrice: ethers.formatEther(await contract.subscriptionPrices(1))
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Deployment info saved to deployment-${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });