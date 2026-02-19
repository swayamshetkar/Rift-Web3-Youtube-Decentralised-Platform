"""
DEBUGGING INVALID SIGNATURE ERROR

If you're getting "invalid signature" error, follow this step-by-step guide.
"""

## Step 1: Understanding the Error

The "invalid signature" error means:
- ❌ Backend received the request successfully
- ❌ But the signature doesn't match the message + wallet address
- ✅ The network communication is working

This is a DATA MISMATCH, not a network issue.


## Step 2: Check Browser Console

Open your browser's Developer Tools (F12) and look at the Console tab.

You should see logs like:
```
Wallet Address: XXXXXXXXXXX...
Message: Please sign this message...
Message Length: 150
Signature: A1b2C3d4E5f...
Sending login request: ...
```

If you DON'T see these logs, check:
1. Is the code actually being executed?
2. Are there any JavaScript errors?
3. Is the wallet actually connected?


## Step 3: Check Network Request/Response

In the Network tab:

### Look for: `/auth/login` (POST request)

**Request Body should look like:**
```json
{
  "wallet_address": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "message": "Please sign this message to verify...",
  "signature": "SGVsbG8gV29ybGQ=..."
}
```

**Response (if it fails):**
```json
{
  "detail": "Invalid signature - does not match wallet address"
}
```

### Common issues in Request Body:

1. **Missing field** - If wallet_address is missing, backend won't even try to verify
2. **Unknown wallet_address** - If it's not a valid 58-character Algorand address
3. **Different message** - If the message was modified (trimmed, lowercased, etc.)
4. **Wrong signature format** - If not base64 encoded or wrong type


## Step 4: Check the Message

The message is CRITICAL. Even one character difference will fail.

### Frontend side - check what message was received:
```typescript
// In handleWalletSign() function
const message = "..."; // This is what you received from backend
console.log('Message to sign:', JSON.stringify(message));
console.log('Message hex:', Array.from(new TextEncoder().encode(message)).map(b => b.toString(16)));
```

### Backend side - check what message is being verified:
```python
print(f"Message: {repr(message)}")  # Shows exact bytes
print(f"Message hex: {message.encode('utf-8').hex()}")
```

**Common message problems:**
- Trimmed: `message.trim()` ❌
- Lowercased: `message.toLowerCase()` ❌
- Modified: Any change to the text ❌
- Different encoding: UTF-8 required ✅


## Step 5: Check Signature Format

The signature must be base64 encoded.

### Frontend:
```typescript
// Check signature
console.log('Signature starts with:', signature.substring(0, 20));
console.log('Is valid base64:', /^[A-Za-z0-9+/]*={0,2}$/.test(signature));

// Verify it encodes correctly
try {
  atob(signature);  // Try to decode
  console.log('✅ Valid base64');
} catch (e) {
  console.log('❌ Invalid base64:', e.message);
}
```

### Backend:
```python
try:
    sig_bytes = base64.b64decode(signature)
    print(f"Signature length: {len(sig_bytes)} bytes")
    if len(sig_bytes) == 64:
        print("✅ Correct length for Ed25519")
    else:
        print(f"❌ Wrong length! Expected 64, got {len(sig_bytes)}")
except Exception as e:
    print(f"❌ Invalid base64: {e}")
```


## Step 6: Verify With Real PeraWallet

If you have PeraWallet installed and connected:

```typescript
// In browser console, test the actual signing
const message = "Test message";
const messageBytes = new TextEncoder().encode(message);

const signature = await window.peraWallet?.signMessage?.({
  message: messageBytes,
  signerAddress: "YOUR_WALLET_ADDRESS"
});

console.log('Signature:', signature);
```

If `signMessage` is undefined, that's the issue - your PeraWallet version doesn't have this method.


## Step 7: Use Development Mode

For testing without PeraWallet:

The frontend automatically generates mock signatures in development mode. The backend should accept these:

```python
# In backend verify_signature() function
if signature.startswith('MOCK_SIGNATURE_') or signature.startswith('dev_sig_'):
    print("⚠️  Development signature - skipping verification")
    return True
```

Make sure your backend checks for development signatures and skips verification.


## Step 8: Test With Real Coordinates

If you have a real account key, test end-to-end:

```python
"""test_signature.py - Run this to test signature verification"""
import algosdk
from algosdk.util import sign_bytes, verify_bytes
from algosdk.account import address_decode
import base64

# Use a test account
mnemonic = "Your testnet account mnemonic here"
private_key = algosdk.mnemonic.to_private_key(mnemonic)
wallet_address = algosdk.account.address_from_private_key(private_key)

print(f"Testing with wallet: {wallet_address}")

# Message to sign (same as what backend generates)
message = "Please sign this message to verify ownership of " + wallet_address

# Sign it
message_bytes = message.encode('utf-8')
signature_bytes = sign_bytes(message_bytes, private_key)
signature_base64 = base64.b64encode(signature_bytes).decode()

print(f"Message: {message}")
print(f"Signature: {signature_base64[:20]}...")

# Verify it
public_key_bytes, _ = address_decode(wallet_address)
is_valid = verify_bytes(message_bytes, signature_bytes, public_key_bytes)
print(f"Signature valid: {is_valid}")

# Now test with your backend
import requests
response = requests.post(
    "http://localhost:8000/auth/login",
    json={
        "wallet_address": wallet_address,
        "message": message,
        "signature": signature_base64
    }
)
print(f"Backend response: {response.json()}")
```

Run this:
```bash
python test_signature.py
```


## Step 9: Enable Debug Logging

### Frontend:

Already added in the code:
```typescript
// src/app/pages/LandingPage.tsx
console.log('Signing message:', message);
console.log('Wallet address:', walletAddress);
console.log('Signature received:', signature.substring(0, 20) + '...');
```

### Backend:

Add more detailed logging:
```python
def verify_algorand_signature(wallet_address: str, message: str, signature: str):
    print(f"\n{'='*50}")
    print(f"Verifying signature")
    print(f"{'='*50}")
    print(f"Wallet: {wallet_address}")
    print(f"Wallet type: {type(wallet_address)}")
    print(f"Wallet length: {len(wallet_address)}")
    print(f"\nMessage: {repr(message)}")
    print(f"Message type: {type(message)}")
    print(f"Message length: {len(message)}")
    print(f"Message bytes: {message.encode('utf-8').hex()[:80]}...")
    print(f"\nSignature: {signature[:40]}...")
    print(f"Signature type: {type(signature)}")
    print(f"Signature length: {len(signature)}")
    
    # Then do the actual verification
```


## Step 10: Check PeraWallet Version

Different versions of PeraWallet have different APIs:

```bash
npm list @perawallet/connect
```

**Common issues by version:**
- **1.3.x** - Uses `signData()` method
- **1.4.x+** - Uses `signMessage()` method
- **Some versions** - Don't have message signing at all (only transaction signing)

If your version doesn't have message signing, you need to:
1. Upgrade @perawallet/connect
2. OR use a custom wallet implementation
3. OR use the development mock for testing


## Checklist

Before running the test, verify all of these:

- [ ] Browser console shows wallet connection log
- [ ] Message is NOT trimmed or modified
- [ ] Security Length is correct (your message should be ~100+ chars)
- [ ] Signature is base64 encoded
- [ ] Wallet address is 58 characters
- [ ] Same message sent to backend as signed
- [ ] Backend is receiving the request (check server logs)
- [ ] PeraWallet can sign (or using dev mode)
- [ ] Backend has dev signature check if testing
- [ ] Network tab shows correct request body

If all of these pass and you STILL get "invalid signature":

## Step 11: Export and Share Debug Info

Share this with support/backend team:

```
Frontend Debug Info:
- Wallet Address: __________
- Message: __________
- Signature (first 20 chars): __________
- Signature length: ___ chars
- Is base64: [ ] Yes [ ] No
- Using real wallet: [ ] Yes [ ] No (dev mode)

Backend Debug Info:
- Message received: __________
- Signature received: __________
- Error detail: __________
- Backend version: __________
```

---

## Common Solutions

| Problem | Solution |
|---------|----------|
| `signMessage is not a function` | Upgrade @perawallet/connect or use dev mode |
| `Invalid base64 in signature` | Check that wallet is returning base64, not raw bytes |
| `Different message than signed` | Don't trim, lowercase, or modify message |
| `Wrong wallet address` | Use exactly 58 chars without spaces |
| `Backend returns 401` | Check if this is a known user (login vs signup) |
| `Challenge expired` | Request new challenge and sign immediately |
|`Works on dev, fails in production` | Remove dev signature check from production backend |
