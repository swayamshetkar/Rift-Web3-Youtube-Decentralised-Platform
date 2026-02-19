from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException

from ..config import settings
from ..services import algorand_service
from .auth import get_current_user


router = APIRouter()


def _require_platform_operator(current_user: dict) -> None:
    configured_platform = (settings.platform_wallet or "").strip().lower()
    if not configured_platform:
        raise HTTPException(status_code=500, detail="PLATFORM_WALLET is not configured.")

    wallet = current_user["wallet_address"].strip().lower()
    if wallet != configured_platform:
        raise HTTPException(status_code=403, detail="Only platform wallet can access this resource.")


def _to_float(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.000001")))


@router.get("/balance")
async def get_my_wallet_balance(current_user: dict = Depends(get_current_user)):
    wallet = current_user["wallet_address"]
    try:
        balance = algorand_service.get_asset_balance(wallet)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "wallet_address": wallet,
        "asset_id": settings.asset_id,
        "balance": _to_float(balance),
    }


@router.get("/platform-balance")
async def get_platform_wallet_balance(current_user: dict = Depends(get_current_user)):
    _require_platform_operator(current_user)
    platform_wallet = (settings.platform_wallet or "").strip()
    try:
        balance = algorand_service.get_asset_balance(platform_wallet)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "wallet_address": platform_wallet,
        "asset_id": settings.asset_id,
        "balance": _to_float(balance),
    }
