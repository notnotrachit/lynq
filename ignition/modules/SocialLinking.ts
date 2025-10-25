import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// PYUSD Token Addresses (from https://github.com/paxosglobal/pyusd-contract)
const PYUSD_ADDRESSES: Record<string, string> = {
  mainnet: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  sepolia: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  // Base networks - PYUSD not yet officially deployed
  base: "",
  baseSepolia: "",
};

const SocialLinkingModule = buildModule("SocialLinkingModule", (m) => {
  // Get PYUSD address from parameters or use default for the network
  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    PYUSD_ADDRESSES.sepolia // Default to Sepolia PYUSD
  );

  const socialLinking = m.contract("SocialLinking", [pyusdAddress]);

  return { socialLinking };
});

export default SocialLinkingModule;
