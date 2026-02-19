from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    id: str
    wallet_address: str
    username: str | None = None
    role: str
    subscribers_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Video(BaseModel):
    id: str
    creator_id: str
    cid: str
    title: str
    description: str | None = ""
    ads_enabled: bool
    total_views: int
    total_watch_time: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class View(BaseModel):
    id: str
    video_id: str
    viewer_wallet: str
    watch_seconds: int
    settled: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AdCampaign(BaseModel):
    id: str
    advertiser_wallet: str
    video_id: str
    budget: float
    remaining_budget: float
    reward_per_view: float
    active: bool
    ad_video_cid: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BannerCampaign(BaseModel):
    id: str
    advertiser_wallet: str
    tier: str
    fixed_price: float
    start_date: str
    end_date: str
    active: bool
    distributed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Settlement(BaseModel):
    id: str
    creator_wallet: str
    amount: float
    platform_fee: float
    tx_hash: str | None = None
    settlement_type: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
