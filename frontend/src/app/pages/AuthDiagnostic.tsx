/**
 * Wallet Auth Diagnostic Page
 * 
 * Use this page to test each step of the authentication flow
 * Access: http://localhost:5173/auth-test (after adding route)
 */

import React, { useState } from 'react';
import { apiClient } from '../services/api';
import {
  connectPeraWallet,
  disconnectPeraWallet,
  signMessageWithPeraWallet,
  getPeraWallet,
} from '../utils/peraWallet';
import { Button } from '../components/ui/button';

interface StepResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  data?: any;
}

const AuthDiagnostic = () => {
  const [step1, setStep1] = useState<StepResult>({ status: 'idle', message: '' });
  const [step2, setStep2] = useState<StepResult>({ status: 'idle', message: '' });
  const [step3, setStep3] = useState<StepResult>({ status: 'idle', message: '' });
  const [step4, setStep4] = useState<StepResult>({ status: 'idle', message: '' });
  const [walletAddress, setWalletAddress] = useState('');
  const [challengeMessage, setChallengeMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const testStep1 = async () => {
    setStep1({ status: 'loading', message: 'Checking PeraWallet...' });
    try {
      // Check if PeraWallet is available
      const pera = getPeraWallet();
      if (!pera) {
        throw new Error('PeraWallet not found');
      }

      // Try to connect
      const accounts = await connectPeraWallet();

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from PeraWallet');
      }

      setWalletAddress(accounts[0]);
      setStep1({
        status: 'success',
        message: `✅ PeraWallet connected successfully`,
        data: { accounts },
      });
    } catch (error) {
      setStep1({
        status: 'error',
        message: `❌ ${error instanceof Error ? error.message : 'Failed'}`,
        data: error,
      });
    }
  };

  const testStep2 = async () => {
    if (!walletAddress) {
      setStep2({
        status: 'error',
        message: '❌ Please complete Step 1 first (connect wallet)',
      });
      return;
    }

    setStep2({ status: 'loading', message: 'Getting challenge from backend...' });
    try {
      const response = await apiClient.getChallenge(walletAddress);
      setChallengeMessage(response.message);
      setStep2({
        status: 'success',
        message: `✅ Challenge received from backend`,
        data: response,
      });
    } catch (error) {
      setStep2({
        status: 'error',
        message: `❌ ${error instanceof Error ? error.message : 'Failed to get challenge'}`,
        data: error,
      });
    }
  };

  const testStep3 = async () => {
    if (!walletAddress || !challengeMessage) {
      setStep3({
        status: 'error',
        message: '❌ Please complete Steps 1 & 2 first',
      });
      return;
    }

    setStep3({ status: 'loading', message: 'Signing message with PeraWallet...' });
    try {
      const sig = await signMessageWithPeraWallet(
        challengeMessage,
        walletAddress
      );
      setSignature(sig);
      setStep3({
        status: 'success',
        message: `✅ Message signed successfully`,
        data: { signature: sig.substring(0, 50) + '...' },
      });
    } catch (error) {
      setStep3({
        status: 'error',
        message: `❌ ${error instanceof Error ? error.message : 'Failed to sign'}`,
        data: error,
      });
    }
  };

  const testStep4 = async () => {
    if (!walletAddress || !signature || !challengeMessage) {
      setStep4({
        status: 'error',
        message: '❌ Please complete Steps 1-3 first',
      });
      return;
    }

    setStep4({ status: 'loading', message: 'Logging in with backend...' });
    try {
      const response = await apiClient.login({
        wallet_address: walletAddress,
        signature,
        message: challengeMessage,
      });

      setAccessToken(response.access_token);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('wallet_address', walletAddress);

      setStep4({
        status: 'success',
        message: `✅ Login successful! Token saved.`,
        data: { token: response.access_token.substring(0, 30) + '...' },
      });
    } catch (error) {
      setStep4({
        status: 'error',
        message: `❌ ${error instanceof Error ? error.message : 'Login failed'}`,
        data: error,
      });
    }
  };

  const StepBox = ({
    title,
    step,
    result,
    onTest,
  }: {
    title: string;
    step: number;
    result: StepResult;
    onTest: () => void;
  }) => (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white">Step {step}: {title}</h3>
          <p className="text-sm text-slate-400 mt-1">{result.message}</p>
        </div>
        <Button
          onClick={onTest}
          disabled={result.status === 'loading'}
          size="sm"
          className={`${
            result.status === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : result.status === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white`}
        >
          {result.status === 'loading' ? 'Testing...' : 'Test'}
        </Button>
      </div>

      {result.data && (
        <pre className="bg-slate-900 p-2 rounded text-xs text-slate-300 overflow-auto max-h-32">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );

  const handleReset = () => {
    setStep1({ status: 'idle', message: '' });
    setStep2({ status: 'idle', message: '' });
    setStep3({ status: 'idle', message: '' });
    setStep4({ status: 'idle', message: '' });
    setWalletAddress('');
    setChallengeMessage('');
    setSignature('');
    setAccessToken('');
    localStorage.removeItem('access_token');
    localStorage.removeItem('wallet_address');
    disconnectPeraWallet();
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🔐 Wallet Auth Diagnostic
          </h1>
          <p className="text-slate-400">
            Test each step of the authentication flow to identify any issues
          </p>
        </div>

        {/* Environment Info */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h2 className="font-bold text-white mb-3">Environment</h2>
          <div className="space-y-2 text-sm font-mono">
            <p className="text-slate-400">
              API URL:{' '}
              <span className="text-white">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
              </span>
            </p>
            <p className="text-slate-400">
              Current Wallet:{' '}
              <span className="text-indigo-400">
                {walletAddress || 'Not connected'}
              </span>
            </p>
            <p className="text-slate-400">
              Token:{' '}
              <span className="text-emerald-400">
                {accessToken ? accessToken.substring(0, 20) + '...' : 'Not set'}
              </span>
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <StepBox
            title="Connect PeraWallet"
            step={1}
            result={step1}
            onTest={testStep1}
          />
          <StepBox
            title="Get Challenge from Backend"
            step={2}
            result={step2}
            onTest={testStep2}
          />
          <StepBox
            title="Sign Message with Wallet"
            step={3}
            result={step3}
            onTest={testStep3}
          />
          <StepBox
            title="Login to Backend"
            step={4}
            result={step4}
            onTest={testStep4}
          />
        </div>

        {/* Reset Button */}
        <Button
          onClick={handleReset}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white"
        >
          Reset All
        </Button>

        {/* Success Message */}
        {step4.status === 'success' && (
          <div className="bg-emerald-900/50 border border-emerald-400 text-emerald-200 p-4 rounded-lg">
            <h3 className="font-bold mb-2">✅ Authentication Successful!</h3>
            <p className="text-sm">
              Your access token has been saved to localStorage. You can now use the app.
            </p>
          </div>
        )}

        {/* Debugging Tips */}
        <div className="bg-blue-900/30 border border-blue-500/30 text-blue-200 p-4 rounded-lg space-y-2 text-sm">
          <h3 className="font-bold">💡 Debugging Tips:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>If Step 1 fails: PeraWallet not installed or not active</li>
            <li>If Step 2 fails: Backend URL is wrong or backend is down</li>
            <li>If Step 3 fails: PeraWallet popup blocked or wallet signing issues</li>
            <li>If Step 4 fails: Invalid signature or wallet not registered</li>
            <li>Watch browser console for detailed error messages</li>
            <li>Watch Network tab to see API requests and responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthDiagnostic;
