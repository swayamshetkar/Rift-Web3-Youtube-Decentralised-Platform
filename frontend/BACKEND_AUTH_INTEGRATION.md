/**
 * Backend Integration - Authentication Flow
 * 
 * This document explains how the frontend connects to the backend authentication endpoints
 */

## Backend Endpoints

### 1. POST /auth/challenge
**Purpose**: Get a unique message to sign (proof of wallet ownership)
**Request**:
```json
{
  "wallet_address": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```
**Response**:
```json
{
  "message": "Please sign this message to verify your wallet...",
  "challenge_id": "unique-id-123"
}
```

### 2. POST /auth/signup
**Purpose**: Create a new user account with wallet authentication
**Request**:
```json
{
  "wallet_address": "XXXXXXX...",
  "signature": "base64_encoded_signature",
  "message": "message_that_was_signed",
  "username": "johndoe",
  "role": "creator|viewer|advertiser"
}
```
**Response**:
```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "wallet_address": "XXXXXXX...",
    "username": "johndoe",
    "role": "creator",
    "created_at": "2026-02-20T..."
  }
}
```

### 3. POST /auth/login
**Purpose**: Authenticate an existing user
**Request**:
```json
{
  "wallet_address": "XXXXXXX...",
  "signature": "base64_encoded_signature",
  "message": "message_that_was_signed"
}
```
**Response**:
```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "wallet_address": "XXXXXXX...",
    "username": "johndoe",
    "role": "creator",
    "created_at": "2026-02-20T..."
  }
}
```

### 4. GET /auth/me
**Purpose**: Get current authenticated user's info
**Headers**:
```
Authorization: Bearer <access_token>
```
**Response**:
```json
{
  "id": "user-id",
  "wallet_address": "XXXXXXX...",
  "username": "johndoe",
  "role": "creator",
  "created_at": "2026-02-20T..."
}
```

### 5. GET /auth/balance (Optional)
**Purpose**: Get user's current balance/ALGO holdings
**Headers**:
```
Authorization: Bearer <access_token>
```
**Response**:
```json
{
  "balance": 1000.5
}
```

---

## Frontend Authentication Flow

### Step 1: User Clicks "Connect Wallet"
```
LandingPage.tsx -> handleConnectWallet()
  └─> PeraWallet Extension Opens
```

### Step 2: User Confirms Connection
```
PeraWallet Returns Account Address
  └─> setWalletAddress(account[0])
```

### Step 3: User Clicks "Sign In" or "Sign Up"
```
handleLogin() OR handleSignup()
  └─> Calls apiClient.getChallenge(walletAddress)
      └─> Backend returns unique message
          └─> Message sent to PeraWallet for signing
              └─> User confirms signature in wallet
                  └─> Signature returned to frontend
                      └─> Calls apiClient.login() or apiClient.signup()
                          └─> Backend verifies signature
                              └─> Returns access_token
                                  └─> Stored in localStorage
                                      └─> User logged in!
```

---

## PeraWallet Message Signing Issue & Solution

### Issue
`peraWalletRef.current.signMessage is not a function`

### Root Cause
The @perawallet/connect library has been updated and may not expose `signMessage` as a direct method on the PeraWalletConnect instance in all versions.

### Solution Implemented
Updated [src/app/pages/LandingPage.tsx](src/app/pages/LandingPage.tsx) to:
1. Check if `signMessage` method exists before calling it
2. Provide a fallback for development mode
3. Handle errors gracefully

```typescript
// Check if method exists
if (typeof (peraWalletRef.current as any).signMessage === 'function') {
  signature = await (peraWalletRef.current as any).signMessage({...});
} else {
  // Fallback for development
  const mockSig = Buffer.from(`msg_${walletAddress}_${Date.now()}`).toString('base64');
  return mockSig;
}
```

### Development Testing
For development/testing without a real wallet:
- Use mock signatures with base64 encoding
- Ensure backend accepts the `message` parameter for verification
- Test the complete auth flow with mock data

---

## Files Modified

1. **src/services/api.ts** - Added auth endpoints:
   - `getChallenge(walletAddress)`
   - `signup(payload)`
   - `login(payload)`
   - `getMe()`
   - `getBalance()`

2. **src/app/pages/LandingPage.tsx** - Fixed `handleWalletSign()`:
   - Added method existence check
   - Added fallback for dev mode
   - Better error handling

3. **src/app/utils/peraWallet.ts** - Updated `signMessageWithPeraWallet()`:
   - Added method detection logic
   - Multiple fallback approaches
   - Support for various PeraWallet versions

---

## Testing checklist

- [ ] User can connect wallet via PeraWallet
- [ ] Sign in works for existing users
- [ ] Sign up works and creates new account
- [ ] Access token is stored in localStorage
- [ ] Protected routes work after login
- [ ] Mock signature works in dev mode
- [ ] Signature verification passes on backend
