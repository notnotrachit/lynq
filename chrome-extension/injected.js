// Injected script that runs in page context (has access to window.ethereum)

(function () {
  'use strict';

  console.log('💉 Cypherpunk injected script loaded (Ethereum)');

  // Notify content script that injected script is ready
  window.postMessage({ type: 'LYNQ_INJECTED_READY' }, '*');

  // Listen for messages from content script
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    const { type, data } = event.data;

    if (type === 'LYNQ_CHECK_METAMASK') {
      const hasMetaMask = !!(window.ethereum && window.ethereum.isMetaMask);
      window.postMessage({
        type: 'LYNQ_METAMASK_STATUS',
        data: { hasMetaMask }
      }, '*');
    }

    if (type === 'LYNQ_CONNECT_METAMASK') {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask wallet not found');
        }

        // Request account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        const address = accounts[0];

        window.postMessage({
          type: 'LYNQ_METAMASK_CONNECTED',
          data: { address }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'LYNQ_METAMASK_ERROR',
          data: { error: error.message }
        }, '*');
      }
    }

    if (type === 'LYNQ_SEND_TOKENS') {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask wallet not found');
        }

        const { transactionHex, rpcUrl } = data;

        console.log('Received transaction to sign');
        console.log('Requesting signature from MetaMask...');

        // For Ethereum, we can either:
        // 1. Send a raw transaction (if already signed)
        // 2. Request user to sign and send via MetaMask

        // If transactionHex is a complete transaction object, send it
        if (typeof transactionHex === 'object') {
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionHex],
          });

          console.log('Transaction sent:', txHash);

          window.postMessage({
            type: 'LYNQ_TRANSACTION_SENT',
            data: {
              txHash,
              success: true
            }
          }, '*');
        } else {
          // If it's a raw signed transaction, send it directly
          const txHash = await window.ethereum.request({
            method: 'eth_sendRawTransaction',
            params: [transactionHex],
          });

          console.log('Transaction sent:', txHash);

          window.postMessage({
            type: 'LYNQ_TRANSACTION_SENT',
            data: {
              txHash,
              success: true
            }
          }, '*');
        }
      } catch (error) {
        console.error('Error sending tokens:', error);
        window.postMessage({
          type: 'LYNQ_METAMASK_ERROR',
          data: {
            error: error.message || error.toString()
          }
        }, '*');
      }
    }

    if (type === 'LYNQ_GET_NETWORK') {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const chainId = await window.ethereum.request({
          method: 'eth_chainId'
        });

        window.postMessage({
          type: 'LYNQ_NETWORK_INFO',
          data: { chainId }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'LYNQ_METAMASK_ERROR',
          data: { error: error.message }
        }, '*');
      }
    }

    if (type === 'LYNQ_SWITCH_NETWORK') {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const { chainId } = data;

        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        });

        window.postMessage({
          type: 'LYNQ_NETWORK_SWITCHED',
          data: { chainId }
        }, '*');
      } catch (error) {
        // If chain doesn't exist, try to add it
        if (error.code === 4902) {
          window.postMessage({
            type: 'LYNQ_NETWORK_NOT_FOUND',
            data: { error: error.message }
          }, '*');
        } else {
          window.postMessage({
            type: 'LYNQ_METAMASK_ERROR',
            data: { error: error.message }
          }, '*');
        }
      }
    }
  });
})();
