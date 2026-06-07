"""FastAPI application entry point.

This is an API-only service. The frontend is built and served separately
(Cloudflare Pages), calling this backend cross-origin — so CORS is configured
from the allowed Pages origin(s). A platform reverse proxy (e.g. Coolify/Traefik)
sits in front for TLS, HTTP/2, and routing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.compare import router as compare_router
from app.api.portfolio import router as portfolio_router
from app.api.returns import router as returns_router
from app.config import CORS_ORIGINS


class StripApiPrefix:
    """Strip a leading ``/api`` from request paths before routing.

    The browser client calls the API under ``/api`` so the Vite dev server can
    tell API calls apart from app routes and proxy only those. The routers
    themselves are mounted at the root (``/compare``, ``/returns``, …). Stripping
    the prefix here lets the same client work in both setups — dev (Vite proxy →
    this app) and the Cloudflare Pages build (absolute ``/api`` URLs straight to
    this app). Non-``/api`` paths (e.g. /health) pass through untouched.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path: str = scope["path"]
            if path == "/api" or path.startswith("/api/"):
                scope = dict(scope)
                scope["path"] = path[len("/api") :] or "/"
                raw_path = scope.get("raw_path")
                if raw_path is not None:
                    scope["raw_path"] = raw_path[len("/api") :] or b"/"
        await self.app(scope, receive, send)


app = FastAPI(
    title="Portfolio & Ticker Comparison API",
    description=(
        "Compare daily returns, normalized growth, and risk statistics across "
        "arbitrary tickers — computed from adjusted close prices."
    ),
    version="0.2.0",
)

# Compress text responses (the JSON payloads can be large for long ranges).
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Map the client's /api/* calls onto the root-mounted routers (see class doc).
app.add_middleware(StripApiPrefix)

# CORS origins come from config (CORS_ORIGINS env var), defaulting to the Vite
# dev server. The frontend is served cross-origin from Cloudflare Pages, so set
# CORS_ORIGINS to the Pages domain(s) in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(returns_router)
app.include_router(compare_router)
app.include_router(portfolio_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check."""
    return {"status": "ok"}
