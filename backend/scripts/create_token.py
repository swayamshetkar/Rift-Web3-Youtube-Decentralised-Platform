import os
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import AssetConfigTxn, wait_for_confirmation
from dotenv import load_dotenv

load_dotenv()

# Configure Algorand Client (Testnet)
# You can use a free API key from AlgoNode or PureStake, or a local node
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

def create_admc_token():
    # Helper function to get the private key and address
    mnemonic_phrase = os.getenv("ALGORAND_MNEMONIC")
    if not mnemonic_phrase:
        print("Please set ALGORAND_MNEMONIC in .env")
        return

    private_key = mnemonic.to_private_key(mnemonic_phrase)
    sender_address = account.address_from_private_key(private_key)
    print(f"Sender Address: {sender_address}")

    # Initialize Algod Client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    # Asset Creation Transaction
    params = algod_client.suggested_params()
    
    txn = AssetConfigTxn(
        sender=sender_address,
        sp=params,
        total=1_000_000_000, # 1 billion tokens
        decimals=6,
        default_frozen=False,
        unit_name="ADMC",
        asset_name="AdMarket Coin",
        manager=sender_address,
        reserve=sender_address,
        freeze=sender_address,
        clawback=sender_address,
        url="https://rift.video", # Placeholder URL
    )

    # Sign transaction
    signed_txn = txn.sign(private_key)

    # Send transaction
    txid = algod_client.send_transaction(signed_txn)
    print(f"Transaction sent with ID: {txid}")

    # Wait for confirmation
    confirmed_txn = wait_for_confirmation(algod_client, txid, 4)
    print(f"Result confirmed in round: {confirmed_txn['confirmed-round']}")

    asset_id = confirmed_txn["asset-index"]
    print(f"Created Asset ID: {asset_id}")
    
    return asset_id

if __name__ == "__main__":
    create_admc_token()
