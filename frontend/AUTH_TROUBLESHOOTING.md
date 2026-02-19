# Wallet Authentication Troubleshooting Guide

## Common Issues & Solutions

### ❌ Issue 1: "Failed to connect wallet"

**Possible Causes:**
1. PeraWallet extension not installed
2. Browser doesn't support the wallet
3. Popup was blocked by browser

**Solutions:**
1. Install PeraWallet from: https://perawallet.app
2. If using mobile, use the PeraWallet app or compatible browser
3. Check your browser's popup blocker settings
4. Try in a different browser (Chrome/Firefox/Safari recommended)

**Debug Steps:**
```typescript
// In browser console:
console.log(typeof window.peraWallet);  // Should not be undefined
```

---

### ❌ Issue 2: "Wallet connected but login fails"

**Possible Causes:**
1. Backend is not running
2. Backend URL is incorrect
3. Network/CORS issues
4. Signature verification failed on backend

**Solutions:**

**A. Check Backend is Running:**
```bash
# Test backend health
curl http://localhost:8000/

# Should return some response, not "connection refused"
```

**B. Verify Backend URL:**
```bash
# Check .env.local file
cat .env.local

# Should show:
# VITE_API_BASE_URL=https://swayamshetkar-rift-backend-blockchain.hf.space
# OR your local backend URL
```

**C. Check Network Tab:**
1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for `/auth/challenge` and `/auth/login` requests
5. Check the response status and error message
6. Look for `401 Unauthorized` or `400 Bad Request`

**D. Check Browser Console:**
```typescript
// The error message will usually tell you what went wrong:
// - "Failed to get challenge from server"
// - "Failed to sign message" 
// - "Invalid signature"
```

---

### ❌ Issue 3: "You'll be prompted to sign a message" but no popup appears

**Possible Causes:**
1. PeraWallet window closed/minimized
2. PeraWallet extension crashed
3. Message format is incorrect

**Solutions:**
1. Make sure PeraWallet extension is open and active
2. Refresh the page and try again
3. Check browser extension list - PeraWallet should be enabled
4. Restart browser

---

### ❌ Issue 4: Signing works but "Signup failed"

**Possible Causes:**
1. Username already taken
2. Wallet already registered
3. Backend validation error
4. Database issue

**Solutions:**

**Check Console for exact error:**
```typescript
// The toast message should tell you what's wrong:
// "Username already taken"
// "Wallet already registered"
// "Invalid username format"
```

**If error is vague:**
1. Open DevTools Network tab
2. Look at the `/auth/signup` request
3. Check the response body for detailed error message

---

### ❌ Issue 5: Connected wallet but fields are empty

**Possible Causes:**
1. Wallet connection succeeded but address not saved
2. State management issue
3. Race condition in component

**Solution:**
Check the browser's Application tab → LocalStorage → See if `wallet_address` is stored:
```javascript
// In console:
localStorage.getItem('wallet_address');  // Should return wallet address
localStorage.getItem('access_token');     // Should return JWT after successful auth
```

---

## Testing Checklist

### Step 1: Test PeraWallet Connection
```typescript
// In browser console:
import { getPeraWallet } from './app/utils/peraWallet';
const pera = getPeraWallet();
const accounts = await pera.connect();
console.log(accounts);  // Should show wallet address
```

### Step 2: Test Backend Challenge
```bash
curl -X POST "https://swayamshetkar-rift-backend-blockchain.hf.space/auth/challenge" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"YOUR_WALLET_ADDRESS"}'

# Should return: {"message": "Sign this message: ..."}
```

### Step 3: Test Backend Login
```bash
curl -X POST "https://swayamshetkar-rift-backend-blockchain.hf.space/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address":"YOUR_WALLET",
    "signature":"BASE64_SIGNATURE",
    "message":"CHALLENGE_MESSAGE"
  }'

# Should return: {"access_token": "...", "token_type": "bearer"}
```

### Step 4: Test with Access Token
```bash
curl "https://swayamshetkar-rift-backend-blockchain.hf.space/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Should return your user profile
```

---

## Debug Mode

Enable detailed logging by adding this to the top of LandingPage.tsx:

```typescript
// Development debugging
const DEBUG = true;

const log = (label: string, data: any) => {
  if (DEBUG) {
    console.log(`[PayPerView] ${label}:`, data);
  }
};

// Then in functions:
log('Wallet connected', walletAddress);
log('Challenge received', message);
log('Signature generated', signature);
log('Login response', response);
```

---

## Network Issues

### If you see CORS errors:

```
Access to XMLHttpRequest from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**This means:**
- Backend URL might be wrong
- Backend doesn't allow your frontend origin
- Network request failed

**Solution:**
1. Double-check the backend URL in `.env.local`
2. Make sure backend has CORS enabled for your frontend origin
3. Try with the correct backend URL

**Check what URL is being used:**
```typescript
// In browser console:
console.log(import.meta.env.VITE_API_BASE_URL);
```

---

## Signature Verification Failures

If you get "Invalid signature" error:

**Possible Causes:**
1. Wrong message format sent to wallet
2. Signature encoding mismatch
3. Backend expecting different signature format

**Check Signature Format:**
```typescript
// PeraWallet returns base64 encoded signature
const baseSignature = "abc123...xyz=";  // This is what PeraWallet gives

// Some backends expect:
// 1. Base64 (as-is) ← Most common
// 2. Hex encoded
// 3. Raw bytes

// Verify the format with your backend documentation
```

---

## Local Testing Without PeraWallet

If you want to test without a real wallet (development only):

```typescript
// Create a mock signer for testing
const mockSignMessage = async (message: string): Promise<string> => {
  // Just return a fake signature for testing
  return 'mock_signature_' + Math.random().toString(36).substring(7);
};

// Use in tests:
await signupWithWallet(testAddress, 'testuser', 'viewer', {
  signFunction: mockSignMessage
});
```

**⚠️ Note:** This only works for local testing. Real authentication requires real wallet signatures.

---

## Debug Output Example

When everything works, you should see in console:

```
[PayPerView] Connecting wallet...
Connected: XXXXX2U45VLYRWWVWNLNWZP5VPP65AFWUWYWQUNJ4...
[PayPerView] Got challenge message
[PayPerView] Signing message with PeraWallet...
[PayPerView] Signature created: base64...
[PayPerView] Sending login request...
[PayPerView] Login successful!
```

---

## Still Having Issues?

1. **Check the exact error message** - it's usually very specific
2. **Look at Network tab responses** - error details are usually there
3. **Check backend logs** - see what the backend received
4. **Verify .env.local** - wrong URL is a common issue
5. **Clear browser cache** - sometimes old data causes issues
6. **Try incognito mode** - rules out extension conflicts

### Get Help:
- Save the full error message from console
- Take screenshots of Network tab responses
- Check browser and extension versions
- Share full error details when asking for help
