from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN

from apscheduler.schedulers.background import BackgroundScheduler

from ..config import settings
from ..database import get_db
from . import algorand_service, banner_engine


_scheduler: BackgroundScheduler | None = None


def _to_decimal(value: object) -> Decimal:
    return Decimal(str(value or 0))


def calculate_and_settle() -> dict[str, int]:
    db = get_db()
    campaigns = (
        db.table("ad_campaigns")
        .select("*")
        .eq("active", True)
        .gt("remaining_budget", 0)
        .execute()
        .data
        or []
    )

    report = {
        "campaigns_processed": len(campaigns),
        "campaigns_settled": 0,
        "views_settled": 0,
        "settlements_created": 0,
    }

    for campaign in campaigns:
        try:
            campaign_id = campaign["id"]
            video_id = campaign["video_id"]
            reward_per_view = _to_decimal(campaign.get("reward_per_view"))
            remaining_budget = _to_decimal(campaign.get("remaining_budget"))

            if reward_per_view <= 0 or remaining_budget <= 0:
                db.table("ad_campaigns").update({"active": False}).eq("id", campaign_id).execute()
                continue

            views = (
                db.table("views")
                .select("id")
                .eq("video_id", video_id)
                .eq("settled", False)
                .gte("watch_seconds", settings.view_min_watch_seconds)
                .order("timestamp", desc=False)
                .execute()
                .data
                or []
            )
            if not views:
                continue

            max_affordable_views = int((remaining_budget / reward_per_view).to_integral_value(rounding=ROUND_DOWN))
            if max_affordable_views <= 0:
                db.table("ad_campaigns").update({"active": False, "remaining_budget": 0}).eq("id", campaign_id).execute()
                continue

            payable_views = views[:max_affordable_views]
            payable_view_count = len(payable_views)
            if payable_view_count <= 0:
                continue

            creator_earnings = reward_per_view * Decimal(payable_view_count)
            new_remaining_budget = remaining_budget - creator_earnings
            if new_remaining_budget < 0:
                new_remaining_budget = Decimal("0")

            video_res = db.table("videos").select("creator_id").eq("id", video_id).limit(1).execute()
            if not video_res.data:
                continue
            creator_id = video_res.data[0]["creator_id"]

            creator_res = db.table("users").select("wallet_address").eq("id", creator_id).limit(1).execute()
            if not creator_res.data:
                continue
            creator_wallet = creator_res.data[0]["wallet_address"]

            settlement = algorand_service.settle_reward(creator_wallet, creator_earnings)
            tx_hash = settlement["tx_hash"]

            view_ids = [row["id"] for row in payable_views]
            db.table("views").update({"settled": True}).in_("id", view_ids).execute()

            db.table("settlements").insert(
                {
                    "creator_wallet": creator_wallet,
                    "amount": float(settlement["creator_amount"]),
                    "platform_fee": float(settlement["platform_fee"]),
                    "tx_hash": tx_hash,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "settlement_type": "video_ad",
                    "campaign_id": campaign_id,
                }
            ).execute()

            db.table("ad_campaigns").update(
                {
                    "remaining_budget": float(new_remaining_budget),
                    "active": bool(new_remaining_budget > 0),
                }
            ).eq("id", campaign_id).execute()

            report["campaigns_settled"] += 1
            report["views_settled"] += payable_view_count
            report["settlements_created"] += 1
        except Exception:
            continue

    return report


def start() -> None:
    global _scheduler
    if not settings.scheduler_enabled:
        return
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(calculate_and_settle, "interval", minutes=max(1, settings.reward_interval_minutes))
    _scheduler.add_job(banner_engine.distribute_banner_rewards, "cron", day=1, hour=0, minute=5)
    _scheduler.start()
