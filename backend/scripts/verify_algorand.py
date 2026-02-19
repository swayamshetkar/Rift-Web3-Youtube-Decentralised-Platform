
import os
import sys
import time
from dotenv import load_dotenv
from algosdk import account, mnemonic, util
from algosdk.v2client import algod
from algosdk.transaction import AssetTransferTxn, PaymentTxn, AssetOptInTxn, wait_for_confirmation

# Add backend directory to sys.path to import services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.services import algorand_service
from app.config import settings

def main():
    print("Starting Algorand Verification...")
    
    # 1. Initialize Client
    client = algorand_service.get_algod_client()
    try:
        status = client.status()
        print(f"Connected to Algorand TestNet. Last Round: {status['last-round']}")
    except Exception as e:
        print(f"Failed to connect to Algorand: {e}")
        return

    # 2. Check Platform Wallet
    platform_mnemonic = settings.algorand_mnemonic
    if not platform_mnemonic:
        print("Error: ALGORAND_MNEMONIC not set in .env")
        return

    platform_private_key = mnemonic.to_private_key(platform_mnemonic)
    platform_address = account.address_from_private_key(platform_private_key)
    print(f"Platform Wallet: {platform_address}")

    account_info = client.account_info(platform_address)
    algo_balance = account_info.get('amount') / 1_000_000
    print(f"Platform ALGO Balance: {algo_balance} ALGO")

    if algo_balance < 1:
        print("Warning: Low ALGO balance. Might fail to fund receivers.")

    # Check Asset Balance
    asset_id = settings.asset_id
    assets = account_info.get('assets', [])
    platform_asset_balance = 0
    for asset in assets:
        if asset['asset-id'] == asset_id:
            platform_asset_balance = asset['amount']
            break
    
    print(f"Platform ADMC Balance: {platform_asset_balance} (Asset ID: {asset_id})")

    if platform_asset_balance < 100:
        print("Error: Insufficient ADMC in Platform Wallet to test.")
        return

    # 3. Setup Receiver
    receiver_private_key, receiver_address = account.generate_account()
    print(f"\nGenerated Test Receiver: {receiver_address}")

    # Fund Receiver with ALGO (for opt-in fees)
    print("Funding Receiver with 0.3 ALGO...")
    params = client.suggested_params()
    pay_txn = PaymentTxn(platform_address, params, receiver_address, 300_000) # 0.3 ALGO
    signed_pay_txn = pay_txn.sign(platform_private_key)
    try:
        txid = client.send_transaction(signed_pay_txn)
        wait_for_confirmation(client, txid, 4)
        print(f"Funded Receiver. TxID: {txid}")
    except Exception as e:
        print(f"Failed to fund receiver: {e}")
        return

    # 4. Opt-In Receiver to ADMC
    print("Receiver opting in to ADMC...")
    params = client.suggested_params()
    optin_txn = AssetOptInTxn(receiver_address, params, asset_id)
    signed_optin_txn = optin_txn.sign(receiver_private_key)
    try:
        txid = client.send_transaction(signed_optin_txn)
        wait_for_confirmation(client, txid, 4)
        print(f"Receiver Opted-in. TxID: {txid}")
    except Exception as e:
        print(f"Failed to opt-in: {e}")
        return

    # 5. Test Settlement (Transfer from Platform to Receiver)
    print("\nTesting settle_rewards (10 ADMC)...")
    try:
        # Note: settle_rewards takes amount, calculates 2% fee, sends rest.
        # If we send 10, Fee is 0.2, Receiver gets 9.8. 
        # But wait, algorand_service.py logic:
        # platform_fee = int(amount * 0.02)
        # creator_final = amount - platform_fee
        # It sends creator_final.
        
        # Let's try sending 100 raw units of ADMC (assuming 0 decimals or handling it)
        # If ADMC has decimals, we need to account for that. 
        # Verification script should just use raw integers for now as logic seems to expect int.
        
        test_amount = 100 # Raw units
        txid = algorand_service.settle_rewards(receiver_address, test_amount)
        
        if txid:
            print(f"Settlement Successful. TxID: {txid}")
        else:
            print("Settlement Failed (returned None).")
            return

    except Exception as e:
        print(f"Settlement Exception: {e}")
        return

    # 6. Verify Final Balance
    print("\nVerifying Receiver Balance...")
    receiver_info = client.account_info(receiver_address)
    receiver_assets = receiver_info.get('assets', [])
    receiver_admc = 0
    for asset in receiver_assets:
        if asset['asset-id'] == asset_id:
            receiver_admc = asset['amount']
            break
            
    print(f"Receiver ADMC Balance: {receiver_admc}")
    
    expected = 100 - int(100 * 0.02)
    if receiver_admc == expected:
        print("SUCCESS: Balance matches expected amount (Amount - 2% fee).")
    else:
        print(f"FAILURE: Balance {receiver_admc} does not match expected {expected}.")

if __name__ == "__main__":
    main()
