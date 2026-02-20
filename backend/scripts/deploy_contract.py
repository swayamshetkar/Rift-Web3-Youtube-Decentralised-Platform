"""
Deploy the Rift settlement smart contract to Algorand testnet.

Usage:
    python scripts/deploy_contract.py

Requires ALGORAND_MNEMONIC in .env (or as environment variable).
Outputs the APP_ID to add to .env.
"""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema, wait_for_confirmation
from pyteal import compileTeal, Mode

from contracts.smart_contract import approval_program, clear_state_program


ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""


def main():
    print("=== Rift Smart Contract Deployment ===\n")

    mnemonic_phrase = os.getenv("ALGORAND_MNEMONIC", "")
    if not mnemonic_phrase:
        print("ERROR: ALGORAND_MNEMONIC not set. Please set it in .env or as an env var.")
        sys.exit(1)

    private_key = mnemonic.to_private_key(mnemonic_phrase)
    sender = account.address_from_private_key(private_key)
    print(f"Deployer address: {sender}")

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    # Check account balance
    info = client.account_info(sender)
    balance_algo = info.get("amount", 0) / 1_000_000
    print(f"Account balance : {balance_algo:.6f} ALGO")
    if balance_algo < 0.5:
        print("WARNING: Low balance. You need at least ~0.5 ALGO to deploy. Fund via https://bank.testnet.algorand.network/")

    # --- Compile PyTeal to TEAL ---
    print("\nCompiling PyTeal -> TEAL ...")
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=6)
    clear_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=6)
    print(f"  Approval program : {len(approval_teal)} bytes")
    print(f"  Clear program    : {len(clear_teal)} bytes")

    # --- Compile TEAL to bytecode ---
    print("Compiling TEAL -> bytecode ...")
    approval_compiled = client.compile(approval_teal)["result"]
    clear_compiled = client.compile(clear_teal)["result"]

    import base64
    approval_bytes = base64.b64decode(approval_compiled)
    clear_bytes = base64.b64decode(clear_compiled)

    # --- Build the ApplicationCreateTxn ---
    params = client.suggested_params()

    # Global schema: 3 keys (admin, token_id, platform_wallet)
    # Local schema : 0 (no per-user state)
    global_schema = StateSchema(num_uints=1, num_byte_slices=2)  # token_id (uint), admin + platform_wallet (bytes)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)

    # Optionally pass the ASSET_ID as first arg if available
    asset_id_str = os.getenv("ASSET_ID", "0")
    asset_id = int(asset_id_str) if asset_id_str else 0

    app_args = []
    if asset_id > 0:
        app_args.append(asset_id.to_bytes(8, "big"))
        print(f"\nPassing ASSET_ID={asset_id} to contract on creation.")

    txn = ApplicationCreateTxn(
        sender=sender,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=app_args if app_args else None,
    )

    # --- Sign & send ---
    print("\nSending deployment transaction ...")
    signed_txn = txn.sign(private_key)
    txid = client.send_transaction(signed_txn)
    print(f"Transaction ID: {txid}")

    # --- Wait for confirmation ---
    print("Waiting for confirmation ...")
    confirmed = wait_for_confirmation(client, txid, 4)
    confirmed_round = confirmed.get("confirmed-round", "?")
    print(f"Confirmed in round: {confirmed_round}")

    # --- Extract APP_ID ---
    app_id = confirmed.get("application-index")
    if app_id:
        print(f"\n{'='*50}")
        print(f"  SUCCESS! Application ID (APP_ID) = {app_id}")
        print(f"{'='*50}")
        print(f"\nAdd this to your .env file:")
        print(f"  APP_ID={app_id}")
        print(f"  USE_CONTRACT_SETTLEMENT=true")
    else:
        print("\nWARNING: Could not extract application-index from confirmed transaction.")
        print(f"Full response: {confirmed}")


if __name__ == "__main__":
    main()
