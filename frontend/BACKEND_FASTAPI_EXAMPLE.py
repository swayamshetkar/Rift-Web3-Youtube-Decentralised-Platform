"""
FastAPI Backend Implementation for Algorand Wallet Authentication

This shows how to properly verify Algorand wallet signatures in your FastAPI backend.
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import base64
from datetime import datetime, timedelta
import algosdk
from algosdk.util import verify_bytes
from algosdk.account import address_decode
import jwt
import os

app = FastAPI()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30
CHALLENGE_EXPIRE_MINUTES = 5  # Challenges expire after 5 minutes

# ========================
# Database Models (pseudo code)
# ========================

class User:
    id: str
    wallet_address: str
    username: str
    role: str  # 'creator', 'viewer', 'advertiser'
    created_at: datetime

class Challenge:
    """Stores challenge messages with expiration"""
    id: str
    wallet_address: str
    message: str
    created_at: datetime
    expires_at: datetime
    used: bool


# ========================
# Request/Response Models
# ========================

class ChallengeRequest(BaseModel):
    wallet_address: str

class ChallengeResponse(BaseModel):
    message: str
    challenge_id: str
    expires_at: str

class SignupRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str
    username: str
    role: str  # 'creator', 'viewer', 'advertiser'

class LoginRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    wallet_address: str
    username: str
    role: str


# ========================
# Signature Verification
# ========================

def verify_algorand_signature(
    wallet_address: str,
    message: str,
    signature: str
) -> bool:
    """
    Verify an Algorand wallet signature.
    
    Args:
        wallet_address: The wallet address that signed the message
        message: The original message text
        signature: The signature in base64 format
    
    Returns:
        True if valid
    
    Raises:
        HTTPException if invalid
    """
    print(f"Verifying signature for {wallet_address}")
    print(f"Message: {repr(message)}")
    print(f"Signature: {signature[:20]}...")
    
    # IMPORTANT FOR DEVELOPMENT:
    # Check for dev/mock signatures that should skip verification
    if signature.startswith('MOCK_SIGNATURE_') or signature.startswith('dev_sig_'):
        print("⚠️  Using development signature - verification skipped")
        return True
    
    try:
        # Decode the signature from base64
        try:
            sig_bytes = base64.b64decode(signature)
            print(f"Signature bytes length: {len(sig_bytes)}")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid signature format (not base64): {str(e)}"
            )
        
        # Verify signature length (should be 64 bytes for Ed25519)
        if len(sig_bytes) != 64:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid signature length: {len(sig_bytes)}, expected 64"
            )
        
        # Extract public key from wallet address
        try:
            public_key_bytes, _ = address_decode(wallet_address)
            print(f"Public key extracted from address")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid wallet address: {str(e)}"
            )
        
        # CRITICAL: Encode message as UTF-8 (same as frontend)
        message_bytes = message.encode('utf-8')
        print(f"Message bytes: {message_bytes.hex()[:40]}...")
        
        # Verify the signature
        is_valid = verify_bytes(message_bytes, sig_bytes, public_key_bytes)
        
        if not is_valid:
            print("❌ Signature verification failed")
            raise HTTPException(
                status_code=401,
                detail="Invalid signature - does not match wallet address"
            )
        
        print("✅ Signature verified successfully")
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Signature verification failed: {str(e)}"
        )


# ========================
# JWT Token Management
# ========================

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": user_id, "exp": expire}
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> str:
    """Verify and decode JWT token, return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ========================
# Challenge Management
# ========================

def generate_challenge(wallet_address: str) -> str:
    """Generate a challenge message for the wallet to sign"""
    timestamp = datetime.utcnow().isoformat()
    message = f"Sign this message to verify ownership of {wallet_address}. Timestamp: {timestamp}"
    return message


# Simulated database storage (use a real database!)
_challenges = {}  # {challenge_id: Challenge}
_users = {}  # {wallet_address: User}


# ========================
# API Endpoints
# ========================

@app.post("/auth/challenge", response_model=ChallengeResponse)
async def get_challenge(request: ChallengeRequest):
    """
    Step 1: Frontend requests a challenge message to sign
    
    The backend generates a unique message and stores it temporarily.
    The frontend will sign this message and send it back.
    """
    wallet_address = request.wallet_address
    
    # Validate wallet address format (Algorand addresses are 58 characters)
    if not wallet_address or len(wallet_address) != 58:
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address format"
        )
    
    # Generate challenge
    message = generate_challenge(wallet_address)
    challenge_id = f"challenge_{wallet_address}_{int(datetime.utcnow().timestamp())}"
    
    # Store challenge (in real app, use database)
    expires_at = datetime.utcnow() + timedelta(minutes=CHALLENGE_EXPIRE_MINUTES)
    _challenges[challenge_id] = {
        'wallet_address': wallet_address,
        'message': message,
        'created_at': datetime.utcnow(),
        'expires_at': expires_at,
        'used': False
    }
    
    print(f"Challenge created for {wallet_address}")
    print(f"Message: {message}")
    
    return ChallengeResponse(
        message=message,
        challenge_id=challenge_id,
        expires_at=expires_at.isoformat()
    )


@app.post("/auth/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    Step 3: Frontend sends signed message to create account
    
    Flow:
    1. Frontend receives message from /auth/challenge
    2. Frontend signs message with wallet
    3. Frontend sends: wallet_address, message, signature, username, role
    4. Backend verifies signature matches wallet_address
    5. Backend creates user and returns JWT token
    """
    wallet_address = request.wallet_address
    message = request.message
    signature = request.signature
    username = request.username
    role = request.role
    
    print(f"\n=== SIGNUP REQUEST ===")
    print(f"Wallet: {wallet_address}")
    print(f"Username: {username}")
    print(f"Role: {role}")
    
    # Verify the signature
    verify_algorand_signature(wallet_address, message, signature)
    
    # Check if user already exists
    if wallet_address in _users:
        raise HTTPException(
            status_code=409,
            detail="Wallet already registered"
        )
    
    # Create user (in real app, save to database)
    user = {
        'id': f"user_{wallet_address}",
        'wallet_address': wallet_address,
        'username': username,
        'role': role,
        'created_at': datetime.utcnow().isoformat()
    }
    _users[wallet_address] = user
    
    # Create JWT token
    access_token = create_access_token(user['id'])
    
    print(f"✅ User created: {username}")
    
    return AuthResponse(
        access_token=access_token,
        user=user
    )


@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Step 3: Frontend sends signed message to login
    
    Flow:
    1. Frontend receives message from /auth/challenge
    2. Frontend signs message with wallet
    3. Frontend sends: wallet_address, message, signature
    4. Backend verifies signature matches wallet_address
    5. Backend finds user and returns JWT token
    """
    wallet_address = request.wallet_address
    message = request.message
    signature = request.signature
    
    print(f"\n=== LOGIN REQUEST ===")
    print(f"Wallet: {wallet_address}")
    
    # Verify the signature
    verify_algorand_signature(wallet_address, message, signature)
    
    # Check if user exists
    if wallet_address not in _users:
        raise HTTPException(
            status_code=401,
            detail="Wallet not registered. Please sign up first."
        )
    
    user = _users[wallet_address]
    
    # Create JWT token
    access_token = create_access_token(user['id'])
    
    print(f"✅ Login successful for {user['username']}")
    
    return AuthResponse(
        access_token=access_token,
        user=user
    )


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user(authorization: str = None):
    """
    Get current user info
    
    Required header: Authorization: Bearer <token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    user_id = verify_token(token)
    
    # Find user by ID (in real app, query database)
    for wallet, user in _users.items():
        if user['id'] == user_id:
            return UserResponse(**user)
    
    raise HTTPException(status_code=404, detail="User not found")


# ========================
# Testing Endpoints
# ========================

@app.get("/auth/test")
async def test_debug():
    """Debug endpoint to check server status and stored data"""
    return {
        "status": "ok",
        "challenges": len(_challenges),
        "users": len(_users),
        "user_addresses": list(_users.keys())
    }
