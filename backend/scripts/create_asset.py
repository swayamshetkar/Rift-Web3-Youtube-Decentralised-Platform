
import os
import sys
from dotenv import load_dotenv
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import AssetConfigTxn, wait_for_confirmation

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env BEFORE importing settings
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.config import settings

def main():
    print("--- Creating ADMC Asset ---")
    
    # Client
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    client = algod.AlgodClient(algod_token, algod_address)
    
    mnemonic_phrase = settings.algorand_mnemonic
    if not mnemonic_phrase:
        print("ERROR: ALGORAND_MNEMONIC is empty in .env")
        return

    private_key = mnemonic.to_private_key(mnemonic_phrase)
    address = account.address_from_private_key(private_key)
    print(f"Creator Address: {address}")

    # Asset Details
    # ADMC: "Ad Me Coin" or similar? The prompt mentioned "ADMC".
    # Let's call it "Rift Ad Token" (ADMC)
    # Total Supply: 1,000,000,000
    # Decimals: 0 for simplicity in this MVP, or 6?
    # Script assumes int amounts, so 0 decimals is easier for verification logic unless specified.
    # Let's use 0 decimals.
    
    params = client.suggested_params()
    
    txn = AssetConfigTxn(
        sender=address,
        sp=params,
        total=1_000_000_000,
        default_frozen=False,
        unit_name="ADMC",
        asset_name="Rift Ad Token",
        manager=address,
        reserve=address,
        freeze=address,
        clawback=address,
        url="https://rift-platform.com", 
        decimals=0
    )
    
    signed_txn = txn.sign(private_key)
    try:
        txid = client.send_transaction(signed_txn)
        print(f"Transaction Sent: {txid}")
        
        wait_for_confirmation(client, txid, 4)
        
        try:
            ptx = client.pending_transaction_info(txid)
            asset_id = ptx["asset-index"]
            print(f"Asset Created! Asset ID: {asset_id}")
            print(f"PLEASE UPDATE .env WITH: ASSET_ID={asset_id}")
        except Exception as e:
            print(f"Error getting asset ID: {e}")
            
    except Exception as e:
        print(f"Failed to create asset: {e}")

if __name__ == "__main__":
    main()
