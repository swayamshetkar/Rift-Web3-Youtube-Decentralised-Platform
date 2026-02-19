from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from ..config import settings
from ..database import get_db
from ..services import algorand_service


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

ALGORITHM = "HS256"
CHALLENGE_TTL_SECONDS = 5 * 60
challenge_store: dict[str, dict[str, Any]] = {}


class ChallengeRequest(BaseModel):
    wallet_address: str


class ChallengeResponse(BaseModel):
    message: str
    expires_at: str


class LoginRequest(BaseModel):
    wallet_address: str
    signature: str
    message: str


class SignupRequest(BaseModel):
    wallet_address: str
    signature: str
    message: str
    username: str = Field(min_length=2, max_length=32)
    role: str = "viewer"


class Token(BaseModel):
    access_token: str
    token_type: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_wallet(wallet: str) -> str:
    return wallet.strip()


def _cleanup_challenges() -> None:
    now = _now()
    expired_wallets = [wallet for wallet, payload in challenge_store.items() if payload["expires_at"] <= now]
    for wallet in expired_wallets:
        challenge_store.pop(wallet, None)


def _issue_challenge(wallet_address: str) -> ChallengeResponse:
    _cleanup_challenges()
    nonce = secrets.token_urlsafe(24)
    issued_at = _now()
    expires_at = issued_at + timedelta(seconds=CHALLENGE_TTL_SECONDS)
    message = f"RIFT_AUTH:{nonce}:{int(issued_at.timestamp())}"

    challenge_store[_normalize_wallet(wallet_address)] = {
        "message": message,
        "expires_at": expires_at,
        "used": False,
    }
    return ChallengeResponse(message=message, expires_at=expires_at.isoformat())


def _validate_challenge(wallet_address: str, message: str) -> bool:
    _cleanup_challenges()
    payload = challenge_store.get(_normalize_wallet(wallet_address))
    if not payload:
        return False
    if payload["used"]:
        return False
    if payload["expires_at"] <= _now():
        return False
    if payload["message"] != message:
        return False
    payload["used"] = True
    return True


def _create_access_token(data: dict[str, Any]) -> str:
    expires_at = _now() + timedelta(minutes=settings.jwt_expire_minutes)
    token_payload = {**data, "exp": int(expires_at.timestamp())}
    return jwt.encode(token_payload, settings.effective_jwt_secret, algorithm=ALGORITHM)


def _validate_role(role: str) -> str:
    allowed_roles = {"creator", "viewer", "advertiser"}
    normalized = (role or "viewer").lower()
    if normalized not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role.")
    return normalized


@router.post("/challenge", response_model=ChallengeResponse)
async def auth_challenge(request: ChallengeRequest):
    wallet_address = _normalize_wallet(request.wallet_address)
    if not wallet_address:
        raise HTTPException(status_code=400, detail="wallet_address is required.")
    return _issue_challenge(wallet_address)


@router.post("/signup", response_model=Token)
async def signup(request: SignupRequest):
    wallet_address = _normalize_wallet(request.wallet_address)
    role = _validate_role(request.role)

    if not _validate_challenge(wallet_address, request.message):
        raise HTTPException(status_code=401, detail="Invalid or expired challenge.")

    if not algorand_service.verify_signature(wallet_address, request.message, request.signature):
        raise HTTPException(status_code=401, detail="Invalid signature.")

    db = get_db()
    existing_user = db.table("users").select("id").eq("wallet_address", wallet_address).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="User already exists. Please login.")

    created = db.table("users").insert(
        {
            "wallet_address": wallet_address,
            "username": request.username.strip(),
            "role": role,
            "subscribers_count": 0,
        }
    ).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to create user.")

    user = created.data[0]
    token = _create_access_token(
        {
            "sub": wallet_address,
            "user_id": user["id"],
            "role": user.get("role", role),
        }
    )
    return Token(access_token=token, token_type="bearer")


@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    wallet_address = _normalize_wallet(request.wallet_address)

    if not _validate_challenge(wallet_address, request.message):
        raise HTTPException(status_code=401, detail="Invalid or expired challenge.")

    if not algorand_service.verify_signature(wallet_address, request.message, request.signature):
        raise HTTPException(status_code=401, detail="Invalid signature.")

    db = get_db()
    user_res = db.table("users").select("*").eq("wallet_address", wallet_address).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found. Please sign up.")

    user = user_res.data[0]
    token = _create_access_token(
        {
            "sub": wallet_address,
            "user_id": user["id"],
            "role": user.get("role", "viewer"),
        }
    )
    return Token(access_token=token, token_type="bearer")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, str]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.effective_jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        raise credentials_exception

    wallet_address = payload.get("sub")
    user_id = payload.get("user_id")
    role = payload.get("role", "viewer")
    if not wallet_address or not user_id:
        raise credentials_exception
    return {"wallet_address": wallet_address, "user_id": user_id, "role": role}


@router.get("/me")
async def get_me(current_user: dict[str, str] = Depends(get_current_user)):
    db = get_db()
    user_res = db.table("users").select("*").eq("id", current_user["user_id"]).limit(1).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return user_res.data[0]
