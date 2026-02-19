import { useCallback, useState } from 'react';
import { useWallet } from '../context/WalletContext';

interface SignFunction {
  signFunction?: (message: string) => Promise<string>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for handling wallet authentication flow
 * This assumes you have a wallet signing capability (e.g., PeraWallet, ARC0901)
 */
export const useWalletAuth = () => {
  const { getChallenge, login, signup } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSignMessage = useCallback(
    async (
      walletAddress: string,
      message: string,
      options?: SignFunction
    ): Promise<string> => {
      // If a custom sign function is provided, use it
      if (options?.signFunction) {
        return options.signFunction(message);
      }

      // Otherwise, throw an error indicating wallet must sign
      throw new Error(
        'No wallet signing capability available. Please implement wallet integration with PeraWallet or similar.'
      );
    },
    []
  );

  const signupWithWallet = useCallback(
    async (
      walletAddress: string,
      username: string,
      role: 'creator' | 'viewer' | 'advertiser' = 'viewer',
      options?: SignFunction
    ) => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Get challenge
        console.log('Step 1: Requesting challenge for wallet:', walletAddress);
        const message = await getChallenge(walletAddress);
        
        console.log('Challenge received:', message.substring(0, 50) + '...');
        console.log('Message length:', message.length);

        // Step 2: Sign the message
        console.log('Step 2: Signing message...');
        const signature = await handleSignMessage(walletAddress, message, options);
        
        console.log('Signature generated:', signature.substring(0, 20) + '...');
        console.log('Signature length:', signature.length);

        // Step 3: Call signup
        console.log('Step 3: Calling signup...');
        await signup(walletAddress, signature, message, username, role);

        console.log('Signup completed successfully');
        if (options?.onSuccess) options.onSuccess();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Signup failed:', error);
        setError(error);
        if (options?.onError) options.onError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getChallenge, signup, handleSignMessage]
  );

  const loginWithWallet = useCallback(
    async (
      walletAddress: string,
      options?: SignFunction
    ) => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Get challenge
        console.log('Step 1: Requesting challenge for wallet:', walletAddress);
        const message = await getChallenge(walletAddress);
        
        console.log('Challenge received:', message.substring(0, 50) + '...');
        console.log('Message length:', message.length);

        // Step 2: Sign the message
        console.log('Step 2: Signing message...');
        const signature = await handleSignMessage(walletAddress, message, options);
        
        console.log('Signature generated:', signature.substring(0, 20) + '...');
        console.log('Signature length:', signature.length);

        // Step 3: Call login
        console.log('Step 3: Calling login...');
        await login(walletAddress, signature, message);

        console.log('Login completed successfully');
        if (options?.onSuccess) options.onSuccess();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Login failed:', error);
        setError(error);
        if (options?.onError) options.onError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getChallenge, login, handleSignMessage]
  );

  return {
    signupWithWallet,
    loginWithWallet,
    loading,
    error,
  };
};
