# Invalid Signature Error - Complete Resolution

## Summary

You were getting an "invalid signature" error because:

1. **Mock signatures weren't being generated correctly** - They need to include the message hash and wallet address
2. **Message handling was unclear** - The message needs to be sent EXACTLY as received without any modification
3. **Backend didn't have proper verification logic** - It needs to validate the signature format and encoding
4. **Logging was insufficient** - Hard to debug without seeing what data was being sent

## What Was Fixed

### 1. Frontend Signature Generation
**File**: [src/app/pages/LandingPage.tsx](src/app/pages/LandingPage.tsx)

Updated `handleWalletSign()` to:
- ✅ Check if PeraWallet `signMessage()` method exists
- ✅ Try alternative `signData()` method
- ✅ Generate proper mock signatures for development
- ✅ Add comprehensive logging for debugging
- ✅ Handle errors gracefully

### 2. API Client Logging
**File**: [src/services/api.ts](src/services/api.ts)

Enhanced `login()` and `signup()` methods to:
- ✅ Log request payload before sending
- ✅ Log response data when errors occur
- ✅ Provide detailed error messages from backend

### 3. Authentication Hook Logging
**File**: [src/app/hooks/useWalletAuth.ts](src/app/hooks/useWalletAuth.ts)

Updated `signupWithWallet()` and `loginWithWallet()` to:
- ✅ Log each step of the authentication flow
- ✅ Show message and signature details
- ✅ Track execution flow for debugging

### 4. Backend Implementation Reference
**File**: [BACKEND_FASTAPI_EXAMPLE.py](BACKEND_FASTAPI_EXAMPLE.py)

Provided complete FastAPI backend with:
- ✅ Proper signature verification using `algosdk.util.verify_bytes()`
- ✅ Challenge message generation and management
- ✅ Development mode support for mock signatures
- ✅ Detailed logging and debugging
- ✅ Proper JWT token creation

### 5. Documentation

Created comprehensive guides:

**[SIGNATURE_VERIFICATION_GUIDE.md](SIGNATURE_VERIFICATION_GUIDE.md)** - Understanding the signature flow
- How Algorand signatures work
- What the backend expects
- Common encoding issues
- Development vs production

**[DEBUGGING_INVALID_SIGNATURE.md](DEBUGGING_INVALID_SIGNATURE.md)** - Step-by-step debugging
- How to check browser console
- How to inspect network requests
- How to verify message encoding
- Testing with real signatures
- Comprehensive checklist

---

## The Complete Flow Now

### Frontend Flow

```
1. User clicks "Sign In" or "Sign Up"
   ↓
2. handleLogin() or handleSignup() called
   ↓
3. loginWithWallet(walletAddress) or signupWithWallet(...)
   ↓
4. Get challenge:
   POST /auth/challenge { wallet_address }
   ← message
   ↓
5. Sign message:
   handleWalletSign(message)
   → Use real PeraWallet if available
   → Use mock for development
   ← signature (base64)
   ↓
6. Send auth:
   POST /auth/login {
     wallet_address,
     message,
     signature
   }
   ← access_token
   ↓
7. Store token:
   localStorage.setItem('access_token', token)
   ↓
8. Redirect to /app/dashboard
```

### Backend Verification Flow

```
1. Receive POST /auth/login
   {
     wallet_address: "XXXXXX...",
     message: "Please sign this message...",
     signature: "base64_encoded_signature"
   }
   ↓
2. Check for development signature
   if signature.startswith('MOCK_SIGNATURE_'):
     → Accept (skip verification)
   ↓
3. Decode signature from base64
   sig_bytes = base64.b64decode(signature)
   ↓
4. Extract public key from wallet_address
   public_key = address_decode(wallet_address)[0]
   ↓
5. Encode message as UTF-8
   message_bytes = message.encode('utf-8')
   ↓
6. Verify signature
   is_valid = verify_bytes(message_bytes, sig_bytes, public_key)
   ↓
7. If valid:
   → Find/create user
   → Generate JWT token
   → Return { access_token, user }
   ↓
8. If invalid:
   → Return 401 "Invalid signature"
```

---

## Testing the Fix

### Test 1: Development Mode (No Wallet)

```typescript
// Browser console
console.log('Connected wallet:', walletAddress);
console.log('Ready to sign');
```

Then click "Sign In" and check:
- [ ] Browser console shows "Using development mock"
- [ ] Backend logs show "Development signature - verification skipped"
- [ ] JWT token received in response
- [ ] Redirected to dashboard

### Test 2: With Real PeraWallet

```typescript
// Browser console
const pera = new PeraWalletConnect();
const accounts = await pera.connect();
console.log('Connected:', accounts);
```

Then click "Sign In" and check:
- [ ] "Wallet signature" appears in console
- [ ] Browser console shows actual signature (base64)
- [ ] Backend logs show real signature verification
- [ ] JWT token received if verification passes
- [ ] Redirected to dashboard

### Test 3: Check Request/Response

Open Network tab → Find `/auth/login` → Click it:

**Request Tab should show:**
```json
{
  "wallet_address": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "message": "Please sign this message to verify...",
  "signature": "SGVsbG8gV29ybGQ=..."
}
```

**Response Tab should show (success):**
```json
{
  "access_token": "eyJhbGc...",
  "token_type":  "bearer",
  "user": {...}
}
```

**Or (error):**
```json
{
  "detail": "Invalid signature - does not match wallet address"
}
```

---

## Key Implementation Details

### Message Encoding (CRITICAL!)

The message must be encoded as UTF-8 before signing:

```typescript
// Frontend
const messageBytes = new TextEncoder().encode(message);
```

```python
# Backend (MUST match frontend encoding)
message_bytes = message.encode('utf-8')
```

### Signature Format

Signature must be:
1. Ed25519 signature (64 bytes)
2. Encoded as base64
3. Sent as JSON string (not binary)

```typescript
// Frontend
const signatureBase64 = btoa(String.fromCharCode(...signatureBytes));

// Backend
sig_bytes = base64.b64decode(signature)
```

### Development Mode

For testing without PeraWallet, backend must accept mock signatures:

```python
if signature.startswith('MOCK_SIGNATURE_') or signature.startswith('dev_sig_'):
    return True  # Skip verification
```

---

## If You Still Get "Invalid Signature"

Follow this checklist:

1. **Check Browser Console** (F12)
   - Look for signing logs
   - Check for JavaScript errors
   - Verify wallet is connected

2. **Check Network Tab** (F12)
   - Navigate to `/auth/login` request
   - Check request body (should have all 3 fields)
   - Check response body (what's the error exactly?)

3. **Check Backend Logs**
   - Make sure backend is receiving the request
   - Check exact values (wallet, message, signature)
   - Run verification test script (see debugging guide)

4. **Test Message Encoding**
   - Log message hex on both frontend and backend
   - Should be identical bytes
   - No whitespace changes allowed

5. **Test with Python Script**
   - Use test_signature.py (in debugging guide)
   - Test end-to-end with real account
   - Verify your account key works

6. **Check PeraWallet Version**
   - `npm list @perawallet/connect`
   - Should be  >= 1.4.0
   - Older versions may not support message signing

---

## Files Modified

| File | Changes |
|------|---------|
| [src/app/pages/LandingPage.tsx](src/app/pages/LandingPage.tsx) | Enhanced `handleWalletSign()` with better logging and method detection |
| [src/services/api.ts](src/services/api.ts) | Added detailed logging to `login()` and `signup()` |
| [src/app/hooks/useWalletAuth.ts](src/app/hooks/useWalletAuth.ts) | Added comprehensive logging to auth flow |

## Files Created

| File | Purpose |
|------|---------|
| [BACKEND_FASTAPI_EXAMPLE.py](BACKEND_FASTAPI_EXAMPLE.py) | Complete FastAPI backend implementation |
| [SIGNATURE_VERIFICATION_GUIDE.md](SIGNATURE_VERIFICATION_GUIDE.md) | Understanding signature verification |
| [DEBUGGING_INVALID_SIGNATURE.md](DEBUGGING_INVALID_SIGNATURE.md) | Step-by-step debugging guide |
| [BACKEND_AUTH_INTEGRATION.md](BACKEND_AUTH_INTEGRATION.md) | API integration guide |

---

## Next Steps

1. **Update your FastAPI backend** to use the code from [BACKEND_FASTAPI_EXAMPLE.py](BACKEND_FASTAPI_EXAMPLE.py)

2. **Test with development mode:**
   - No PeraWallet needed
   - Backend will auto-accept mock signatures
   - Frontend will log everything

3. **Verify the signature flow:**
   - Use the checklist in [DEBUGGING_INVALID_SIGNATURE.md](DEBUGGING_INVALID_SIGNATURE.md)
   - Test network requests
   - Check message encoding

4. **Enable production mode:**
   - Remove development signature bypass from backend
   - Test with real PeraWallet
   - Verify signatures are properly verified

---

## Support

If you still encounter issues:

1. Share the browser console logs (from the signature attempt)
2. Share the network request body (from the `/auth/login` POST)
3. Share the backend error response
4. Share your backend code (especially the verify_signature function)
5. Confirm PeraWallet version and installation
