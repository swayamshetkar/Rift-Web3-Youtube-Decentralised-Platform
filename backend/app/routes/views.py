from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..database import get_db
from ..utils import anti_bot
from .auth import get_current_user


router = APIRouter()


class TrackViewRequest(BaseModel):
    video_id: str
    watch_seconds: int
    wallet: str | None = None
    device_fingerprint: str | None = None


@router.post("/track")
async def track_view(
    payload: TrackViewRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    wallet_address = current_user["wallet_address"]
    if payload.wallet and payload.wallet != wallet_address:
        raise HTTPException(status_code=403, detail="Wallet mismatch.")

    ip_address = request.client.host if request.client else None
    fingerprint = payload.device_fingerprint or request.headers.get("x-device-fingerprint")

    is_valid, reason = anti_bot.validate_view(
        wallet=wallet_address,
        video_id=payload.video_id,
        watch_seconds=payload.watch_seconds,
        ip_address=ip_address,
        device_fingerprint=fingerprint,
    )
    if not is_valid:
        return {"status": "ignored", "reason": reason}

    db = get_db()
    video_res = (
        db.table("videos")
        .select("id, total_views, total_watch_time, ads_enabled")
        .eq("id", payload.video_id)
        .limit(1)
        .execute()
    )
    if not video_res.data:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = video_res.data[0]
    insert_payload = {
        "video_id": payload.video_id,
        "viewer_wallet": wallet_address,
        "watch_seconds": payload.watch_seconds,
        "settled": False,
        "viewer_fingerprint": fingerprint,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    created = db.table("views").insert(insert_payload).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to store view.")

    db.table("videos").update(
        {
            "total_views": int(video.get("total_views", 0)) + 1,
            "total_watch_time": int(video.get("total_watch_time", 0)) + int(payload.watch_seconds),
        }
    ).eq("id", payload.video_id).execute()

    return {"status": "recorded"}
