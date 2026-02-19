import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check for stored wallet address on mount
    const stored = localStorage.getItem('walletAddress');
    if (stored) {
      setWalletAddress(stored);
      setIsConnected(true);
    }
  }, []);

  const connectWallet = async () => {
    // Integration with Algorand wallet (e.g., Pera Wallet)
    try {
      // Placeholder for wallet connection logic
      const address = 'PLACEHOLDER_ADDRESS';
      setWalletAddress(address);
      setIsConnected(true);
      localStorage.setItem('walletAddress', address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
  };

  return (
    <WalletContext.Provider value={{ walletAddress, isConnected, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
