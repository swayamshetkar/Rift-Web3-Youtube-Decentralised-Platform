from __future__ import annotations

from decimal import Decimal
from typing import Any

from . import algorand_service


def settle_rewards(creator_wallet: str, amount_tokens: Decimal | float | int | str) -> dict[str, Any]:
    return algorand_service.settle_reward(creator_wallet, amount_tokens)
