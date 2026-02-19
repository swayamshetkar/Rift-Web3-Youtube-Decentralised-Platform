
import os
import sys
import random
import string
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.database import get_db

def generate_wallet():
    return "test_wallet_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))

def main():
    print("Testing Insert...")
    db = get_db()
    
    # Test 1: Minimal Insert (just wallet_address, assuming it exists)
    w1 = generate_wallet()
    print(f"1. Inserting {w1} (no username)...")
    try:
        res = db.table("users").insert({"wallet_address": w1}).execute()
        print("Success!", res.data)
    except Exception as e:
        with open("error.log", "w") as f:
            f.write(str(e))
        print(f"Failed: {e}")

    # Test 2: Insert with username
    w2 = generate_wallet()
    print(f"2. Inserting {w2} WITH username...")
    try:
        res = db.table("users").insert({"wallet_address": w2, "username": "testuser"}).execute()
        print("Success!", res.data)
    except Exception as e:
        with open("error_username.log", "w") as f:
            f.write(str(e))
        print(f"Failed: {e}")

if __name__ == "__main__":
    main()
