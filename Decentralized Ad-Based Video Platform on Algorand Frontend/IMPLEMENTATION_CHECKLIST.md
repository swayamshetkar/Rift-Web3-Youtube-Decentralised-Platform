# Implementation Checklist

Use this checklist to track your integration progress. Keep updating this file as you implement features.

## Phase 1: Setup ✓
- [x] API client created (`src/app/services/api.ts`)
- [x] Wallet context enhanced with authentication
- [x] Authentication hook created (`useWalletAuth`)
- [x] Device fingerprinting utility created
- [x] Environment configuration set up
- [x] Landing page updated with auth dialog
- [x] Documentation created

## Phase 2: Wallet Integration (TODO - In Progress)
- [ ] Install wallet library
  - [ ] PeraWallet: `npm install @perawallet/connect`
  - [ ] OR AlgoWallet: `npm install @algorandfoundation/algorand-wallet-connector`
- [ ] Implement wallet connection in landing page
- [ ] Test `getChallenge()` endpoint with real wallet
- [ ] Test `login()` endpoint
- [ ] Test `signup()` endpoint
- [ ] Test token persistence across page refreshes
- [ ] Test logout/disconnect

## Phase 3: Video Features (TODO)
### List Videos Page
- [ ] Replace mock data in `VideoFeed.tsx`
- [ ] Implement `apiClient.listVideos()` call
- [ ] Add loading state
- [ ] Add error handling
- [ ] Implement pagination
- [ ] Test with backend

### Upload Video Page
- [ ] Update `UploadVideo.tsx` to use `apiClient.uploadVideo()`
- [ ] Add file validation (type, size)
- [ ] Implement upload progress tracking
- [ ] Show upload success message
- [ ] Redirect to videos on success
- [ ] Test with backend

### My Videos Page
- [ ] Update `MyVideos.tsx` to use `apiClient.getMyVideos()`
- [ ] Add loading state
- [ ] Add error handling
- [ ] Display actual video stats from backend
- [ ] Implement edit functionality
- [ ] Implement delete functionality
- [ ] Test with backend

### Video Player Page
- [ ] Update `VideoPlayer.tsx` to fetch video details
- [ ] Implement `apiClient.trackView()` for watch tracking
- [ ] Add device fingerprint to tracking
- [ ] Display actual video player (replace mock)
- [ ] Show video comments/information from backend
- [ ] Test view tracking

## Phase 4: Ad Features (TODO)
### Create Campaign Page
- [ ] Update `CreateCampaign.tsx` to use `apiClient.createVideoAd()`
- [ ] Add video selection
- [ ] Add file upload for ad video
- [ ] Implement budget calculation
- [ ] Test with backend

### Active Ads Display
- [ ] Update ad display components
- [ ] Use `apiClient.getActiveAds()`
- [ ] Use `apiClient.getMyAds()`
- [ ] Display ad performance metrics
- [ ] Implement withdraw functionality
- [ ] Test with backend

### Banner Ads
- [ ] Implement `apiClient.createBannerAd()`
- [ ] Implement `apiClient.getActiveBannerAds()`
- [ ] Display active banners
- [ ] Test with backend

## Phase 5: Data Display (TODO)
### Analytics Page
- [ ] Fetch real data from backend
- [ ] Update charts with actual metrics
- [ ] Add date range filtering
- [ ] Add data export functionality
- [ ] Test with backend

### Revenue Dashboard
- [ ] Update revenue breakdown
- [ ] Use actual settlement data
- [ ] Display real earnings
- [ ] Show platform fee breakdown
- [ ] Test with backend

### Settlements Page
- [ ] Fetch settlements from backend
- [ ] Display settlement history
- [ ] Implement trigger settlement buttons
- [ ] Show settlement status
- [ ] Test with backend

## Phase 6: Balance & Wallet (TODO)
- [ ] Display real balance from `apiClient.getBalance()`
- [ ] Implement balance refresh functionality
- [ ] Show platform balance
- [ ] Implement balance polling (auto-refresh)
- [ ] Add wallet address display
- [ ] Test with backend

## Phase 7: Error Handling & UX (TODO)
- [ ] Add global error boundary
- [ ] Implement loading spinners for all async operations
- [ ] Add toast notifications for errors and successes
- [ ] Implement retry logic for failed requests
- [ ] Add offline detection
- [ ] Add form validation
- [ ] Test error scenarios

## Phase 8: Performance & Optimization (TODO)
- [ ] Implement data caching (consider React Query or SWR)
- [ ] Add infinite scroll for video lists
- [ ] Optimize image loading
- [ ] Implement lazy loading for videos
- [ ] Add request debouncing where needed
- [ ] Monitor API response times
- [ ] Optimize bundle size

## Phase 9: Testing (TODO)
- [ ] Unit tests for API client
- [ ] Integration tests for components
- [ ] End-to-end tests for auth flow
- [ ] Test on different network speeds
- [ ] Test error scenarios
- [ ] Test with real backend
- [ ] Load testing

## Phase 10: Deployment (TODO)
- [ ] Update production environment variables
- [ ] Build production bundle
- [ ] Test production build locally
- [ ] Deploy to server
- [ ] Verify all endpoints work in production
- [ ] Monitor for errors
- [ ] Set up error tracking

## Backend Endpoint Verification

Test each endpoint with curl before implementing in frontend:

```bash
# Health check
curl http://localhost:8000/

# Challenge
curl -X POST "http://localhost:8000/auth/challenge" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"YOUR_WALLET"}'

# List videos
curl "http://localhost:8000/videos/list"

# Get active ads
curl "http://localhost:8000/ads/active"

# Get balance (requires token)
curl "http://localhost:8000/wallets/balance" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get settlements
curl "http://localhost:8000/settlement/?limit=100"
```

## Known Issues & Solutions

| Issue | Solution | Status |
|-------|----------|--------|
| API base URL incorrect | Check `.env.local` | ⏳ Todo |
| Wallet signing not working | Install wallet library | ⏳ Todo |
| Token not persisting | Check localStorage, clear cache | ⏳ Todo |
| Video upload fails | Check file size and type | ⏳ Todo |
| View tracking not working | Verify device fingerprint header | ⏳ Todo |
| Balance not updating | Check if authenticated, refresh | ⏳ Todo |

## Progress Tracking

```
Total Tasks: 50+
Completed: 10
In Progress: 0
Remaining: 40+

Progress: ████░░░░░░░░░░░░░░ 20%
```

## Notes

- Keep this file updated as you progress
- Use the checkbox next to each item to mark completion
- Add notes about any issues encountered
- Reference the INTEGRATION_GUIDE.md for detailed instructions
- Use example components as templates

## Next Immediate Steps

1. [ ] Install wallet library (PeraWallet recommended)
2. [ ] Test wallet connection with real wallet
3. [ ] Update VideoFeed.tsx to fetch from backend
4. [ ] Test video listing
5. [ ] Update UploadVideo.tsx to upload to backend
6. [ ] Test video upload
7. [ ] Update MyVideos.tsx to fetch user videos
8. [ ] Implement view tracking in VideoPlayer

## Resources

- `INTEGRATION_GUIDE.md` - Detailed integration guide
- `QUICK_REFERENCE.md` - Quick code snippets
- `EXAMPLE_VideoFeed.tsx` - Video feed example
- `EXAMPLE_MyVideos.tsx` - My videos example
- `EXAMPLE_UploadVideo.tsx` - Upload example
- API Docs: `http://localhost:8000/docs` (when backend running)
