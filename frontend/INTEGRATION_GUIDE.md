# FastAPI Backend Integration Guide

This frontend has been integrated with the FastAPI backend. Here's how to set it up and use it.

## 1. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## 2. Starting the Development Server

Make sure your FastAPI backend is running on `http://localhost:8000`, then start the frontend:

```bash
npm run dev
```

## 3. Wallet Integration

The frontend uses a challenge-response authentication flow. You need to integrate a wallet library for signing messages.

### Recommended Wallets for Algorand:
- **PeraWallet** (formerly AlgoWallet) - Most popular
- **ARC0901** - Standard for Algorand apps

### Implementation Example (PeraWallet):

```bash
npm install @perawallet/connect
```

Then update your auth flow:

```typescript
import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

// In your component:
const handleWalletSign = async (message: string): Promise<string> => {
  const accounts = await peraWallet.reconnectSession();
  if (!accounts) {
    accounts = await peraWallet.connect();
  }
  
  // Sign the message using the wallet
  const signature = await peraWallet.signMessage(message);
  return signature;
};
```

## 4. API Service Usage

The `apiClient` is exported from `src/app/services/api.ts` and can be used in any component:

```typescript
import { apiClient } from '../services/api';

// Videos
const videos = await apiClient.listVideos();
const myVideos = await apiClient.getMyVideos();
await apiClient.uploadVideo(formData);

// Views
await apiClient.trackView({
  video_id: 'video-123',
  watch_seconds: 42,
  wallet: 'YOUR_WALLET',
  device_fingerprint: 'FP_123'
});

// Ads
await apiClient.createVideoAd(formData);
const activeAds = await apiClient.getActiveAds();

// Balance
const balance = await apiClient.getBalance();

// Settlements
const settlements = await apiClient.getSettlements();
await apiClient.triggerVideoSettlement();
```

## 5. Using the Wallet Context

The `WalletContext` now includes authentication methods:

```typescript
import { useWallet } from '../context/WalletContext';

const MyComponent = () => {
  const { 
    isConnected, 
    walletAddress, 
    balance, 
    user,
    login, 
    signup,
    getChallenge,
    refreshBalance 
  } = useWallet();

  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <p>Connected: {walletAddress}</p>
      <p>Balance: {balance} ADMC</p>
      <p>Role: {user?.role}</p>
    </div>
  );
};
```

## 6. Using the Wallet Auth Hook

For simplified auth flow handling:

```typescript
import { useWalletAuth } from '../hooks/useWalletAuth';
import { PeraWalletConnect } from "@perawallet/connect";

const SignupComponent = () => {
  const { signupWithWallet, loginWithWallet, loading, error } = useWalletAuth();
  const peraWallet = new PeraWalletConnect();

  const handleSignup = async () => {
    await signupWithWallet(
      walletAddress,
      username,
      'creator',
      {
        signFunction: async (message: string) => {
          const signature = await peraWallet.signMessage(message);
          return signature;
        }
      }
    );
  };

  return (
    <button onClick={handleSignup} disabled={loading}>
      {loading ? 'Signing up...' : 'Sign Up'}
    </button>
  );
};
```

## 7. View Tracking Example

```typescript
import { useWallet } from '../context/WalletContext';
import { getStoredDeviceFingerprint } from '../utils/deviceFingerprint';
import { apiClient } from '../services/api';

const VideoPlayer = ({ videoId }) => {
  const { walletAddress } = useWallet();
  let watchSeconds = 0;

  const handleVideoWatch = async () => {
    watchSeconds += 5; // Update based on actual watch time

    await apiClient.trackView({
      video_id: videoId,
      watch_seconds: watchSeconds,
      wallet: walletAddress || 'anonymous',
      device_fingerprint: getStoredDeviceFingerprint()
    });
  };

  return <video onTimeUpdate={handleVideoWatch} />;
};
```

## 8. Video Upload Example

```typescript
import { apiClient } from '../services/api';

const UploadVideo = () => {
  const handleUpload = async (file: File, title: string, description: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

    const result = await apiClient.uploadVideo(formData);
    console.log('Video uploaded:', result);
  };

  return (
    // your upload form
  );
};
```

## 9. Ad Campaign Creation Example

```typescript
import { apiClient } from '../services/api';

const CreateAd = () => {
  const handleCreateAd = async (
    videoId: string,
    budget: number,
    rewardPerView: number,
    adFile: File
  ) => {
    const formData = new FormData();
    formData.append('video_id', videoId);
    formData.append('budget', budget.toString());
    formData.append('reward_per_view', rewardPerView.toString());
    formData.append('file', adFile);

    const result = await apiClient.createVideoAd(formData);
    return result;
  };

  return (
    // your ad creation form
  );
};
```

## 10. Token Management

JWT tokens are automatically:
- Stored in localStorage as `access_token`
- Included in all authenticated requests via the `Authorization: Bearer <token>` header
- Removed when user disconnects

## 11. Error Handling

All API methods throw errors with descriptive messages:

```typescript
try {
  await apiClient.uploadVideo(formData);
} catch (error) {
  console.error('Upload failed:', error.message);
  // Handle error
}
```

## 12. Next Steps

1. **Install a wallet library**: Choose PeraWallet, ARC0901, or another Algorand wallet
2. **Implement wallet signing**: Update `useWalletAuth` hook with your wallet's sign method
3. **Start the backend**: Ensure FastAPI backend is running
4. **Test authentication**: Use the login/signup dialog
5. **Implement video tracking**: Add view tracking to VideoPlayer component
6. **Create pages for new features**: Use the API client in your pages

## Troubleshooting

### "Failed to get challenge from server"
- Ensure FastAPI backend is running on the correct URL
- Check VITE_API_BASE_URL environment variable

### "Failed to get balance"
- Ensure you're authenticated (JWT token is stored)
- Check if backend wallet balance endpoint is working

### CORS Issues
- Make sure FastAPI backend has CORS configured for your frontend URL
- Check browser console for specific CORS error messages

### Wallet Integration Issues
- Install the wallet library: `npm install @perawallet/connect`
- Ensure wallet is available in browser
- Test wallet integration separately before using with auth flow
