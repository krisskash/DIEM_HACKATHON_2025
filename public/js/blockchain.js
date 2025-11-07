(function(){
  // Lightweight blockchain service stub to make per-order escrow easy to integrate later
  const NETWORKS = {
    sepolia: {
      name: 'Sepolia',
      chainId: 11155111,
      explorer: 'https://sepolia.etherscan.io',
    }
  };

  function randomHex(bytes) {
    const chars = 'abcdef0123456789';
    let out = '0x';
    for (let i=0;i<bytes*2;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  function shortAddress(addr) {
    if (!addr) return '';
    return addr.slice(0,6) + '...' + addr.slice(-4);
  }

  // Fake price feeds for demo; replace with real oracle/rates later
  const RATES = {
    eth: 2000,   // € per ETH (demo)
    usdc: 1,     // € per USDC
    diem: 0.5    // € per DIEM (fictional demo)
  };

  function eurToCrypto(eur, currency) {
    const rate = RATES[currency] || 2000;
    return +(eur / rate).toFixed(6);
  }

  // Public API
  const BlockchainService = {
    getDefaultNetwork() {
      return 'sepolia';
    },
    getNetworkInfo(key) {
      return NETWORKS[key] || NETWORKS.sepolia;
    },
    // Simulate deploying an escrow contract per order
    async deployEscrow({ totalEur, currency }) {
      const networkKey = 'sepolia';
      const net = NETWORKS[networkKey];
      // Simulate async delay
      await new Promise(r=>setTimeout(r, 800));
      const contractAddress = randomHex(20);
      const txHash = randomHex(32);
      const amountCrypto = eurToCrypto(totalEur, currency);
      const tokenSymbol = (currency || 'eth').toUpperCase();
      return {
        contractAddress,
        transactionHash: txHash,
        network: networkKey,
        chainId: net.chainId,
        amountCrypto,
        tokenSymbol
      };
    },
    getExplorerLink({ network, contractAddress }) {
      const net = NETWORKS[network] || NETWORKS.sepolia;
      return `${net.explorer}/address/${contractAddress}`;
    },
    shortAddress
  };

  window.BlockchainService = BlockchainService;
})();
