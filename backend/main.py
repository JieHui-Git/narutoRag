from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db import get_pool, close_pool
from .services.embedder import get_embedder
from .routers.query import router as query_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up the DB pool and embedding model so the first request isn't slow
    get_pool()
    get_embedder()
    yield
    # Shutdown: close the DB pool cleanly
    close_pool()


app = FastAPI(
    title="NarutoQ API",
    description="Spoiler-aware Naruto lore Q&A powered by RAG",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router)


@app.get("/health")
def health():
    return {"status": "ok"}
