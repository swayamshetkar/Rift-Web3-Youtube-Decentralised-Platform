from __future__ import annotations

import requests

from ..config import settings


def upload_file(file_content: bytes, filename: str) -> str:
    if not settings.pinata_jwt:
        raise RuntimeError("PINATA_JWT is not configured.")

    response = requests.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        headers={"Authorization": f"Bearer {settings.pinata_jwt}"},
        files={"file": (filename, file_content)},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    cid = payload.get("IpfsHash")
    if not cid:
        raise RuntimeError("Pinata response missing IpfsHash.")
    return cid


def build_ipfs_url(cid: str) -> str:
    gateway = settings.pinata_gateway.strip()
    if gateway.startswith("http://") or gateway.startswith("https://"):
        base = gateway.rstrip("/")
    else:
        base = f"https://{gateway.rstrip('/')}"
    return f"{base}/ipfs/{cid}"
