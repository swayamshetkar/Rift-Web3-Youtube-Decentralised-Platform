
import os
import sys
from dotenv import load_dotenv
from algosdk import account, mnemonic
from algosdk.v2client import algod

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.config import settings

def main():
    print("--- Platform Wallet Info ---")
    
    # Client
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    client = algod.AlgodClient(algod_token, algod_address)
    
    mnemonic_phrase = settings.algorand_mnemonic
    if not mnemonic_phrase:
        print("ERROR: ALGORAND_MNEMONIC is empty in .env")
        return

    try:
        private_key = mnemonic.to_private_key(mnemonic_phrase)
        address = account.address_from_private_key(private_key)
        print(f"Address: {address}")
        
        info = client.account_info(address)
        algo_balance = info.get('amount') / 1_000_000
        print(f"ALGO Balance: {algo_balance} ALGO")
        
        asset_id = settings.asset_id
        print(f"Target Asset ID: {asset_id}")
        
        assets = info.get('assets', [])
        admc_balance = 0
        found = False
        for asset in assets:
            if asset['asset-id'] == asset_id:
                admc_balance = asset['amount']
                found = True
                break
        
        if found:
            print(f"ADMC Balance: {admc_balance}")
        else:
            print(f"ADMC Balance: 0 (Not opted in or 0 balance)")
            
    except Exception as e:
        print(f"Error retrieving info: {e}")

if __name__ == "__main__":
    main()
