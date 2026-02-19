# 🔐 PayPerView Wallet Authentication Setup Guide

Your authentication system is now fully integrated with PeraWallet! Follow these steps to get it working.

## ✅ Quick Start (5 minutes)

### 1. **Verify Prerequisites**
```bash
# Check that PeraWallet is installed
npm list @perawallet/connect

# Should show: @perawallet/connect@X.X.X
```

### 2. **Check Environment Configuration**
```bash
# View your .env.local file
cat .env.local

# Should show:
# VITE_API_BASE_URL=https://swayamshetkar-rift-backend-blockchain.hf.space
```

### 3. **Start the Frontend**
```bash
npm run dev
# App should be running on http://localhost:5173
```

### 4. **Test Authentication**

#### Method A: Use the Diagnostic Tool (Recommended for Testing)
1. Open browser and go to: **http://localhost:5173/auth-test**
2. Click "Test" on each step in order:
   - Step 1: Connect PeraWallet
   - Step 2: Get Challenge
   - Step 3: Sign Message
   - Step 4: Login to Backend
3. Watch for green checkmarks (✅) on each step
4. Detailed error messages will appear if something fails

#### Method B: Use the Normal Login Flow
1. Go to **http://localhost:5173**
2. Click "Connect Wallet" button
3. Click "Connect PeraWallet" button
4. Approve the connection in PeraWallet
5. Choose Login or Sign Up
6. Click "Sign & Login" or "Sign & Create Account"
7. Sign the message in PeraWallet when prompted
8. Should redirect to dashboard if successful

---

## 🔧 What Changed

### Files Created:
- **`src/app/pages/AuthDiagnostic.tsx`** - Step-by-step testing tool
- **`src/app/utils/peraWallet.ts`** - PeraWallet utilities
- **`AUTH_TROUBLESHOOTING.md`** - Common issues & solutions

### Files Updated:
- **`src/app/pages/LandingPage.tsx`** - Now has full PeraWallet integration
- **`src/app/App.tsx`** - Added /auth-test route

---

## 🚀 How It Works

### Authentication Flow

```
User clicks "Connect Wallet"
           ↓
Dialog opens with PeraWallet button
           ↓
User clicks "Connect PeraWallet"
           ↓
PeraWallet extension opens/app shows
           ↓
User approves account
           ↓
Wallet address is displayed in dialog
           ↓
User fills username and selects account type
           ↓
User clicks "Sign & Create Account" or "Sign & Login"
           ↓
Backend sends challenge message
           ↓
PeraWallet shows message signing dialog
           ↓
User approves signature
           ↓
Signature sent to backend
           ↓
Backend verifies signature
           ↓
Backend returns JWT token
           ↓
Token saved to localStorage
           ↓
Redirect to dashboard
```

---

## ❓ Quick Troubleshooting

### Problem: "Connect PeraWallet" button doesn't work

**Check:**
1. Is PeraWallet extension installed? Open: https://perawallet.app
2. Is the extension enabled in Chrome/Firefox?
3. Try in a different browser

**Fix:**
```bash
# In browser console:
console.log(typeof window.peraWallet);  # Should NOT be "undefined"
```

---

### Problem: Clicks "Connect PeraWallet" but no popup appears

**Check:**
1. Popup blocker - allow popups for localhost:5173
2. PeraWallet extension minimized?
3. Extension needs refresh?

**Fix:**
1. Run in incognito mode to bypass popup blocker
2. Refresh PeraWallet extension
3. Try different browser

---

### Problem: Wallet connects but login fails

**Check:**
1. Is backend running and accessible?
2. Is the API URL correct in `.env.local`?
3. Check browser Network tab for the error

**Quick Test:**
```bash
# Test backend availability
curl https://swayamshetkar-rift-backend-blockchain.hf.space/

# Should return something, not "connection refused"
```

---

### Problem: Signature verification fails

**Check:**
1. Message format is correct
2. Signature encoding matches backend expectations
3. Wallet address matches

**Debug:**
1. Go to http://localhost:5173/auth-test
2. Complete Steps 1-3 successfully
3. Check the signature format in browser console:
```typescript
console.log('Signature:', signature);  // Should be base64 string
```

---

## 📊 Testing the Full Flow

### Test Case 1: New User Signup
```
1. Go to http://localhost:5173
2. Click "Connect Wallet"
3. Click "Connect PeraWallet"
4. Select wallet account
5. Go to "Sign Up" tab
6. Enter username: "testuser123"
7. Select: "Viewer"
8. Click "Sign & Create Account"
9. Approve signature in PeraWallet
10. Should see "Account created and connected successfully!"
11. Should redirect to /app
```

### Test Case 2: Existing User Login
```
1. Go to http://localhost:5173
2. Click "Connect Wallet"
3. Click "Connect PeraWallet"
4. Select same wallet account
5. Go to "Login" tab
6. Click "Sign & Login"
7. Approve signature in PeraWallet
8. Should see "Connected successfully!"
9. Should redirect to /app
```

### Test Case 3: Connection Persistence
```
1. Complete successful login
2. Check browser console:
   localStorage.getItem('access_token')  // Should return JWT
   localStorage.getItem('wallet_address')  // Should return wallet
3. Refresh page
4. Should still be logged in (auto-restore from localStorage)
5. Check wallet context has user data
```

---

## 🎯 Key Features

### ✅ What Works Now

1. **Wallet Connection**
   - Click button → PeraWallet opens → Select account → Done
   - Handles connection errors gracefully
   - Shows wallet address in dialog

2. **Message Signing**
   - Backend sends challenge message
   - PeraWallet signs it
   - Signature sent back to backend

3. **Authentication**
   - Signup with username and account type
   - Login to existing accounts
   - JWT token management
   - Auto-reconnect from localStorage

4. **Error Handling**
   - Clear error messages for each step
   - Toast notifications
   - Fallback to reconnect button

5. **Debugging**
   - Diagnostic page at /auth-test
   - Step-by-step testing
   - Detailed error output
   - Console logging

---

## 🔍 Diagnostic Tool Usage

### Access the Diagnostic
```
http://localhost:5173/auth-test
```

### What It Does
- Tests each auth step independently
- Shows detailed responses
- Displays error messages
- Saves state between steps
- Lets you reset and try again

### Expected Successful Output
```
✅ Step 1: PeraWallet connected successfully
   accounts: ["XXXXX2U45VLYRWWVWNLNWZP5VPP65..."]

✅ Step 2: Challenge received from backend
   message: "Sign this message: 1708445622..."

✅ Step 3: Message signed successfully
   signature: "base64encodedstring..."

✅ Step 4: Login successful! Token saved.
   token: "eyJhbGciOiJIUzI1NiIsInR..."
```

---

## 🛠️ Advanced: Custom Configuration

### Change Wallet Provider

If you want to use a different wallet (not PeraWallet):

1. Install different wallet library
2. Update `src/app/utils/peraWallet.ts` or create new utility
3. Update `src/app/pages/LandingPage.tsx` imports
4. Implement `connectWallet()` and `signMessage()` functions

Example for different wallet:
```typescript
// Instead of PeraWallet
import { DifferentWallet } from '@different/wallet-library';

const handleWalletSign = async (message: string): Promise<string> => {
  // Use DifferentWallet's signing method
  return differentWallet.sign(message);
};
```

### Change API URL

Development vs Production:
```bash
# .env.local (development)
VITE_API_BASE_URL=http://localhost:8000

# .env.production (production)
VITE_API_BASE_URL=https://api.payperview.com
```

---

## 📱 Mobile Testing

PeraWallet on Mobile:
1. Download PeraWallet app from App Store/Play Store
2. Create/import wallet in the app
3. Open app in browser:
   - Android: Use Chrome or Firefox
   - iOS: Use Safari (best support)
4. Click "Connect PeraWallet"
5. Should open PeraWallet app
6. Approve on app and return to browser

---

## 🐛 Debug Mode

To enable detailed logging:

```typescript
// In LandingPage.tsx, add at top:
const DEBUG = true;

const log = (label: string, data: any) => {
  if (DEBUG) {
    console.log(`[PayPerView] ${label}:`, data);
  }
};

// Use in functions:
log('Step 1: Connecting wallet', walletAddress);
log('Step 2: Got challenge', challengeMessage);
```

---

## 📋 Checklist

- [ ] PeraWallet installed (@perawallet/connect)
- [ ] Browser has PeraWallet extension enabled
- [ ] .env.local configured with correct API URL
- [ ] Backend is running
- [ ] Frontend is running (npm run dev)
- [ ] Can go to http://localhost:5173 without errors
- [ ] Can open diagnostic tool (http://localhost:5173/auth-test)
- [ ] Step 1: Can connect PeraWallet
- [ ] Step 2: Can get challenge from backend
- [ ] Step 3: Can sign message with wallet
- [ ] Step 4: Can login to backend
- [ ] Token is saved to localStorage
- [ ] Can redirect to /app on success
- [ ] Can login as new user
- [ ] Can login as existing user
- [ ] Session persists after page refresh

---

## 🆘 Still Not Working?

1. **Run Diagnostic Tool**
   - Go to http://localhost:5173/auth-test
   - Note which step fails
   - See detailed error message

2. **Check Browser Console**
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for error messages
   - Check for warnings

3. **Check Network Tab**
   - In DevTools, go to Network tab
   - Try to login
   - Look for API requests
   - Check response codes and error details

4. **Verify Configuration**
   ```bash
   # Test API URL
   curl https://swayamshetkar-rift-backend-blockchain.hf.space/
   
   # Test backend endpoints
   curl -X POST "https://swayamshetkar-rift-backend-blockchain.hf.space/auth/challenge" \
     -H "Content-Type: application/json" \
     -d '{"wallet_address":"XXXXX"}'
   ```

5. **Read Documentation**
   - See `AUTH_TROUBLESHOOTING.md` for common issues
   - Check `INTEGRATION_GUIDE.md` for general info
   - Review `QUICK_REFERENCE.md` for code examples

---

## 📞 Getting Help

When asking for help, include:
- [ ] Which step fails (1, 2, 3, or 4)?
- [ ] Full error message from console
- [ ] Screenshot of browser Network tab
- [ ] Output from diagnostic tool
- [ ] Browser and OS version
- [ ] PeraWallet version
- [ ] .env.local content (without sensitive data)
