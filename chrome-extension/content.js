// Content script for Twitter/X integration

const API_BASE_URL = 'http://localhost:3000';
let processedProfiles = new Set();
let injectedScriptReady = false;

console.log('🚀 LynQ extension loaded on:', window.location.href);

// Inject script into page context to access window.ethereum
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function () {
    console.log('💉 Injected script loaded');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const { type, data } = event.data;

  if (type === 'LYNQ_INJECTED_READY') {
    injectedScriptReady = true;
    console.log('✅ Injected script ready');
  }

  if (type === 'LYNQ_METAMASK_STATUS') {
    window.cypherpunkMetaMaskStatus = data;
  }

  if (type === 'LYNQ_METAMASK_CONNECTED') {
    window.cypherpunkMetaMaskConnected = data;
  }

  if (type === 'LYNQ_TRANSACTION_SENT') {
    window.cypherpunkTransactionSent = data;
  }

  if (type === 'LYNQ_METAMASK_ERROR') {
    window.cypherpunkMetaMaskError = data;
  }
});

// Initialize
init();

function init() {
  console.log('🔧 Initializing extension...');

  // Inject script to access MetaMask
  injectScript();

  // Watch for profile changes (Twitter is a SPA)
  observeProfileChanges();

  // Process current page after a delay
  setTimeout(() => {
    console.log('⏰ Initial check...');
    processCurrentPage();
  }, 2000);
}

// Observe DOM changes for Twitter's dynamic content
function observeProfileChanges() {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;

    // Only process if URL changed (navigation happened)
    if (currentUrl !== lastUrl) {
      console.log('🔄 URL changed from', lastUrl, 'to', currentUrl);
      lastUrl = currentUrl;

      // Clear processed profiles on navigation
      processedProfiles.clear();

      // Wait for page to load
      setTimeout(() => {
        processCurrentPage();
      }, 2000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process the current page
async function processCurrentPage() {
  console.log('📄 Processing page:', window.location.pathname);

  // Check if we're on a profile page
  const isProfilePage = window.location.pathname.match(/^\/[^\/]+$/);
  console.log('🔍 Is profile page?', isProfilePage);

  if (isProfilePage) {
    const handle = extractTwitterHandle();
    console.log('👤 Extracted handle:', handle);

    if (handle && !processedProfiles.has(handle)) {
      console.log('✨ New profile detected:', handle);
      processedProfiles.add(handle);
      await checkAndAddEthereumButton(handle);
    } else if (handle) {
      console.log('⏭️ Profile already processed:', handle);
    } else {
      console.log('❌ Could not extract handle');
    }
  } else {
    console.log('⏭️ Not a profile page, skipping');
  }

  // Also check for profile cards in timeline
  processTimelineProfiles();
}

// Extract Twitter handle from profile page
function extractTwitterHandle() {
  console.log('🔎 Extracting Twitter handle...');

  // Try multiple selectors for Twitter/X
  const selectors = [
    '[data-testid="UserName"]',
    '[data-testid="UserProfileHeader_Items"]',
    'div[dir="ltr"] span'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`  Checking selector "${selector}": found ${elements.length} elements`);

    for (const el of elements) {
      const text = el.textContent;
      if (text && text.startsWith('@')) {
        console.log('  ✅ Found handle in element:', text.trim());
        return text.trim();
      }
    }
  }

  // Fallback: extract from URL
  const match = window.location.pathname.match(/^\/([^\/]+)/);
  if (match && match[1] !== 'home' && match[1] !== 'explore' && match[1] !== 'notifications') {
    const handle = '@' + match[1];
    console.log('  ✅ Extracted from URL:', handle);
    return handle;
  }

  console.log('  ❌ Could not extract handle');
  return null;
}

// Check wallet and add Ethereum button
async function checkAndAddEthereumButton(handle) {
  console.log('🔍 Checking wallet for:', handle);

  try {
    // Check if wallet is linked
    console.log('📡 Sending message to background script...');
    const result = await chrome.runtime.sendMessage({
      action: 'checkWallet',
      handle: handle,
      platform: 'twitter'
    });

    console.log('📨 Received response:', result);

    if (result.error) {
      console.error('❌ Error checking wallet:', result.error);
      // Still show button even if there's an error
      addEthereumButton(handle, null);
      return;
    }

    if (result.found) {
      console.log('✅ Wallet found!', result.wallet);
      addEthereumButton(handle, result.wallet);
    } else {
      console.log('ℹ️ No wallet linked for', handle, '- will use send_to_unlinked');
      // Show button anyway, will use send_to_unlinked flow
      addEthereumButton(handle, null);
    }
  } catch (error) {
    console.error('❌ Error in checkAndAddEthereumButton:', error);
    // Still show button even if there's an error
    addEthereumButton(handle, null);
  }
}

// Add Ethereum Pay button to profile
function addEthereumButton(handle, walletAddress) {
  console.log('🎨 Adding Ethereum button for:', handle, 'Wallet:', walletAddress || 'Not linked');

  // Check if button already exists
  if (document.getElementById('lynq-ethereum-btn')) {
    console.log('⏭️ Button already exists, skipping');
    return;
  }

  // Find the UserName container (has the name and blue tick)
  const userNameContainer = document.querySelector('[data-testid="UserName"]');

  if (!userNameContainer) {
    console.log('❌ Could not find UserName container');
    return;
  }

  console.log('📍 UserName container found');

  // Find the row that contains the name and verified badge
  const nameRow = userNameContainer.querySelector('.css-175oi2r.r-1awozwy.r-18u37iz.r-dnmrzs');

  if (!nameRow) {
    console.log('❌ Could not find name row');
    return;
  }

  // Create Ethereum badge (smaller, icon-only for inline display)
  const badge = document.createElement('button');
  badge.id = 'lynq-ethereum-btn';
  badge.className = 'lynq-ethereum-badge';
  badge.setAttribute('aria-label', walletAddress ? 'Pay with PYUSD' : 'Send PYUSD (Claimable)');
  badge.setAttribute('type', 'button');
  badge.setAttribute('title', walletAddress ? 'Pay with PYUSD on Ethereum' : 'Send PYUSD - User can claim when they link wallet');
  badge.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 256 417" fill="currentColor">
      <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/>
      <path d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
      <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/>
      <path d="M127.962 416.905v-104.72L0 236.585z"/>
      <path d="M127.961 287.958l127.96-75.637-127.96-58.162z"/>
      <path d="M0 212.32l127.96 75.638v-133.8z"/>
    </svg>
  `;

  badge.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPaymentModal(handle, walletAddress);
  };

  // Wrap in a container div for proper spacing
  const badgeWrapper = document.createElement('div');
  badgeWrapper.className = 'css-175oi2r r-xoduu5';
  badgeWrapper.appendChild(badge);

  // Insert after the name/verified badge
  nameRow.appendChild(badgeWrapper);
  console.log('✅ Ethereum badge added next to name');

  console.log('✅ Ethereum button added for', handle);
}

// Process timeline profiles (hover cards, etc.)
function processTimelineProfiles() {
  // This can be extended to add indicators on timeline profiles
  // For now, we focus on the main profile page
}

// Open payment modal
function openPaymentModal(handle, walletAddress) {
  // Remove existing modal if any
  const existingModal = document.getElementById('lynq-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const isLinked = !!walletAddress;
  const modalTitle = isLinked ? `Send PYUSD to ${handle}` : `Send PYUSD to ${handle} (Claimable)`;
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'lynq-modal';
  modal.className = 'lynq-modal-overlay';

  const walletInfoHtml = isLinked ? `
    <div class="lynq-wallet-info">
      <div class="lynq-label">Wallet Address</div>
      <div class="lynq-wallet-address">
        ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}
        <button class="lynq-copy-btn" onclick="navigator.clipboard.writeText('${walletAddress}')">
          📋
        </button>
      </div>
    </div>
  ` : `
    <div class="lynq-wallet-info">
      <div class="lynq-label">⚠️ Wallet Not Linked</div>
      <div class="lynq-wallet-address" style="font-size: 14px; line-height: 1.5;">
        This user hasn't linked their wallet yet. Your PYUSD will be held in the contract and they can claim it when they link their wallet.
      </div>
    </div>
  `;

  modal.innerHTML = `
    <div class="lynq-modal">
      <div class="lynq-modal-header">
        <h2>${modalTitle}</h2>
        <button class="lynq-modal-close" onclick="this.closest('.lynq-modal-overlay').remove()">×</button>
      </div>
      
      <div class="lynq-modal-body">
        ${walletInfoHtml}
        
        <div class="lynq-amount-input">
          <label for="pyusd-amount">Amount (PYUSD)</label>
          <input 
            type="number" 
            id="pyusd-amount" 
            placeholder="0.00" 
            min="0" 
            step="0.01"
          />
        </div>
        
        <div id="lynq-status" class="lynq-status"></div>
      </div>
      
      <div class="lynq-modal-footer">
        <button class="lynq-btn-secondary" onclick="this.closest('.lynq-modal-overlay').remove()">
          Cancel
        </button>
        <button class="lynq-btn-primary" id="send-pyusd-btn">
          ${isLinked ? 'Send PYUSD' : 'Send to Contract'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listener for send button
  document.getElementById('send-pyusd-btn').addEventListener('click', () => {
    sendPYUSD(handle, walletAddress, isLinked);
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Track active transactions to prevent duplicates
let activeTransactionId = null;

// Send PYUSD transaction
async function sendPYUSD(handle, walletAddress, isLinked) {
  const amountInput = document.getElementById('pyusd-amount');
  const statusDiv = document.getElementById('lynq-status');
  const sendBtn = document.getElementById('send-pyusd-btn');

  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    showStatus('Please enter a valid amount', 'error');
    return;
  }

  // Prevent double-clicks and concurrent transactions
  if (sendBtn.disabled || activeTransactionId) {
    console.log('Transaction already in progress, ignoring click');
    return;
  }

  // Generate unique transaction ID
  const txId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  activeTransactionId = txId;

  try {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Connecting to MetaMask...';
    showStatus('Connecting to MetaMask wallet...', 'info');

    // Connect to MetaMask via injected script
    window.cypherpunkMetaMaskConnected = null;
    window.cypherpunkMetaMaskError = null;

    window.postMessage({ type: 'LYNQ_CONNECT_METAMASK' }, '*');

    // Wait for response
    await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.cypherpunkMetaMaskConnected) {
          clearInterval(checkInterval);
          resolve(window.cypherpunkMetaMaskConnected);
        }
        if (window.cypherpunkMetaMaskError) {
          clearInterval(checkInterval);
          reject(new Error(window.cypherpunkMetaMaskError.error));
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('MetaMask connection timeout. Please make sure MetaMask is installed and unlocked.'));
      }, 10000);
    });

    const senderAddress = window.cypherpunkMetaMaskConnected.address;
    console.log('✅ Connected to MetaMask:', senderAddress);

    showStatus('Building transaction...', 'info');
    sendBtn.textContent = 'Building...';

    // Build transaction via API - use different action based on whether wallet is linked
    const txResult = await chrome.runtime.sendMessage({
      action: isLinked ? 'buildTransaction' : 'buildUnlinkedTransaction',
      recipientWallet: walletAddress,
      socialHandle: handle,
      amount: amount,
      senderWallet: senderAddress
    });

    if (txResult.error) {
      throw new Error(txResult.error);
    }

    console.log('📦 Transaction result from API:', txResult);
    console.log('📦 Has nextTransaction?', !!txResult.nextTransaction);
    console.log('📦 requiresTwoSteps?', txResult.requiresTwoSteps);

    showStatus('Please sign the transaction in MetaMask...', 'info');
    sendBtn.textContent = 'Waiting for signature...';

    // Send transaction to MetaMask for signing
    // Clear previous results
    window.cypherpunkTransactionSent = null;
    window.cypherpunkMetaMaskError = null;
    
    window.postMessage({ 
      type: 'LYNQ_SEND_TOKENS',
      data: { 
        transactionHex: txResult.transaction,
        rpcUrl: 'https://1rpc.io/sepolia',
        txId: txId // Use our unique transaction ID
      }
    }, '*');
    
    // Wait for transaction to be sent
    const txResult2 = await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.cypherpunkTransactionSent) {
          clearInterval(checkInterval);
          resolve(window.cypherpunkTransactionSent);
        }
        if (window.cypherpunkMetaMaskError) {
          clearInterval(checkInterval);
          reject(new Error(window.cypherpunkMetaMaskError.error));
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Transaction timeout'));
      }, 60000);
    });

    if (txResult2.success) {
      const txHash = txResult2.txHash;
      console.log('✅ First transaction sent:', txHash);

      // Check if there's a second transaction to send
      if (txResult.nextTransaction) {
        console.log('🔄 Preparing second transaction...');
        showStatus('Step 1 complete! Now sending PYUSD...', 'info');
        sendBtn.textContent = 'Step 2: Sending...';

        // Wait a bit for first tx to be mined
        await new Promise(resolve => setTimeout(resolve, 3000));

        // IMPORTANT: Reset the flags before sending second transaction
        window.cypherpunkTransactionSent = null;
        window.cypherpunkMetaMaskError = null;
        
        console.log('📤 Sending second transaction:', txResult.nextTransaction);
        
        window.postMessage({ 
          type: 'LYNQ_SEND_TOKENS',
          data: { 
            transactionHex: txResult.nextTransaction,
            rpcUrl: 'https://1rpc.io/sepolia',
            txId: txId + '-2'
          }
        }, '*');

        // Wait for second transaction
        const txResult3 = await new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (window.cypherpunkTransactionSent) {
              clearInterval(checkInterval);
              resolve(window.cypherpunkTransactionSent);
            }
            if (window.cypherpunkMetaMaskError) {
              clearInterval(checkInterval);
              reject(new Error(window.cypherpunkMetaMaskError.error));
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Second transaction timeout'));
          }, 60000);
        });

        if (txResult3.success) {
          const finalTxHash = txResult3.txHash;
          console.log('✅ Second transaction sent:', finalTxHash);

          showStatus(`✅ Successfully sent ${amount} PYUSD!`, 'success');
          sendBtn.textContent = 'Sent!';

          // Show transaction link for the final transaction
          setTimeout(() => {
            statusDiv.innerHTML += `<br><a href="https://sepolia.etherscan.io/tx/${finalTxHash}" target="_blank" style="color: #14F195; text-decoration: underline;">View on Etherscan</a>`;
          }, 500);

          // Close modal after 5 seconds
          setTimeout(() => {
            const modal = document.getElementById('lynq-modal');
            if (modal) modal.remove();
          }, 5000);
        } else {
          throw new Error('Second transaction failed');
        }
      } else {
        // Single transaction flow
        showStatus(`✅ Successfully sent ${amount} PYUSD!`, 'success');
        sendBtn.textContent = 'Sent!';

        // Show transaction link
        setTimeout(() => {
          statusDiv.innerHTML += `<br><a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" style="color: #14F195; text-decoration: underline;">View on Etherscan</a>`;
        }, 500);

        // Close modal after 5 seconds
        setTimeout(() => {
          const modal = document.getElementById('lynq-modal');
          if (modal) modal.remove();
        }, 5000);
      }
    } else {
      throw new Error(txResult2.message || 'Transaction failed');
    }

  } catch (error) {
    console.error('Error sending PYUSD:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
    sendBtn.disabled = false;
    sendBtn.textContent = isLinked ? 'Send PYUSD' : 'Send to Contract';
  } finally {
    // Clear active transaction ID
    activeTransactionId = null;
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('lynq-status');
  statusDiv.textContent = message;
  statusDiv.className = `lynq-status lynq-status-${type}`;
}
