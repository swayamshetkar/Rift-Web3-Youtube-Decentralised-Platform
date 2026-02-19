
import requests
import os
import sys
import random
import string
import time
from algosdk import account, util

# Configuration
BASE_URL = "http://localhost:8000"

def generate_username():
    return "tester_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))

def sign_message(private_key, message):
    return util.sign_bytes(message.encode('utf-8'), private_key)

def print_step(step_name):
    print(f"\n{'='*20}\n{step_name}\n{'='*20}")

def test_api():
    print("Starting Comprehensive API Test...")
    
    # --- 1. Authenticaton ---
    print_step("1. Authentication")
    
    # Generate User
    private_key, address = account.generate_account()
    username = generate_username()
    print(f"User: {username} ({address})")
    
    # Signup
    message = "Sign up for Rift"
    signature = sign_message(private_key, message)
    
    signup_payload = {
        "wallet_address": address,
        "signature": signature,
        "message": message,
        "username": username
    }
    
    print("-> Signing Up...")
    res = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    if res.status_code != 200:
        print(f"FAILED: Signup {res.status_code} {res.text}")
        return
    token = res.json()["access_token"]
    print("SUCCESS: Signed Up. Token received.")
    
    headers = {"Authorization": f"Bearer {token}"}

    # --- 2. Video Upload ---
    print_step("2. Video Upload")
    
    # Create dummy video content
    files = {
        'file': ('test_video.mp4', b'dummy_video_content_bytes', 'video/mp4')
    }
    data = {
        'title': 'Test Video ' + username,
        'description': 'This is an automated test video.'
    }
    
    print("-> Uploading Video...")
    res = requests.post(f"{BASE_URL}/videos/upload", headers=headers, files=files, data=data)
    
    if res.status_code != 200:
        print(f"FAILED: Upload {res.status_code} {res.text}")
        return
        
    video_id = res.json()["video_id"]
    cid = res.json()["cid"]
    print(f"SUCCESS: Video Uploaded. ID: {video_id}, CID: {cid}")
    
    # --- 3. List Videos ---
    print_step("3. List Videos")
    res = requests.get(f"{BASE_URL}/videos/list")
    if res.status_code != 200:
        print(f"FAILED: List Videos {res.status_code} {res.text}")
        return
    videos = res.json()
    print(f"SUCCESS: Retrieved {len(videos)} videos.")
    
    # --- 4. Track View ---
    print_step("4. Track View")
    
    # View the video we just uploaded
    view_payload = {
        "video_id": video_id,
        "watch_seconds": 30
    }
    
    print(f"-> Tracking view for video {video_id}...")
    res = requests.post(f"{BASE_URL}/views/track", headers=headers, json=view_payload)
    
    if res.status_code != 200:
        print(f"FAILED: Track View {res.status_code} {res.text}")
    else:
        print(f"SUCCESS: View recorded. Status: {res.json()}")

    # --- 5. Create Ad Campaign ---
    print_step("5. Create Ad Campaign")
    
    campaign_payload = {
        "video_id": video_id,
        "budget": 100.0,
        "reward_per_view": 1.0 # 1 ADMC per view
    }
    
    print("-> Creating Campaign...")
    res = requests.post(f"{BASE_URL}/ads/create", headers=headers, json=campaign_payload)
    
    if res.status_code != 200:
        print(f"FAILED: Create Campaign {res.status_code} {res.text}")
    else:
        campaign_id = res.json()["campaign_id"]
        print(f"SUCCESS: Campaign Created. ID: {campaign_id}")
        
    # --- 6. Trigger Settlement ---
    print_step("6. Trigger Settlement")
    
    print("-> Triggering Settlement Engine...")
    res = requests.post(f"{BASE_URL}/settlement/trigger")
    
    if res.status_code != 200:
        print(f"FAILED: Trigger Settlement {res.status_code} {res.text}")
    else:
        print(f"SUCCESS: Settlement Triggered. Response: {res.json()}")

    # --- 7. Check Settlement History ---
    print_step("7. Settlement History")
    res = requests.get(f"{BASE_URL}/settlement/")
    if res.status_code != 200:
        print(f"FAILED: Get Settlements {res.status_code} {res.text}")
    else:
        print(f"SUCCESS: Retrieved latest settlements. Count: {len(res.json())}")

    print("\nAPI Test Complete.")

if __name__ == "__main__":
    test_api()
