"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.returns import router as returns_router

app = FastAPI(
    title="MAG7 Returns API",
    description="Daily returns for MAG7 stocks, computed from adjusted close prices.",
    version="0.1.0",
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


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check."""
    return {"status": "ok"}
