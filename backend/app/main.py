from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import ads, auth, settlement, videos, views, wallets
from .services import reward_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    reward_engine.start()
    yield


app = FastAPI(title="Rift Decentralized Video Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(videos.router, prefix="/videos", tags=["Videos"])
app.include_router(views.router, prefix="/views", tags=["Views"])
app.include_router(ads.router, prefix="/ads", tags=["Ads"])
app.include_router(settlement.router, prefix="/settlement", tags=["Settlement"])
app.include_router(wallets.router, prefix="/wallets", tags=["Wallets"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Rift API", "storage": "Pinata", "network": "Algorand"}
