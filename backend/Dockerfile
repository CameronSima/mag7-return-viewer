# syntax=docker/dockerfile:1
#
# API-only backend image. The frontend is built and hosted separately on
# Cloudflare Pages, so this image carries no Node/static-serving concerns — just
# FastAPI/uvicorn. A platform reverse proxy (Coolify's Traefik) handles
# TLS/HTTP-2/routing in front.

# ---- Builder: resolve dependencies into a self-contained venv ----------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# Install dependencies in their own layer, keyed only on the lockfile, so editing
# app code doesn't invalidate the (slow) dependency build. --no-install-project:
# the project is run-from-source (no build-system), only its deps are needed.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ---- Runtime: slim image with just the venv + app source ---------------------
FROM python:3.12-slim-bookworm AS runtime

RUN groupadd --system app && useradd --system --gid app --home /app app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    WEB_CONCURRENCY=2

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY app ./app

USER app
EXPOSE 8000

# Liveness via the FastAPI /health route (no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status==200 else 1)"]

# Multiple workers share one warm cache via Redis (vs. N cold per-process
# caches). WEB_CONCURRENCY tunes the count without rebuilding.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY}"]
