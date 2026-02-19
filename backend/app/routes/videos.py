from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..database import get_db
from ..services import storage_service
from .auth import get_current_user


router = APIRouter()


@router.post("/upload")
async def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="Video file is empty.")

    try:
        cid = storage_service.upload_file(file_content, file.filename or "video.mp4")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pinata upload failed: {exc}") from exc

    db = get_db()
    insert_payload = {
        "creator_id": current_user["user_id"],
        "cid": cid,
        "title": title.strip(),
        "description": description.strip(),
        "ads_enabled": True,
    }
    created = db.table("videos").insert(insert_payload).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to save video metadata.")

    created_video = created.data[0]
    return {
        "status": "success",
        "video_id": created_video["id"],
        "cid": cid,
        "ipfs_url": storage_service.build_ipfs_url(cid),
    }


@router.get("/list")
async def list_videos():
    db = get_db()
    videos = db.table("videos").select("*, users(username, wallet_address)").order("created_at", desc=True).execute()
    return videos.data or []


@router.get("/me")
async def list_my_videos(current_user: dict = Depends(get_current_user)):
    db = get_db()
    videos = (
        db.table("videos")
        .select("*")
        .eq("creator_id", current_user["user_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return videos.data or []


@router.get("/{video_id}")
async def get_video(video_id: str):
    db = get_db()
    result = (
        db.table("videos")
        .select("*, users(username, wallet_address)")
        .eq("id", video_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = result.data[0]
    video["ipfs_url"] = storage_service.build_ipfs_url(video["cid"])
    return video
