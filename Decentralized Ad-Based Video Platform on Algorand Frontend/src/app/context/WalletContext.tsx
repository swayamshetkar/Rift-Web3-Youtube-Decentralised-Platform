import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../services/api';

export interface User {
  id: string;
  wallet_address: string;
  username: string;
  role: 'creator' | 'viewer' | 'advertiser';
  created_at: string;
}

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: number;
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  network: string;
  
  // Auth methods
  connect: () => Promise<void>;
  disconnect: () => void;
  signup: (walletAddress: string, signature: string, message: string, username: string, role: 'creator' | 'viewer' | 'advertiser') => Promise<void>;
  login: (walletAddress: string, signature: string, message: string) => Promise<void>;
  getChallenge: (walletAddress: string) => Promise<string>;
  
  // Data methods
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState('Testnet');

  // Load from local storage on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedToken = localStorage.getItem('access_token');
        const savedAddress = localStorage.getItem('wallet_address');
        
        if (savedToken && savedAddress) {
          setAccessToken(savedToken);
          setWalletAddress(savedAddress);
          setIsConnected(true);
          
          // Fetch user and balance data
          try {
            const userData = await apiClient.getMe();
            setUser(userData);
            
            const balanceData = await apiClient.getBalance();
            setBalance(balanceData.balance || 0);
          } catch (error) {
            // Token might be expired, clear it
            localStorage.removeItem('access_token');
            localStorage.removeItem('wallet_address');
            setAccessToken(null);
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('Failed to load saved wallet state:', error);
      }
    };
    
    loadSavedState();
  }, []);

  const getChallenge = useCallback(async (walletAddress: string): Promise<string> => {
    try {
      const response = await apiClient.getChallenge(walletAddress);
      return response.message;
    } catch (error) {
      toast.error('Failed to get challenge from server');
      throw error;
    }
  }, []);

  const signup = useCallback(async (
    walletAddress: string,
    signature: string,
    message: string,
    username: string,
    role: 'creator' | 'viewer' | 'advertiser'
  ) => {
    try {
      setLoading(true);
      const response = await apiClient.signup({
        wallet_address: walletAddress,
        signature,
        message,
        username,
        role,
      });

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('wallet_address', walletAddress);
      setAccessToken(response.access_token);
      setWalletAddress(walletAddress);
      setIsConnected(true);

      // Fetch user data
      const userData = await apiClient.getMe();
      setUser(userData);

      // Fetch balance
      const balanceData = await apiClient.getBalance();
      setBalance(balanceData.balance || 0);

      toast.success('Account created and connected successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (
    walletAddress: string,
    signature: string,
    message: string
  ) => {
    try {
      setLoading(true);
      const response = await apiClient.login({
        wallet_address: walletAddress,
        signature,
        message,
      });

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('wallet_address', walletAddress);
      setAccessToken(response.access_token);
      setWalletAddress(walletAddress);
      setIsConnected(true);

      // Fetch user data
      const userData = await apiClient.getMe();
      setUser(userData);

      // Fetch balance
      const balanceData = await apiClient.getBalance();
      setBalance(balanceData.balance || 0);

      toast.success('Connected successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!isConnected) return;
    try {
      const balanceData = await apiClient.getBalance();
      setBalance(balanceData.balance || 0);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [isConnected]);

  const connect = useCallback(async () => {
    // This method now expects the caller to handle wallet connection and signing
    // and then call either signup() or login()
    toast.info('Please use login or signup with your wallet');
  }, []);

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setUser(null);
    setAccessToken(null);
    setBalance(0);
    localStorage.removeItem('access_token');
    localStorage.removeItem('wallet_address');
    toast.info('Wallet disconnected');
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletAddress,
        balance,
        user,
        accessToken,
        loading,
        network,
        connect,
        disconnect,
        signup,
        login,
        getChallenge,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
