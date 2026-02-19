from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""

    jwt_secret: str = ""
    jwt_expire_minutes: int = 60 * 24
    cors_origins: str = "*"

    pinata_jwt: str = ""
    pinata_gateway: str = "gateway.pinata.cloud"

    algod_address: str = "https://testnet-api.algonode.cloud"
    algod_token: str = ""
    algorand_mnemonic: str = ""
    platform_wallet: str = ""

    asset_id: int = 0
    app_id: int = 0
    token_decimals: int = 6
    settlement_fee_bps: int = 200
    use_contract_settlement: bool = False

    reward_interval_minutes: int = 60
    scheduler_enabled: bool = True

    view_min_watch_seconds: int = 30
    view_wallet_cooldown_seconds: int = 3600
    view_ip_hourly_limit: int = 120
    view_fingerprint_hourly_limit: int = 60

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.supabase_key

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.cors_origins.strip():
            return ["*"]
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["*"]


settings = Settings()
