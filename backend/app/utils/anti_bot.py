from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Deque

from ..config import settings


wallet_video_last_seen: dict[str, datetime] = {}
ip_events: defaultdict[str, Deque[datetime]] = defaultdict(deque)
fingerprint_events: defaultdict[str, Deque[datetime]] = defaultdict(deque)


def _trim_old(events: Deque[datetime], now: datetime, window: timedelta) -> None:
    while events and now - events[0] > window:
        events.popleft()


def validate_view(
    wallet: str,
    video_id: str,
    watch_seconds: int,
    ip_address: str | None = None,
    device_fingerprint: str | None = None,
) -> tuple[bool, str]:
    if watch_seconds < settings.view_min_watch_seconds:
        return False, "min_watch_time_not_met"

    now = datetime.now(timezone.utc)
    cooldown = timedelta(seconds=settings.view_wallet_cooldown_seconds)
    wallet_key = f"{wallet}:{video_id}"

    last_view = wallet_video_last_seen.get(wallet_key)
    if last_view and (now - last_view) < cooldown:
        return False, "wallet_rate_limited"
    wallet_video_last_seen[wallet_key] = now

    one_hour = timedelta(hours=1)

    if ip_address:
        ip_log = ip_events[ip_address]
        _trim_old(ip_log, now, one_hour)
        if len(ip_log) >= settings.view_ip_hourly_limit:
            return False, "ip_rate_limited"
        ip_log.append(now)

    if device_fingerprint:
        fingerprint_log = fingerprint_events[device_fingerprint]
        _trim_old(fingerprint_log, now, one_hour)
        if len(fingerprint_log) >= settings.view_fingerprint_hourly_limit:
            return False, "fingerprint_rate_limited"
        fingerprint_log.append(now)

    return True, "ok"
