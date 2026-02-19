
import requests
import time
from algosdk import account, mnemonic, util
import sys
import os
import random
import string

# URL
BASE_URL = "http://localhost:8000"

def generate_username():
    return "user_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

def sign_message(private_key, message):
    # Determine how backend expects signature.
    # algorand_service.verify_signature uses util.verify_bytes
    # which expects the signature of the byte encoded message.
    # We need to sign the bytes of the message.
    
    # In Pera/standard dApps, usually we sign "MX..." if it's a specific format
    # But here backend does: util.verify_bytes(message.encode('utf-8'), signature, wallet_address)
    # So we just sign the raw bytes.
    
    signature = util.sign_bytes(message.encode('utf-8'), private_key)
    return signature

def test_signup_login():
    print("--- Testing Auth Flow ---")
    
    # 1. Generate Wallet
    private_key, address = account.generate_account()
    print(f"Generated Wallet: {address}")
    
    username = generate_username()
    print(f"Username: {username}")
    
    message = "Login to Rift" # In real app, this should be a nonce
    signature = sign_message(private_key, message)
    
    # 2. Test Login (Unregistered) -> Should Fail
    print("\n[Test 1] Login Unregistered User...")
    login_payload = {
        "wallet_address": address,
        "signature": signature,
        "message": message
    }
    
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if res.status_code == 404:
        print("SUCCESS: Login failed as expected (404 User not found).")
    else:
        print(f"FAILURE: Login unexpected response: {res.status_code} {res.text}")
        return

    # 3. Test Signup -> Should Success
    print("\n[Test 2] Signup New User...")
    signup_payload = {
        "wallet_address": address,
        "signature": signature,
        "message": message,
        "username": username
    }
    
    res = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    if res.status_code == 200:
        print("SUCCESS: Signup successful.")
        token = res.json().get("access_token")
        print(f"Token received: {token[:10]}...")
    else:
        print(f"FAILURE: Signup failed: {res.status_code} {res.text}")
        return

    # 4. Test Login (Registered) -> Should Success
    print("\n[Test 3] Login Registered User...")
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if res.status_code == 200:
        print("SUCCESS: Login successful.")
    else:
        print(f"FAILURE: Login failed: {res.status_code} {res.text}")
        
    # 5. Test Signup (Duplicate) -> Should Fail
    print("\n[Test 4] Signup Duplicate User...")
    res = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    if res.status_code == 400:
        print("SUCCESS: Duplicate signup failed as expected (400).")
    else:
        print(f"FAILURE: Duplicate signup unexpected response: {res.status_code} {res.text}")

if __name__ == "__main__":
    test_signup_login()
