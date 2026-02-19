---
title: Rift Backend
emoji: "🚀"
colorFrom: red
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
tags:
  - backend
  - fastapi
  - algorand
  - pinata
---

# Rift Backend

This README serves as the Hugging Face Spaces configuration for Docker deployment.

## Hugging Face Spaces (Docker)

Hugging Face uses the YAML front matter above to configure a Docker-based Space.
Keep `sdk: docker` and set `app_port` to the port your container listens on.

## Local Docker Run

```bash
docker build -t rift-backend .
docker run --rm -p 8000:8000 --env-file .env rift-backend
```

## Core Endpoints

- `POST /auth/challenge`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /videos/upload`
- `GET /videos/list`
- `GET /videos/{video_id}`
- `POST /views/track`
- `POST /ads/create`
- `POST /ads/banner/create`
- `GET /settlement/`
- `POST /settlement/trigger`
- `POST /settlement/trigger-banner`

## Stack Integration

- **Supabase PostgreSQL** for metadata and analytics
- **Pinata (IPFS)** for video/ad file storage
- **Algorand Testnet/Mainnet** for ADMC token settlement
- **APScheduler** for automated reward and banner distribution jobs
