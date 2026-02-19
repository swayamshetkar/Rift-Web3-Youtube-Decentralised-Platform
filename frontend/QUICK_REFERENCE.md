# PayPerView Frontend - Quick Reference Card

## Setup (First Time)

```bash
# 1. Configure environment
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL=http://localhost:8000

# 2. Install dependencies
npm install

# 3. Install wallet library (choose one)
npm install @perawallet/connect  # For PeraWallet
# OR
npm install @algorandfoundation/algorand-wallet-connector  # For ARC0901

# 4. Start development
npm run dev
```

## Core Imports

```typescript
import { useWallet } from '../context/WalletContext';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { apiClient } from '../services/api';
import { getStoredDeviceFingerprint } from '../utils/deviceFingerprint';
```

## Authentication

```typescript
// Get challenge
const message = await apiClient.getChallenge(walletAddress);

// Sign message (with your wallet)
const signature = await peraWallet.signMessage(message);

// Login or Signup
await walletContext.login(walletAddress, signature, message);
await walletContext.signup(walletAddress, signature, message, username, role);

// Logout
walletContext.disconnect();
```

## Check Auth Status

```typescript
const { isConnected, walletAddress, balance, user } = useWallet();
```

## Common API Calls

### Videos
```typescript
// Get all videos
const videos = await apiClient.listVideos(skip, limit);

// Get user's videos
const myVideos = await apiClient.getMyVideos();

// Get video details
const video = await apiClient.getVideo(videoId);

// Upload video
const formData = new FormData();
formData.append('file', file);
formData.append('title', title);
formData.append('description', description);
await apiClient.uploadVideo(formData);
```

### Views
```typescript
// Track a video view
await apiClient.trackView({
  video_id: videoId,
  watch_seconds: 42,
  wallet: walletAddress,
  device_fingerprint: getStoredDeviceFingerprint()
});
```

### Ads
```typescript
// Create video ad
const formData = new FormData();
formData.append('video_id', videoId);
formData.append('budget', 100);
formData.append('reward_per_view', 1);
formData.append('file', adFile);
await apiClient.createVideoAd(formData);

// Get active ads
const ads = await apiClient.getActiveAds();

// Get my ads
const myAds = await apiClient.getMyAds();
```

### Wallet & Balance
```typescript
// Get balance
const { balance } = await apiClient.getBalance();

// Refresh balance
await walletContext.refreshBalance();

// Get platform balance
const { balance } = await apiClient.getPlatformBalance();
```

### Settlement
```typescript
// Get settlements
const settlements = await apiClient.getSettlements(limit);

// Trigger video settlement
await apiClient.triggerVideoSettlement();

// Trigger banner settlement
await apiClient.triggerBannerSettlement();

// Get settlement summary
const summary = await apiClient.getSettlementSummary();
```

## Error Handling

```typescript
try {
  await apiClient.uploadVideo(formData);
} catch (error) {
  console.error('Error:', error.message);
  if (error.status === 401) {
    // Token expired, need to re-authenticate
  }
}
```

## Device Fingerprinting

```typescript
import { getStoredDeviceFingerprint } from '../utils/deviceFingerprint';

const fp = getStoredDeviceFingerprint(); // Returns unique ID
```

## Component Template

```typescript
import { useWallet } from '../context/WalletContext';
import { apiClient } from '../services/api';

const MyComponent = () => {
  const { isConnected, walletAddress } = useWallet();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isConnected) return;

    const fetchData = async () => {
      try {
        const result = await apiClient.getBalance();
        setData(result);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, [isConnected]);

  if (!isConnected) {
    return <div>Please connect wallet</div>;
  }

  return <div>{/* component UI */}</div>;
};
```

## State Variables to Watch

```typescript
// From useWallet()
isConnected      // boolean - wallet connected
walletAddress    // string | null - wallet address
balance          // number - user balance
user             // User | null - user profile
accessToken      // string | null - JWT token
loading          // boolean - auth in progress
```

## Common Mistakes to Avoid

❌ Don't forget to check `isConnected` before making authenticated calls
❌ Don't store password - wallets sign messages instead
❌ Don't make API calls outside of useEffect hook
❌ Don't forget FormData for file uploads
❌ Don't hardcode BASE_URL - use environment variable
❌ Don't ignore device fingerprint for view tracking

✓ Do check `isConnected` before authenticated operations
✓ Do use useWalletAuth for simplified auth flow
✓ Do handle errors with try/catch
✓ Do use FormData for file uploads
✓ Do use environment variables for API URL
✓ Do include device fingerprint in view tracking

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:8000
```

## Testing

### Test Authentication
```bash
curl -X POST "http://localhost:8000/auth/challenge" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"YOUR_WALLET"}'
```

### Test Video Listing
```bash
curl "http://localhost:8000/videos/list"
```

### Test Authenticated Endpoint
```bash
curl "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Documentation Files

- **INTEGRATION_GUIDE.md** - Detailed setup and examples
- **INTEGRATION_SUMMARY.md** - Complete list of changes
- **EXAMPLE_VideoFeed.tsx** - Video listing component
- **EXAMPLE_MyVideos.tsx** - User videos component
- **EXAMPLE_UploadVideo.tsx** - Video upload component

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# If you have issues:
rm -rf node_modules
npm install
npm run dev
```

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /auth/challenge | No | Get signing message |
| POST | /auth/signup | No | Create account |
| POST | /auth/login | No | Login |
| GET | /auth/me | Yes | Get current user |
| GET | /videos/list | No | List all videos |
| POST | /videos/upload | Yes | Upload video |
| GET | /videos/me | Yes | Get my videos |
| POST | /views/track | Yes | Track view |
| POST | /ads/create | Yes | Create video ad |
| POST | /ads/banner/create | Yes | Create banner ad |
| GET | /wallets/balance | Yes | Get balance |
| POST | /settlement/trigger | Yes | Trigger settlement |

## Support Links

- FastAPI Docs: http://localhost:8000/docs
- PeraWallet: https://perawallet.app
- Algorand Developer: https://developer.algorand.org
