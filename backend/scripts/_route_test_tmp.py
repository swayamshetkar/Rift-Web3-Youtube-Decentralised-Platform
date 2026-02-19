import base64
import random
import string
from datetime import date, timedelta

import requests
from algosdk import account, mnemonic, util

BASE_URL = "http://localhost:8000"
REQ_TIMEOUT = 20


class SimpleResp:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text

    def json(self):
        raise ValueError("no json body")


def safe_request(method, url, **kwargs):
    if "timeout" not in kwargs:
        kwargs["timeout"] = REQ_TIMEOUT
    try:
        return requests.request(method, url, **kwargs)
    except Exception as exc:
        return SimpleResp(599, str(exc))


def parse_env(path):
    data = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("\"").strip("'")
                data[key] = val
    except FileNotFoundError:
        pass
    return data


env = parse_env("/home/chidori/Projects/rift/backend/.env")
platform_wallet = (env.get("PLATFORM_WALLET") or "").strip()
algorand_mnemonic = (env.get("ALGORAND_MNEMONIC") or "").strip()


def rand_name(prefix):
    return prefix + "_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=6))


def issue_challenge(wallet_address):
    return safe_request("POST", f"{BASE_URL}/auth/challenge", json={"wallet_address": wallet_address})


def sign_message(private_key, message):
    sig = util.sign_bytes(message.encode("utf-8"), private_key)
    if isinstance(sig, str):
        sig = sig.encode("utf-8")
    return base64.b64encode(sig).decode("utf-8")


def signup(wallet_address, private_key, username, role):
    chall = issue_challenge(wallet_address)
    if chall.status_code != 200:
        return None, chall
    try:
        message = chall.json()["message"]
    except Exception:
        return None, SimpleResp(599, "challenge missing json")
    signature = sign_message(private_key, message)
    payload = {
        "wallet_address": wallet_address,
        "signature": signature,
        "message": message,
        "username": username,
        "role": role,
    }
    res = safe_request("POST", f"{BASE_URL}/auth/signup", json=payload)
    return res, None


def login(wallet_address, private_key):
    chall = issue_challenge(wallet_address)
    if chall.status_code != 200:
        return None, chall
    try:
        message = chall.json()["message"]
    except Exception:
        return None, SimpleResp(599, "challenge missing json")
    signature = sign_message(private_key, message)
    payload = {
        "wallet_address": wallet_address,
        "signature": signature,
        "message": message,
    }
    res = safe_request("POST", f"{BASE_URL}/auth/login", json=payload)
    return res, None


def get_token_for_new_user(role):
    private_key, address = account.generate_account()
    username = rand_name(role)
    res, chall_err = signup(address, private_key, username, role)
    if chall_err is not None:
        return None, address, private_key, chall_err
    if res.status_code == 200:
        try:
            return res.json()["access_token"], address, private_key, None
        except Exception:
            return None, address, private_key, SimpleResp(599, "signup missing json")
    if res.status_code == 400 and "User already exists" in res.text:
        res2, chall_err2 = login(address, private_key)
        if chall_err2 is not None:
            return None, address, private_key, chall_err2
        if res2.status_code == 200:
            try:
                return res2.json()["access_token"], address, private_key, None
            except Exception:
                return None, address, private_key, SimpleResp(599, "login missing json")
        return None, address, private_key, res2
    return None, address, private_key, res


results = []


def record(name, res, extra=None):
    if res is None:
        results.append((name, "SKIP", extra or ""))
        return
    status = "PASS" if res.status_code < 400 else "FAIL"
    detail = f"{res.status_code}"
    if res.status_code >= 400:
        detail += f" {res.text[:300]}"
    if extra:
        detail += f" | {extra}"
    results.append((name, status, detail))


record("GET /", safe_request("GET", f"{BASE_URL}/"))

# Creator
creator_token, creator_addr, creator_pk, err = get_token_for_new_user("creator")
if not creator_token:
    if err is None:
        results.append(("creator token", "FAIL", "unknown error"))
    else:
        results.append(("creator token", "FAIL", f"{err.status_code} {err.text[:300]}"))
else:
    headers_creator = {"Authorization": f"Bearer {creator_token}"}
    record("GET /auth/me", safe_request("GET", f"{BASE_URL}/auth/me", headers=headers_creator))

    files = {"file": ("test_video.mp4", b"dummy_video_content_bytes", "video/mp4")}
    data = {"title": f"Test Video {rand_name('v')}", "description": "Automated test"}
    res_upload = safe_request("POST", f"{BASE_URL}/videos/upload", headers=headers_creator, files=files, data=data)
    record("POST /videos/upload", res_upload)
    video_id = None
    if res_upload.status_code == 200:
        try:
            video_id = res_upload.json().get("video_id")
        except Exception:
            video_id = None

    record("GET /videos/list", safe_request("GET", f"{BASE_URL}/videos/list"))
    record("GET /videos/me", safe_request("GET", f"{BASE_URL}/videos/me", headers=headers_creator))
    if video_id:
        record("GET /videos/{id}", safe_request("GET", f"{BASE_URL}/videos/{video_id}"))

    if video_id:
        res_view = safe_request(
            "POST",
            f"{BASE_URL}/views/track",
            headers=headers_creator,
            json={"video_id": video_id, "watch_seconds": 30},
        )
        record("POST /views/track", res_view)

    record("GET /wallets/balance", safe_request("GET", f"{BASE_URL}/wallets/balance", headers=headers_creator))

# Advertiser
advertiser_token, advertiser_addr, advertiser_pk, err = get_token_for_new_user("advertiser")
if not advertiser_token:
    if err is None:
        results.append(("advertiser token", "FAIL", "unknown error"))
    else:
        results.append(("advertiser token", "FAIL", f"{err.status_code} {err.text[:300]}"))
else:
    headers_ad = {"Authorization": f"Bearer {advertiser_token}"}
    record("GET /auth/me (advertiser)", safe_request("GET", f"{BASE_URL}/auth/me", headers=headers_ad))
    if 'video_id' in locals() and video_id:
        res_campaign = safe_request(
            "POST",
            f"{BASE_URL}/ads/create",
            headers=headers_ad,
            data={"video_id": video_id, "budget": "100", "reward_per_view": "1"},
        )
        record("POST /ads/create", res_campaign)

    record("GET /ads/active", safe_request("GET", f"{BASE_URL}/ads/active"))
    record("GET /ads/me", safe_request("GET", f"{BASE_URL}/ads/me", headers=headers_ad))
    record("GET /ads/summary", safe_request("GET", f"{BASE_URL}/ads/summary", headers=headers_ad))

    start = date.today().isoformat()
    end = (date.today() + timedelta(days=1)).isoformat()
    res_banner = safe_request(
        "POST",
        f"{BASE_URL}/ads/banner/create",
        headers=headers_ad,
        data={"tier": "1m", "fixed_price": "25", "start_date": start, "end_date": end},
    )
    record("POST /ads/banner/create", res_banner)
    record("GET /ads/banner/active", safe_request("GET", f"{BASE_URL}/ads/banner/active"))
    record("GET /ads/banner/me", safe_request("GET", f"{BASE_URL}/ads/banner/me", headers=headers_ad))

# Settlement (public)
record("GET /settlement/", safe_request("GET", f"{BASE_URL}/settlement/"))
record("GET /settlement/summary", safe_request("GET", f"{BASE_URL}/settlement/summary"))

# Platform-only
platform_token = None
platform_pk = None
platform_addr = None
if platform_wallet and algorand_mnemonic:
    try:
        platform_pk = mnemonic.to_private_key(algorand_mnemonic)
        platform_addr = account.address_from_private_key(platform_pk)
        if platform_addr == platform_wallet:
            res, err = signup(platform_addr, platform_pk, rand_name("platform"), "viewer")
            if err is None and res.status_code == 200:
                platform_token = res.json()["access_token"]
            else:
                res2, err2 = login(platform_addr, platform_pk)
                if err2 is None and res2.status_code == 200:
                    platform_token = res2.json()["access_token"]
        else:
            results.append(("platform auth", "SKIP", "PLATFORM_WALLET does not match ALGORAND_MNEMONIC address"))
    except Exception as exc:
        results.append(("platform auth", "SKIP", f"error: {exc}"))
else:
    results.append(("platform auth", "SKIP", "PLATFORM_WALLET or ALGORAND_MNEMONIC not set"))

if platform_token:
    headers_platform = {"Authorization": f"Bearer {platform_token}"}
    record("GET /wallets/platform-balance", safe_request("GET", f"{BASE_URL}/wallets/platform-balance", headers=headers_platform))
    record("POST /settlement/trigger", safe_request("POST", f"{BASE_URL}/settlement/trigger", headers=headers_platform))
    record("POST /settlement/trigger-banner", safe_request("POST", f"{BASE_URL}/settlement/trigger-banner", headers=headers_platform))
else:
    record("GET /wallets/platform-balance", None, "no platform token")
    record("POST /settlement/trigger", None, "no platform token")
    record("POST /settlement/trigger-banner", None, "no platform token")

print("\n=== Route Test Summary ===")
for name, status, detail in results:
    print(f"{status:<5} {name} -> {detail}")
