from __future__ import annotations

import base64
from decimal import Decimal, ROUND_DOWN
from typing import Any

from algosdk import account, mnemonic, util
from algosdk.transaction import AssetTransferTxn, wait_for_confirmation
from algosdk.v2client import algod
from algosdk import transaction

from ..config import settings


def get_algod_client() -> algod.AlgodClient:
    return algod.AlgodClient(settings.algod_token, settings.algod_address)


def _token_scale() -> Decimal:
    return Decimal(10) ** settings.token_decimals


def _token_quantizer() -> Decimal:
    if settings.token_decimals <= 0:
        return Decimal("1")
    return Decimal(f"1.{'0' * settings.token_decimals}")


def to_base_units(amount_tokens: Decimal | float | int | str) -> int:
    amount = Decimal(str(amount_tokens))
    if amount <= 0:
        return 0
    scaled = (amount * _token_scale()).quantize(Decimal("1"), rounding=ROUND_DOWN)
    return int(scaled)


def from_base_units(amount_base_units: int) -> Decimal:
    if amount_base_units <= 0:
        return Decimal("0").quantize(_token_quantizer())
    return (Decimal(amount_base_units) / _token_scale()).quantize(_token_quantizer())


def get_asset_balance(wallet_address: str) -> Decimal:
    wallet = (wallet_address or "").strip()
    if not wallet:
        return Decimal("0").quantize(_token_quantizer())
    if settings.asset_id <= 0:
        return Decimal("0").quantize(_token_quantizer())

    client = get_algod_client()
    info = client.account_info(wallet)
    holdings = info.get("assets") or []
    for holding in holdings:
        if int(holding.get("asset-id", 0)) == int(settings.asset_id):
            amount = int(holding.get("amount", 0))
            return from_base_units(amount)
    return Decimal("0").quantize(_token_quantizer())


def _decode_signature(signature: str) -> bytes:
    try:
        return base64.b64decode(signature)
    except Exception:
        try:
            return bytes.fromhex(signature)
        except Exception:
            return signature.encode("utf-8")


def verify_signature(wallet_address: str, message: str, signature: str) -> bool:
    if not wallet_address or not message or not signature:
        return False

    try:
        signature_bytes = _decode_signature(signature)
        return util.verify_bytes(message.encode("utf-8"), signature_bytes, wallet_address)
    except Exception:
        return False


def _get_signer() -> tuple[str, str]:
    if not settings.algorand_mnemonic:
        raise RuntimeError("ALGORAND_MNEMONIC is not configured.")

    private_key = mnemonic.to_private_key(settings.algorand_mnemonic)
    sender_address = account.address_from_private_key(private_key)
    return private_key, sender_address


def _send_asset_transfer(receiver_wallet: str, amount_base_units: int, note: str | None = None) -> str:
    if settings.asset_id <= 0:
        raise RuntimeError("ASSET_ID is not configured.")
    if amount_base_units <= 0:
        raise RuntimeError("Transfer amount must be > 0.")

    client = get_algod_client()
    private_key, sender_address = _get_signer()
    params = client.suggested_params()

    txn = AssetTransferTxn(
        sender=sender_address,
        sp=params,
        receiver=receiver_wallet,
        amt=amount_base_units,
        index=settings.asset_id,
        note=note.encode("utf-8") if note else None,
    )
    signed_txn = txn.sign(private_key)
    txid = client.send_transaction(signed_txn)
    wait_for_confirmation(client, txid, 4)
    return txid


def _call_settle_contract(creator_wallet: str, gross_amount_base_units: int) -> str:
    if settings.app_id <= 0:
        raise RuntimeError("APP_ID is not configured.")
    if settings.asset_id <= 0:
        raise RuntimeError("ASSET_ID is not configured.")

    client = get_algod_client()
    private_key, sender_address = _get_signer()
    params = client.suggested_params()

    txn = transaction.ApplicationNoOpTxn(
        sender=sender_address,
        sp=params,
        index=settings.app_id,
        app_args=[b"settle_reward", gross_amount_base_units.to_bytes(8, "big")],
        accounts=[creator_wallet],
        foreign_assets=[settings.asset_id],
    )
    signed_txn = txn.sign(private_key)
    txid = client.send_transaction(signed_txn)
    wait_for_confirmation(client, txid, 4)
    return txid


def _call_withdraw_contract(advertiser_wallet: str, amount_base_units: int) -> str:
    if settings.app_id <= 0:
        raise RuntimeError("APP_ID is not configured.")
    if settings.asset_id <= 0:
        raise RuntimeError("ASSET_ID is not configured.")

    client = get_algod_client()
    private_key, sender_address = _get_signer()
    params = client.suggested_params()

    txn = transaction.ApplicationNoOpTxn(
        sender=sender_address,
        sp=params,
        index=settings.app_id,
        app_args=[b"withdraw_unused", amount_base_units.to_bytes(8, "big")],
        accounts=[advertiser_wallet],
        foreign_assets=[settings.asset_id],
    )
    signed_txn = txn.sign(private_key)
    txid = client.send_transaction(signed_txn)
    wait_for_confirmation(client, txid, 4)
    return txid


def settle_reward(creator_wallet: str, gross_amount_tokens: Decimal | float | int | str) -> dict[str, Any]:
    gross_base_units = to_base_units(gross_amount_tokens)
    if gross_base_units <= 0:
        raise RuntimeError("Settlement amount too small.")

    fee_base_units = (gross_base_units * settings.settlement_fee_bps) // 10000
    creator_base_units = gross_base_units - fee_base_units
    if creator_base_units <= 0:
        raise RuntimeError("Settlement amount too small after fee.")

    if settings.use_contract_settlement and settings.app_id > 0:
        tx_hash = _call_settle_contract(creator_wallet, gross_base_units)
    else:
        # Fallback path: transfer creator share from platform wallet.
        # Fee remains in platform-controlled wallet balance.
        tx_hash = _send_asset_transfer(
            creator_wallet,
            creator_base_units,
            note="rift:video-settlement",
        )

    return {
        "tx_hash": tx_hash,
        "gross_amount": from_base_units(gross_base_units),
        "platform_fee": from_base_units(fee_base_units),
        "creator_amount": from_base_units(creator_base_units),
    }


def transfer_tokens(receiver_wallet: str, amount_tokens: Decimal | float | int | str) -> dict[str, Any]:
    amount_base_units = to_base_units(amount_tokens)
    if amount_base_units <= 0:
        raise RuntimeError("Transfer amount too small.")

    tx_hash = _send_asset_transfer(
        receiver_wallet,
        amount_base_units,
        note="rift:banner-distribution",
    )
    return {
        "tx_hash": tx_hash,
        "amount": from_base_units(amount_base_units),
    }


def withdraw_unused(advertiser_wallet: str, amount_tokens: Decimal | float | int | str) -> str:
    amount_base_units = to_base_units(amount_tokens)
    if amount_base_units <= 0:
        raise RuntimeError("Withdrawal amount too small.")

    if settings.use_contract_settlement and settings.app_id > 0:
        return _call_withdraw_contract(advertiser_wallet, amount_base_units)

    return _send_asset_transfer(
        advertiser_wallet,
        amount_base_units,
        note="rift:withdraw-unused",
    )
