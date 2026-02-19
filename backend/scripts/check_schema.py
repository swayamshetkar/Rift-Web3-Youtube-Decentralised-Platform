
import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.database import get_db

def main():
    print("Checking Users Table Schema...")
    db = get_db()
    
    try:
        # Try to select one item
        res = db.table("users").select("*").limit(1).execute()
        if res.data:
            print("Row 1 keys:", res.data[0].keys())
        else:
            print("Table is empty, cannot infer schema directly from rows.")
            # Try inserting a dummy with username to see if it fails?
            # Or just assume we need to add it.
    except Exception as e:
        print(f"Error selecting: {e}")

if __name__ == "__main__":
    main()
