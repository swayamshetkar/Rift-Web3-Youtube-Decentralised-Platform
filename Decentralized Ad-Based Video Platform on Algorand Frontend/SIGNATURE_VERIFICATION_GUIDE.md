/**
 * Algorand Wallet Signature Authentication
 * 
 * This explains the complete signature flow for FastAPI + Algorand wallet auth
 */

# Complete Signature Flow

## Backend Expectation (FastAPI)

The backend expects to receive:
```json
{
  "wallet_address": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "message": "Please sign this message to verify...",
  "signature": "base64_encoded_signature"
}
```

## How Algorand Signatures Work

### Real Wallet Signing (PeraWallet)
1. **Message** - Plain text challenge from backend
2. **Sign** - Wallet signs the message using the account's private key
3. **Signature** - Ed25519 signature (64 bytes) returned as base64

### Signature Verification in Backend
```python
from algosdk.util import verify_bytes

# Backend receives: wallet_address, message, signature
# The backend must:
# 1. Decode the base64 signature
# 2. Verify: signature was created by signing the message with wallet_address's key
# 3. Reject if: signature doesn't match message or wallet_address

verified = verify_bytes(
    message.encode('utf-8'),  # IMPORTANT: message must be UTF-8 bytes
    base64.b64decode(signature),  # Convert signature from base64
    algosdk.account.address_from_public_key(wallet_public_key)  # Get public key from address
)
```

## Critical Points for Frontend

1. **Message Encoding**: Must be UTF-8 before signing
   ```typescript
   const messageBytes = new TextEncoder().encode(message);
   ```

2. **Signature Format**: Return base64-encoded bytes
   ```typescript
   // If wallet returns raw bytes:
   const signatureBase64 = btoa(String.fromCharCode(...signatureBytes));
   
   // If wallet returns base64:
   // Use directly
   ```

3. **Timing**: Sign immediately after receiving challenge (they expire)

4. **No Modification**: Never modify the message after receiving it

## Common Issues & Solutions

### Issue: "Invalid Signature"

**Cause 1**: Message was modified
```typescript
// WRONG - Don't trim or modify:
const message = challenge.message.trim();  // ❌ Will fail verification

// RIGHT - Use exactly as received:
const signature = await wallet.signMessage({
  message: challenge.message  // ✅ No changes
});
```

**Cause 2**: Wrong encoding
```typescript
// WRONG - Wrong UTF encoding:
const sig = wallet.sign(message);  // Message not properly encoded

// RIGHT - Explicit UTF-8:
const messageBytes = new TextEncoder().encode(message);
const sig = await wallet.signData(messageBytes);
```

**Cause 3**: Signature not base64 encoded
```typescript
// WRONG - Sending raw bytes:
await fetch('/auth/login', {
  body: JSON.stringify({
    signature: uint8ArraySignature  // ❌ Can't JSON serialize
  })
});

// RIGHT - Convert to base64:
const signatureB64 = btoa(String.fromCharCode(...signatureBytes));
await fetch('/auth/login', {
  body: JSON.stringify({
    signature: signatureB64  // ✅ Valid base64 string
  })
});
```

**Cause 4**: PeraWallet API changed
```typescript
// Check what methods are available:
const pera = new PeraWalletConnect();

// Try these in order:
// 1. pera.signMessage() - PeraWallet 1.4+
// 2. pera.signData() - Alternative API
// 3. pera.signTransaction() - Transaction signing (for message signing)
```

## Development Implementation

For testing without a real wallet, use proper mocking:

```typescript
/**
 * Mock signature generator that simulates Algorand signing
 * For development only - backend should detect and skip verification
 */
function generateMockSignature(message: string, walletAddress: string): string {
  // Option 1: Return a fixed signature that backend knows to skip
  if (process.env.NODE_ENV === 'development') {
    return 'MOCK_SIGNATURE_' + btoa(walletAddress);
  }
  
  // Option 2: Return signature that includes message hash (for testing)
  const hash = btoa(message).substring(0, 43); // Simulate signature length
  return hash + 'A'; // Pad to look like base64 signature
}
```

## Backend Verification in FastAPI

```python
from fastapi import HTTPException
from algosdk.util import verify_bytes
from algosdk.account import address_from_public_key
import base64

def verify_signature(wallet_address: str, message: str, signature: str) -> bool:
    """
    Verify an Algorand wallet signature
    
    Args:
        wallet_address: The wallet address that signed
        message: The original message text
        signature: Base64-encoded signature
    
    Returns:
        True if valid, raises HTTPException if invalid
    """
    try:
        # Decode signature from base64
        sig_bytes = base64.b64decode(signature)
        
        # For development, allow mock signatures
        if signature.startswith('MOCK_SIGNATURE_'):
            return True
        
        # Get the public key from the address
        # Note: This requires looking up the account to get public key
        # Usually done by querying the Algorand blockchain
        public_key_bytes = algosdk.account.address_decode(wallet_address)[0]
        
        # Encode message as UTF-8
        message_bytes = message.encode('utf-8')
        
        # Verify signature
        is_valid = verify_bytes(message_bytes, sig_bytes, public_key_bytes)
        
        if not is_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid signature - does not match wallet address"
            )
        
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Signature verification failed: {str(e)}"
        )

@app.post("/auth/login")
async def login(wallet_address: str, message: str, signature: str):
    # Step 1: Verify signature
    verify_signature(wallet_address, message, signature)
    
    # Step 2: Check if user exists
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Step 3: Create JWT
    token = create_access_token(user.id)
    return {"access_token": token}
```

---

## Testing the Flow

### Step 1: Get Challenge
```bash
curl -X POST http://localhost:8000/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "XXXXXX..."}'

# Response:
# {"message": "Please sign this message...", "challenge_id": "xxx"}
```

### Step 2: Frontend Signs (Manually for testing)
```python
# In Python shell or test
import algosdk
from algosdk.util import sign_bytes
import base64

message = "Please sign this message..."
private_key = "..."  # From test account
public_key = algosdk.account.address_from_private_key(private_key)

# Sign
message_bytes = message.encode('utf-8')
sig = sign_bytes(message_bytes, private_key)
sig_base64 = base64.b64encode(sig).decode()

print(f"Signature: {sig_base64}")
```

### Step 3: Send Signature to Backend
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "XXXXXX...",
    "message": "Please sign...",
    "signature": "'$sig_base64'"
  }'

# Success response:
# {"access_token": "eyJhbGc..."}
```

---

## Debugging Invalid Signature

### Add Logging on Frontend
```typescript
// Before sending to backend
console.log('Wallet Address:', walletAddress);
console.log('Message:', message);
console.log('Message Length:', message.length);
console.log('Signature:', signature.substring(0, 20) + '...');
```

### Add Logging on Backend
```python
@app.post("/auth/login")
async def login(wallet_address: str, message: str, signature: str):
    print(f"Received:")
    print(f"  wallet_address: {wallet_address}")
    print(f"  message: {repr(message)}")  # Show exact bytes
    print(f"  signature: {signature[:20]}...")
    
    try:
        verify_signature(wallet_address, message, signature)
    except HTTPException as e:
        print(f"Verification failed: {e.detail}")
        raise
```

### Check Message Encoding
```python
# Backend side - debug message bytes
message_bytes = message.encode('utf-8')
print(f"Message bytes: {message_bytes.hex()}")
print(f"Message length: {len(message_bytes)}")

# Frontend side
const messageBytes = new TextEncoder().encode(message);
console.log('Message bytes:', Array.from(messageBytes).map(b => b.toString(16)));
```
