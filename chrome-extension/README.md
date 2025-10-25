# LynQ Chrome Extension

Send PYUSD to Twitter users via their social handles - instantly and seamlessly.

## Features

- 🔗 Detects linked Ethereum wallets on Twitter profiles
- 💰 Send PYUSD directly from Twitter
- 🔐 Shares authentication with webapp
- ⚡ Powered by MetaMask wallet
- 🌐 Works on Ethereum Sepolia testnet

## Installation

### Development Mode

1. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. **Grant permissions**:
   - The extension will request permissions for Twitter and localhost

## Usage

### 1. Sign in to Webapp

First, visit http://localhost:3000 and sign in with MetaMask:
- Click "Connect Wallet"
- Approve the connection in MetaMask
- Sign the authentication message

### 2. Link Social Accounts

On the dashboard:
- Link your Twitter account
- The admin can link accounts for users

### 3. Use on Twitter

1. Visit any Twitter profile
2. If the user has linked their wallet, you'll see a "Pay with LynQ" button
3. Click the button to open the payment modal
4. Enter PYUSD amount
5. Click "Send PYUSD"
6. Approve the transaction in MetaMask

## How It Works

### Architecture

```
Twitter Profile
    ↓
Content Script (detects profile)
    ↓
Background Script (checks API)
    ↓
API: /api/social/find-wallet
    ↓
If linked: Show "Pay with LynQ" button
    ↓
User clicks → Payment Modal
    ↓
Connect to MetaMask wallet
    ↓
API: /api/tokens/build-transaction
    ↓
Injected Script sends transaction via MetaMask
    ↓
MetaMask signs transaction
    ↓
Transaction sent to Ethereum
    ↓
Wait for confirmation
    ↓
Display success with Etherscan link
```

### Smart Contract Integration

The extension uses the **SocialLinking smart contract** to handle token transfers:

1. **Wallet Lookup**: Checks if Twitter handle is linked to an Ethereum wallet
2. **Transaction Building**: 
   - For linked accounts: Direct PYUSD transfer
   - For unlinked accounts: Two-step process (approve + sendTokenToUnlinked)
3. **Signing**: User signs the transaction in MetaMask
4. **Confirmation**: Extension waits for on-chain confirmation

### Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for API calls
- `content.js` - Injected into Twitter pages
- `content.css` - Styles for buttons and modal
- `injected.js` - Accesses MetaMask in page context
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic

## Configuration

### Change API URL

For production, update the API URL in:

1. `background.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

2. `content.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

3. `popup.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

4. `manifest.json`:
```json
"host_permissions": [
  "https://your-domain.com/*"
]
```

### PYUSD Token Address

The extension uses Sepolia PYUSD. For mainnet, update in your environment:

```env
NEXT_PUBLIC_PYUSD_ADDRESS="0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
```

## Testing

### Test Flow

1. **Setup**:
   - Install extension
   - Sign in to webapp with MetaMask
   - Link a Twitter account

2. **Test on Twitter**:
   - Visit the linked Twitter profile
   - Verify "Pay with LynQ" button appears
   - Click button and check modal opens

3. **Test Payment**:
   - Enter amount (e.g., 1 PYUSD)
   - Click "Send PYUSD"
   - Approve in MetaMask
   - Verify transaction on Etherscan

### Debug Mode

Open Chrome DevTools:
- Right-click extension icon → "Inspect popup"
- On Twitter: Right-click → "Inspect" → Console tab
- Check for console logs starting with "🚀"

## Troubleshooting

### Button not appearing

- Check console for errors
- Verify user has linked their Twitter account
- Try refreshing the page
- Check if you're signed in to the webapp

### "MetaMask wallet not found"

- Install MetaMask extension
- Make sure MetaMask is unlocked
- Refresh the page

### "Please sign in to the webapp first"

- Visit http://localhost:3000
- Sign in with MetaMask
- Return to Twitter and try again

### Transaction failing

- Check you have PYUSD in your wallet
- Verify you're on the correct network (Sepolia)
- Check you have ETH for gas fees
- View transaction on Etherscan for details

## Security

- ✅ Session cookies are HttpOnly
- ✅ API calls require authentication
- ✅ Transactions signed by user's MetaMask wallet
- ✅ No private keys stored in extension
- ⚠️ Only use on Sepolia testnet for testing
- ⚠️ Audit before mainnet deployment

## Publishing

### Chrome Web Store

1. Create icons (16x16, 48x48, 128x128)
2. Update manifest.json with production URLs
3. Create a developer account
4. Package extension as ZIP
5. Upload to Chrome Web Store
6. Submit for review

### Firefox Add-ons

1. Update manifest to v2 (Firefox doesn't fully support v3 yet)
2. Create account on addons.mozilla.org
3. Submit for review

## Development

### Adding Features

**Support more platforms**:
- Add Instagram/LinkedIn detection in `content.js`
- Update API calls to use correct platform

**Add token selection**:
- Modify modal to show token dropdown
- Update API to accept token address

**Add transaction history**:
- Create new API endpoint
- Add history view in popup

## License

MIT

## Support

Built with ❤️ using Ethereum and PYUSD
