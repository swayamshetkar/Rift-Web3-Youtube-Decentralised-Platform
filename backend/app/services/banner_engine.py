from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_DOWN

from ..database import get_db
from . import algorand_service


def _to_decimal(value: object) -> Decimal:
    return Decimal(str(value or 0))


def _token_quantizer() -> Decimal:
    return Decimal("0.000001")


def _eligible_banner_campaigns(campaigns: list[dict]) -> list[dict]:
    today = date.today()
    eligible: list[dict] = []
    for campaign in campaigns:
        if campaign.get("distributed"):
            continue
        end_date_raw = campaign.get("end_date")
        if not end_date_raw:
            eligible.append(campaign)
            continue
        try:
            end_date = date.fromisoformat(str(end_date_raw))
        except ValueError:
            eligible.append(campaign)
            continue
        if end_date <= today:
            eligible.append(campaign)
    return eligible


def distribute_banner_rewards() -> dict[str, int | float]:
    db = get_db()
    campaigns = db.table("banner_campaigns").select("*").eq("active", True).execute().data or []
    eligible_campaigns = _eligible_banner_campaigns(campaigns)
    if not eligible_campaigns:
        return {
            "campaigns_distributed": 0,
            "creators_paid": 0,
            "creator_pool": 0.0,
            "platform_share": 0.0,
        }

    total_revenue = sum(_to_decimal(campaign.get("fixed_price")) for campaign in eligible_campaigns)
    if total_revenue <= 0:
        return {
            "campaigns_distributed": 0,
            "creators_paid": 0,
            "creator_pool": 0.0,
            "platform_share": 0.0,
        }

    platform_share = (total_revenue * Decimal("0.30")).quantize(_token_quantizer(), rounding=ROUND_DOWN)
    creator_pool = (total_revenue * Decimal("0.70")).quantize(_token_quantizer(), rounding=ROUND_DOWN)
    if creator_pool <= 0:
        return {
            "campaigns_distributed": 0,
            "creators_paid": 0,
            "creator_pool": float(creator_pool),
            "platform_share": float(platform_share),
        }

    creators = db.table("users").select("id, wallet_address, subscribers_count").eq("role", "creator").execute().data or []
    eligible_creators = [creator for creator in creators if int(creator.get("subscribers_count") or 0) > 0]
    total_subscribers = sum(int(creator["subscribers_count"]) for creator in eligible_creators)
    if total_subscribers <= 0:
        return {
            "campaigns_distributed": 0,
            "creators_paid": 0,
            "creator_pool": float(creator_pool),
            "platform_share": float(platform_share),
        }

    creators_paid = 0
    for creator in eligible_creators:
        subscribers_count = int(creator["subscribers_count"])
        ratio = Decimal(subscribers_count) / Decimal(total_subscribers)
        creator_reward = (creator_pool * ratio).quantize(_token_quantizer(), rounding=ROUND_DOWN)
        if creator_reward <= 0:
            continue

        transfer = algorand_service.transfer_tokens(creator["wallet_address"], creator_reward)
        db.table("settlements").insert(
            {
                "creator_wallet": creator["wallet_address"],
                "amount": float(transfer["amount"]),
                "platform_fee": 0.0,
                "tx_hash": transfer["tx_hash"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "settlement_type": "banner",
            }
        ).execute()
        creators_paid += 1

    campaign_ids = [campaign["id"] for campaign in eligible_campaigns]
    db.table("banner_campaigns").update({"distributed": True, "active": False}).in_("id", campaign_ids).execute()

    return {
        "campaigns_distributed": len(eligible_campaigns),
        "creators_paid": creators_paid,
        "creator_pool": float(creator_pool),
        "platform_share": float(platform_share),
    }
