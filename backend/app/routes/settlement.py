from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException

from ..config import settings
from ..database import get_db
from ..services import banner_engine, reward_engine
from .auth import get_current_user


router = APIRouter()


def _require_platform_operator(current_user: dict) -> None:
    configured_platform = (settings.platform_wallet or "").strip().lower()
    if not configured_platform:
        return

    wallet = current_user["wallet_address"].strip().lower()
    if wallet != configured_platform:
        raise HTTPException(status_code=403, detail="Only platform wallet can trigger settlement.")


@router.get("/")
async def get_settlements(limit: int = 100):
    db = get_db()
    result = (
        db.table("settlements")
        .select("*")
        .order("timestamp", desc=True)
        .limit(min(max(limit, 1), 500))
        .execute()
    )
    return result.data or []


@router.post("/trigger")
async def trigger_settlement(current_user: dict = Depends(get_current_user)):
    _require_platform_operator(current_user)
    try:
        report = reward_engine.calculate_and_settle()
        return {"status": "success", "report": report}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/trigger-banner")
async def trigger_banner_distribution(current_user: dict = Depends(get_current_user)):
    _require_platform_operator(current_user)
    try:
        report = banner_engine.distribute_banner_rewards()
        return {"status": "success", "report": report}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/summary")
async def settlement_summary():
    db = get_db()
    settlements = db.table("settlements").select("*").order("timestamp", desc=True).limit(1000).execute().data or []
    banner_campaigns = db.table("banner_campaigns").select("fixed_price, distributed").execute().data or []

    totals = {
        "video_ad_creator_payout": Decimal("0"),
        "video_ad_platform_fee": Decimal("0"),
        "banner_creator_payout": Decimal("0"),
        "banner_revenue": Decimal("0"),
        "banner_platform_share": Decimal("0"),
        "count": len(settlements),
    }

    for settlement in settlements:
        settlement_type = settlement.get("settlement_type", "video_ad")
        amount = Decimal(str(settlement.get("amount", 0)))
        platform_fee = Decimal(str(settlement.get("platform_fee", 0)))

        if settlement_type == "banner":
            totals["banner_creator_payout"] += amount
        else:
            totals["video_ad_creator_payout"] += amount
            totals["video_ad_platform_fee"] += platform_fee

    banner_revenue = sum(Decimal(str(campaign.get("fixed_price", 0))) for campaign in banner_campaigns if campaign.get("distributed"))
    totals["banner_revenue"] = banner_revenue
    totals["banner_platform_share"] = (banner_revenue * Decimal("0.30")).quantize(Decimal("0.000001"))

    return {
        "count": totals["count"],
        "video_ad_creator_payout": float(totals["video_ad_creator_payout"]),
        "video_ad_platform_fee": float(totals["video_ad_platform_fee"]),
        "banner_creator_payout": float(totals["banner_creator_payout"]),
        "banner_revenue": float(totals["banner_revenue"]),
        "banner_platform_share": float(totals["banner_platform_share"]),
    }
