from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..database import get_db
from ..services import algorand_service, storage_service
from .auth import get_current_user


router = APIRouter()


def _to_decimal(value: str | float) -> Decimal:
    try:
        return Decimal(str(value))
    except InvalidOperation as exc:
        raise HTTPException(status_code=400, detail="Invalid numeric value.") from exc


@router.post("/create")
async def create_campaign(
    video_id: str = Form(...),
    budget: float = Form(...),
    reward_per_view: float = Form(...),
    file: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user),
):
    budget_dec = _to_decimal(budget)
    reward_per_view_dec = _to_decimal(reward_per_view)
    if budget_dec <= 0 or reward_per_view_dec <= 0:
        raise HTTPException(status_code=400, detail="budget and reward_per_view must be > 0.")
    if reward_per_view_dec > budget_dec:
        raise HTTPException(status_code=400, detail="reward_per_view cannot exceed budget.")

    db = get_db()
    video = db.table("videos").select("id").eq("id", video_id).limit(1).execute()
    if not video.data:
        raise HTTPException(status_code=404, detail="Video not found.")

    ad_cid = None
    if file:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Ad file is empty.")
        ad_cid = storage_service.upload_file(content, file.filename or "ad-video.mp4")

    created = db.table("ad_campaigns").insert(
        {
            "advertiser_wallet": current_user["wallet_address"],
            "video_id": video_id,
            "budget": float(budget_dec),
            "remaining_budget": float(budget_dec),
            "reward_per_view": float(reward_per_view_dec),
            "active": True,
            "ad_video_cid": ad_cid,
        }
    ).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to create ad campaign.")

    return {
        "status": "success",
        "campaign_id": created.data[0]["id"],
        "ad_cid": ad_cid,
    }


@router.get("/active")
async def list_active_campaigns():
    db = get_db()
    res = db.table("ad_campaigns").select("*").eq("active", True).gt("remaining_budget", 0).execute()
    return res.data or []


@router.get("/me")
async def list_my_campaigns(current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = (
        db.table("ad_campaigns")
        .select("*, videos(title)")
        .eq("advertiser_wallet", current_user["wallet_address"])
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("/campaign/{campaign_id}/withdraw")
async def withdraw_unused_budget(campaign_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    campaign_res = (
        db.table("ad_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("advertiser_wallet", current_user["wallet_address"])
        .limit(1)
        .execute()
    )
    if not campaign_res.data:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    campaign = campaign_res.data[0]
    remaining_budget = _to_decimal(campaign.get("remaining_budget", 0))
    if remaining_budget <= 0:
        raise HTTPException(status_code=400, detail="No remaining budget to withdraw.")

    tx_hash = algorand_service.withdraw_unused(current_user["wallet_address"], remaining_budget)
    db.table("ad_campaigns").update({"remaining_budget": 0, "active": False}).eq("id", campaign_id).execute()

    return {"status": "success", "tx_hash": tx_hash, "withdrawn_amount": float(remaining_budget)}


@router.post("/banner/create")
async def create_banner_campaign(
    tier: str = Form(...),
    fixed_price: float = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    if tier not in {"1m", "3m", "6m"}:
        raise HTTPException(status_code=400, detail="tier must be one of: 1m, 3m, 6m.")

    fixed_price_dec = _to_decimal(fixed_price)
    if fixed_price_dec <= 0:
        raise HTTPException(status_code=400, detail="fixed_price must be > 0.")

    try:
        parsed_start = date.fromisoformat(start_date)
        parsed_end = date.fromisoformat(end_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Dates must be ISO format (YYYY-MM-DD).") from exc

    if parsed_end <= parsed_start:
        raise HTTPException(status_code=400, detail="end_date must be later than start_date.")

    db = get_db()
    created = db.table("banner_campaigns").insert(
        {
            "advertiser_wallet": current_user["wallet_address"],
            "tier": tier,
            "fixed_price": float(fixed_price_dec),
            "start_date": parsed_start.isoformat(),
            "end_date": parsed_end.isoformat(),
            "active": True,
            "distributed": False,
        }
    ).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to create banner campaign.")
    return {"status": "success", "banner_campaign_id": created.data[0]["id"]}


@router.get("/banner/active")
async def list_active_banner_campaigns():
    db = get_db()
    campaigns = db.table("banner_campaigns").select("*").eq("active", True).execute()
    return campaigns.data or []


@router.get("/banner/me")
async def list_my_banner_campaigns(current_user: dict = Depends(get_current_user)):
    db = get_db()
    campaigns = (
        db.table("banner_campaigns")
        .select("*")
        .eq("advertiser_wallet", current_user["wallet_address"])
        .order("created_at", desc=True)
        .execute()
    )
    return campaigns.data or []


@router.get("/summary")
async def advertiser_spend_summary(current_user: dict = Depends(get_current_user)):
    db = get_db()

    ad_campaigns = (
        db.table("ad_campaigns")
        .select("budget, remaining_budget")
        .eq("advertiser_wallet", current_user["wallet_address"])
        .execute()
        .data
        or []
    )
    total_budget = sum(_to_decimal(c.get("budget")) for c in ad_campaigns)
    total_remaining = sum(_to_decimal(c.get("remaining_budget")) for c in ad_campaigns)
    total_spent = total_budget - total_remaining
    if total_spent < 0:
        total_spent = _to_decimal(0)

    banner_campaigns = (
        db.table("banner_campaigns")
        .select("fixed_price, distributed")
        .eq("advertiser_wallet", current_user["wallet_address"])
        .execute()
        .data
        or []
    )
    banner_committed = sum(_to_decimal(c.get("fixed_price")) for c in banner_campaigns)
    banner_distributed = sum(_to_decimal(c.get("fixed_price")) for c in banner_campaigns if c.get("distributed"))

    return {
        "video_ads": {
            "total_budget": float(total_budget),
            "total_remaining": float(total_remaining),
            "total_spent": float(total_spent),
        },
        "banner_ads": {
            "total_committed": float(banner_committed),
            "total_distributed": float(banner_distributed),
        },
    }
