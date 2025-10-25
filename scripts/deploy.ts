import hre from "hardhat";
const { ethers, network } = hre;

// PYUSD Token Addresses (from https://github.com/paxosglobal/pyusd-contract)
const PYUSD_ADDRESSES: Record<string, string> = {
  mainnet: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  sepolia: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  // Base networks - PYUSD not yet officially deployed
  // You'll need to bridge PYUSD or wait for official deployment
  base: "",
  baseSepolia: "",
};

async function main() {
  console.log(`Deploying SocialLinking contract to ${network.name}...`);

  // Get PYUSD address for current network
  const pyusdAddress = process.env.PYUSD_TOKEN_ADDRESS || PYUSD_ADDRESSES[network.name];

  if (!pyusdAddress) {
    throw new Error(
      `PYUSD address not configured for network: ${network.name}\n` +
      `Please set PYUSD_TOKEN_ADDRESS in your .env file or deploy to a supported network.\n` +
      `Supported networks: mainnet (Ethereum), sepolia\n` +
      `For Base networks, you'll need to bridge PYUSD or wait for official deployment.`
    );
  }

  console.log(`Using PYUSD token at: ${pyusdAddress}`);

  // Deploy SocialLinking contract
  const SocialLinking = await ethers.getContractFactory("SocialLinking");
  const socialLinking = await SocialLinking.deploy(pyusdAddress);
  await socialLinking.waitForDeployment();
  const socialLinkingAddress = await socialLinking.getAddress();

  console.log(`\n✅ SocialLinking deployed to: ${socialLinkingAddress}`);
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`Network: ${network.name}`);
  console.log(`PYUSD Token: ${pyusdAddress}`);
  console.log(`SocialLinking Contract: ${socialLinkingAddress}`);
  console.log("\nUpdate your .env file with:");
  console.log(`NEXT_PUBLIC_SOCIAL_LINKING_ADDRESS=${socialLinkingAddress}`);
  console.log(`NEXT_PUBLIC_PYUSD_ADDRESS=${pyusdAddress}`);
  
  if (network.name === "sepolia") {
    console.log("\n💡 Get testnet PYUSD from: https://faucet.paxos.com/");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
