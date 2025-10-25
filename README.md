# LynQ - Social Crypto Payments

Send PYUSD to social media handles instantly. Link your Ethereum wallet and pay anyone on Twitter, Instagram, or LinkedIn.

## Features

- 🔗 **Link Social Accounts** - Connect your Twitter (via OAuth), Instagram, or LinkedIn to your Ethereum wallet
- 🔐 **OAuth Verification** - Twitter accounts verified through official OAuth 2.0 (not just usernames!)
- 💸 **Send to Handles** - Send PYUSD directly to social media handles (even if they're not linked yet)
- 🎁 **Claim Pending Funds** - Receive PYUSD sent to your social handles
- 🦊 **MetaMask Integration** - Secure wallet authentication and transactions
- 🌐 **Ethereum + PYUSD** - Built on Ethereum Sepolia testnet with PYUSD stablecoin

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS
- **Blockchain**: Ethereum (Sepolia), Hardhat, Ethers.js
- **Smart Contracts**: Solidity
- **Token**: PYUSD (PayPal USD)
- **Extension**: Chrome Extension for Twitter/X integration

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask wallet
- Sepolia ETH (for gas fees)
- Sepolia PYUSD (for testing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lynq.git
cd lynq
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (copy from `env.example`):
```env
AUTH_JWT_SECRET="your-long-random-secret"
ADMIN_WALLET_PRIVATE_KEY="your-admin-wallet-private-key"
NEXT_PUBLIC_SOCIAL_LINKING_ADDRESS="0xF587C909Ce3F9e63812db3744Eb32C12Ee95c29e"
NEXT_PUBLIC_PYUSD_ADDRESS="0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"

# Twitter OAuth (required for Twitter linking)
TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"
TWITTER_REDIRECT_URI="http://localhost:3000/api/oauth/twitter/callback"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**📖 See [TWITTER_OAUTH_SETUP.md](./TWITTER_OAUTH_SETUP.md) for detailed Twitter OAuth setup instructions**

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Chrome Extension

1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. Visit Twitter/X and you'll see LynQ badges on profiles!

## Smart Contracts

The project uses a custom `SocialLinking` contract deployed on Ethereum Sepolia:

- **Contract Address**: `0xF587C909Ce3F9e63812db3744Eb32C12Ee95c29e`
- **PYUSD Address**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`

### Deploy Contracts

```bash
npm run hardhat:compile
npm run hardhat:deploy:sepolia
```

## How It Works

1. **Link Your Account**: Connect your wallet and verify your Twitter account via OAuth
2. **Send PYUSD**: Use the Chrome extension to send PYUSD to any Twitter handle
3. **Pending Claims**: If the recipient hasn't linked their account, funds are held in the contract
4. **Claim Funds**: Recipients verify their Twitter account and claim their PYUSD

### Twitter OAuth Flow

```
User → "Connect Twitter" → Twitter Login → Authorize App → 
Verified Username → Blockchain Transaction → Linked! ✅
```

This ensures users actually own the Twitter accounts they're linking (not just claiming random handles).

## Architecture

```
┌─────────────────┐
│  Chrome Ext     │ ──> Injects UI on Twitter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next.js App    │ ──> Dashboard, API routes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Smart Contract │ ──> Social linking + PYUSD transfers
└─────────────────┘
```

## Development

```bash
# Run dev server
npm run dev

# Compile contracts
npm run hardhat:compile

# Run tests
npm run hardhat:test

# Deploy to Sepolia
npm run hardhat:deploy:sepolia
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ using Ethereum and PYUSD
