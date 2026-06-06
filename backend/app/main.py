"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.compare import router as compare_router
from app.api.returns import router as returns_router

app = FastAPI(
    title="Portfolio & Ticker Comparison API",
    description=(
        "Compare daily returns, normalized growth, and risk statistics across "
        "arbitrary tickers — computed from adjusted close prices."
    ),
    version="0.2.0",
)

# CORS for local frontend dev. In production this would be restricted to
# the actual frontend origin via env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(returns_router)
app.include_router(compare_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check."""
    return {"status": "ok"}
