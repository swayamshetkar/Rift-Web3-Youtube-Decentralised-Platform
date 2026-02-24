<div align="center">

#  RIFT — Web3 Video Ad Platform

**Decentralized Ad-Based Video Platform on Algorand**

[![Algorand](https://img.shields.io/badge/Algorand-Testnet-black?logo=algorand&logoColor=white)](https://algorand.com)
[![Pera Wallet](https://img.shields.io/badge/Pera_Wallet-Connect-FFEE55?logo=algorand)](https://perawallet.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![IPFS](https://img.shields.io/badge/Pinata-IPFS-65C2CB?logo=ipfs&logoColor=white)](https://pinata.cloud)
[![Hugging Face](https://img.shields.io/badge/HuggingFace-Spaces-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co)

*Creators upload. Viewers watch. Advertisers fund. Everyone earns — transparently on-chain.*

</div>

---

## 📐 System Architecture

```
                  ┌─────────────────────────────┐
                  │     Frontend (React + Vite)  │
                  │       Vercel Deployment      │
                  └──────────────┬──────────────┘
                                 │
                         Pera Wallet Connect
                                 │
                                 ▼
                  ┌─────────────────────────────┐
                  │  FastAPI Backend (HF Space)  │
                  │  ┌────────────────────────┐  │
                  │  │ JWT Auth               │  │
                  │  │ Signature Verification │  │
                  │  │ View Tracking          │  │
                  │  │ Reward Aggregation     │  │
                  │  └────────────────────────┘  │
                  └──────────────┬──────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                 ▼
        Algorand Network    Pinata IPFS     PostgreSQL DB
       (Reward Ledger)      (Video Files)   (Metadata + Views)
```

---

##  Authentication Flow

Wallet-based authentication using **Algorand signature verification** — no passwords, no emails.

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Browser │         │  Pera Wallet │         │   Backend    │
└────┬─────┘         └──────┬───────┘         └──────┬───────┘
     │  1. Connect Wallet   │                        │
     │─────────────────────►│                        │
     │  2. Wallet Address   │                        │
     │◄─────────────────────│                        │
     │                      │                        │
     │  3. POST /auth/challenge ────────────────────►│
     │  4. Challenge Message ◄───────────────────────│
     │                      │                        │
     │  5. Sign Message ───►│                        │
     │  6. Signature ◄──────│                        │
     │                      │                        │
     │  7. POST /auth/signup or /auth/login ────────►│
     │  8. Verify Signature + Issue JWT ◄────────────│
     └──────────────────────┴────────────────────────┘
```

| Step | Action | Description |
|------|--------|-------------|
| 1 | Connect Wallet | User connects Pera Wallet in the browser |
| 2 | Get Address | Frontend receives the wallet address |
| 3 | Request Challenge | `POST /auth/challenge` with `wallet_address` |
| 4 | Receive Message | Backend returns a unique signable message |
| 5–6 | Sign Message | Pera Wallet signs the challenge message |
| 7 | Authenticate | `POST /auth/signup` (new user) or `/auth/login` (existing) |
| 8 | JWT Issued | Backend verifies the Algorand signature and returns a JWT |

---

## 🖥 Frontend Integration

### Install Dependencies

```bash
npm install @perawallet/connect algosdk axios
```

### Connect Pera Wallet

```javascript
import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();

export async function connectWallet() {
  const accounts = await peraWallet.connect();
  return accounts[0]; // primary wallet address
}
```

### Request Challenge

```javascript
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getChallenge(wallet) {
  const res = await axios.post(`${BASE_URL}/auth/challenge`, {
    wallet_address: wallet,
  });
  return res.data.message;
}
```

### Sign Challenge

```javascript
export async function signMessage(message, wallet) {
  const encoded = new TextEncoder().encode(message);

  const signed = await peraWallet.signData([
    { data: encoded, signers: [wallet] },
  ]);

  return signed[0];
}
```

### Login / Signup

```javascript
export async function login(wallet, signature, message) {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    wallet_address: wallet,
    signature,
    message,
  });

  localStorage.setItem("token", res.data.access_token);
}
```

---

## 🎥 Video Upload Flow (Pinata IPFS)

```
Frontend  ──►  Backend  ──►  Pinata  ──►  IPFS CID  ──►  Store in DB
```

### Backend (Pinata Upload)

```python
import requests

PINATA_API_KEY = "..."
PINATA_SECRET = "..."

def upload_to_pinata(file):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET,
    }
    response = requests.post(url, files={"file": file}, headers=headers)
    return response.json()["IpfsHash"]
```

### Video Playback URL

```
https://gateway.pinata.cloud/ipfs/<CID>
```

---

##  Reward System

### Economic Actors

| Role | Earns From | Pays |
|------|-----------|------|
|  **Creator** | Views + Ad Revenue | — |
|  **Viewer** | Future token rewards (optional) | — |
|  **Advertiser** | — | Campaign budget |
|  **Platform** | 5% fee on settlements | — |

### Reward Calculation

```python
creator_reward = valid_views * reward_per_view
platform_fee   = creator_reward * 0.05
net_creator    = creator_reward - platform_fee
```

### Settlement Flow

```
  Views Tracked          Aggregate           Build Algorand Txn
  ─────────────►  DB  ──────────────►  Engine  ──────────────────►  Blockchain
                                                    │
                                              Sign from backend
                                              wallet & broadcast
```

1. Views are tracked and stored in the database
2. Settlement engine aggregates views periodically
3. Algorand payment transaction is built
4. Transaction is signed by the backend wallet
5. Transaction is sent to the Algorand network
6. Creator can withdraw earned tokens

---

## ⛓ Algorand Integration

### Send Reward (Backend)

```python
from algosdk.v2client import algod
from algosdk import account, transaction

algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")

def send_reward(private_key, receiver, amount):
    params = algod_client.suggested_params()
    txn = transaction.PaymentTxn(
        sender=account.address_from_private_key(private_key),
        sp=params,
        receiver=receiver,
        amt=amount,
    )
    signed_txn = txn.sign(private_key)
    algod_client.send_transaction(signed_txn)
```

---

##  Project Structure

```
rift-platform/
│
├── frontend/                    # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   │   ├── LandingPage.tsx
│   │   │   │   ├── VideoFeed.tsx
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── UploadVideo.tsx
│   │   │   │   ├── MyVideos.tsx
│   │   │   │   ├── CreateCampaign.tsx
│   │   │   │   ├── Settlements.tsx
│   │   │   │   ├── BannerRevenue.tsx
│   │   │   │   └── Analytics.tsx
│   │   │   ├── context/
│   │   │   │   └── WalletContext.tsx
│   │   │   └── layouts/
│   │   │       └── DashboardLayout.tsx
│   │   └── services/
│   │       └── api.ts
│   └── package.json
│
├── backend/                     # FastAPI + Python
│   ├── main.py
│   ├── routes/
│   │   ├── auth.py              # Challenge, Login, Signup
│   │   ├── videos.py            # Upload, List, Get
│   │   ├── views.py             # Track watch events
│   │   ├── ads.py               # Video & Banner campaigns
│   │   └── settlement.py        # Reward distribution
│   ├── services/
│   │   ├── algorand.py          # On-chain transactions
│   │   ├── pinata.py            # IPFS uploads
│   │   └── reward_engine.py     # Reward calculations
│   └── models/
│
├── database/
│   └── schema.sql
│
└── README.md
```

---

## 🗄 Database Schema

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `id`, `wallet_address`, `username`, `role` |
| `videos` | Video metadata | `id`, `creator_id`, `cid`, `title`, `ads_enabled` |
| `views` | Watch events | `id`, `video_id`, `user_id`, `watch_seconds` |
| `campaigns` | Ad budgets | `id`, `advertiser_id`, `budget`, `reward_per_view`, `status` |
| `settlements` | Reward tx logs | `id`, `amount`, `fee`, `tx_hash`, `status` |

---

##  API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/challenge` | Get a signable challenge message | ❌ |
| `POST` | `/auth/signup` | Create account + verify signature | ❌ |
| `POST` | `/auth/login` | Login + verify signature | ❌ |
| `GET` | `/auth/me` | Get current user info | ✅ JWT |

### Videos

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/videos/upload` | Upload video to IPFS | ✅ JWT |
| `GET` | `/videos/list` | List all videos | ❌ |
| `GET` | `/videos/me` | List user's videos | ✅ JWT |
| `GET` | `/videos/{id}` | Get video by ID | ❌ |

### Views

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/views/track` | Track a video watch event | ✅ JWT |

### Ads — Video Campaigns

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/ads/create` | Create ad campaign (multipart) | ✅ JWT |
| `GET` | `/ads/active` | Get active campaigns | ❌ |
| `GET` | `/ads/me` | Get my campaigns | ✅ JWT |
| `POST` | `/ads/campaign/{id}/withdraw` | Withdraw remaining budget | ✅ JWT |

### Ads — Banner Campaigns

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/ads/banner/create` | Create banner ad | ✅ JWT |
| `GET` | `/ads/banner/active` | Get active banners | ❌ |
| `GET` | `/ads/banner/me` | Get my banners | ✅ JWT |
| `GET` | `/ads/summary` | Get ad performance summary | ✅ JWT |

### Settlements

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/settlement/` | List settlements | ❌ |
| `POST` | `/settlement/trigger` | Trigger video reward payout | ✅ JWT |
| `POST` | `/settlement/trigger-banner` | Trigger banner payout | ✅ JWT |
| `GET` | `/settlement/summary` | Get settlement stats | ❌ |

### Wallets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/wallets/balance` | Get user token balance | ✅ JWT |
| `GET` | `/wallets/platform-balance` | Get platform balance | ✅ JWT |

---

## 🚀 Deployment

### Backend — Hugging Face Spaces

```bash
# Docker-based deployment on HF Spaces
# Configured via Dockerfile + requirements.txt
```

### Frontend — Vercel

```bash
npm run build
# Deploy dist/ to Vercel
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PINATA_API_KEY` | Pinata API key for IPFS uploads | `abc123...` |
| `PINATA_SECRET` | Pinata secret key | `xyz789...` |
| `ALGOD_NODE` | Algorand node URL | `https://testnet-api.algonode.cloud` |
| `BACKEND_PRIVATE_KEY` | Algorand wallet private key (settlement) | `base64...` |
| `JWT_SECRET` | Secret for signing JWTs | `supersecret` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `VITE_API_BASE_URL` | Backend URL (frontend) | `https://your-backend.hf.space` |

---

## 🛡 Security Model

| Feature | Implementation |
|---------|---------------|
| Challenge Expiry | Messages expire after **2 minutes** |
| Nonce Storage | Stored server-side, single-use |
| Signature Verification | Verified with `algosdk` on the backend |
| JWT Lifetime | Short-lived (**15 minutes**) |
| Refresh Token | Optional, configurable |
| File Uploads | Validated file types, size limits |
| View Anti-Fraud | Device fingerprinting + min watch time |

---

##  Known Limitations

### Blockchain & Wallet

| Limitation | Details |
|------------|---------|
| **Testnet only** | All transactions run on Algorand Testnet; not production-ready for real token value |
| **Pera Wallet only** | No support for other Algorand wallets (Defly, Exodus, MyAlgo, etc.) |
| **No smart-contract-controlled rewards** | Settlements are signed by a centralized backend wallet, not an escrow contract |
| **No ASA token** | Rewards are paid in native ALGO; a custom ASA (e.g. ADMC) is not yet deployed |
| **Single-chain** | No cross-chain or bridge support — Algorand ecosystem only |

### Storage & Media

| Limitation | Details |
|------------|---------|
| **No on-chain metadata** | Video metadata lives in PostgreSQL, not on-chain or on Ceramic/IPNS |
| **IPFS pinning dependency** | Videos rely on Pinata; if the pin is removed, content becomes unavailable |
| **No transcoding** | Uploaded videos are served as-is — no adaptive bitrate streaming (HLS/DASH) |
| **No thumbnail generation** | Thumbnails are not auto-generated; creators must rely on defaults |



### Frontend & UX

| Limitation | Details |
|------------|---------|
| **No mobile app** | Web-only experience; no native iOS/Android app |
| **No offline support** | Requires an active internet connection; no PWA or service worker caching |
| **No search or discovery** | No video search, recommendations, or category-based browsing |
| **No comments or social features** | No commenting, liking, or sharing functionality |

### Economic Model

| Limitation | Details |
|------------|---------|
| **Manual settlement triggers** | Reward payouts must be triggered manually by the platform owner |
| **No advertiser refund mechanism** | No automated refund if a campaign underperforms or is cancelled early |
| **Fixed 5 % platform fee** | Fee percentage is hardcoded; not configurable per campaign or creator tier |
| **No real-time earnings dashboard** | Creators cannot see pending rewards until a settlement is triggered |

---

##  Future Roadmap

| Feature | Status |
|---------|--------|
| Smart contract–controlled rewards |  Planned |
| ASA token launch (ADMC) |  Planned |
| Storage relayer staking |  Idea |
| Anti-bot AI detection |  Idea |
| On-chain creator balances |  Idea |
| Viewer token rewards |  Idea |

---

##  Full System Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Creator  │     │  IPFS    │     │  Viewer  │     │ Backend  │     │ Algorand │
│ uploads  │────►│ stores   │     │ watches  │────►│ verifies │────►│ settles  │
│ video    │     │ video    │     │ video    │     │ & tracks │     │ rewards  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                    ┌────┴────┐
                                                    │ Rewards │
                                                    │ calculated│
                                                    │ & queued │
                                                    └─────────┘
```

> **Creator uploads video → Stored on IPFS → Viewer watches → Backend verifies watch → Reward calculated → Settlement transaction sent to Algorand → Creator withdraws**

---



<div align="center">
-->> Authors

Swayam Shetkar — Developer, Architect, Cybersecurity , AI & Blockchain Enthusiast




[Frontend](https://your-app.vercel.app) · [Backend API](https://swayamshetkar-rift-backend-blockchain.hf.space) · [Algorand Explorer](https://testnet.algoexplorer.io)

</div>
