# syntax=docker/dockerfile:1
#
# Single image that builds the frontend and serves it — together with the JSON
# API — from one FastAPI/uvicorn process. A platform reverse proxy (Coolify's
# Traefik) handles TLS/HTTP-2/routing in front, so no in-image web server is
# needed. Build context is the repo root.

# ---- Stage 1: build the SPA + prerendered SEO pages -------------------------
FROM node:22-bookworm-slim AS frontend
WORKDIR /fe
# Install from the lockfile first (cached unless deps change). devDependencies
# are needed: tsc, vite and tsx all run during the build.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
# Canonical URL baked into the prerendered SEO pages / sitemap. Override with
# --build-arg VITE_SITE_URL=https://your-domain.example (Coolify: a build arg).
ARG VITE_SITE_URL
ENV VITE_SITE_URL=${VITE_SITE_URL}
RUN npm run build   # -> /fe/dist

# ---- Stage 2: resolve backend dependencies into a venv ----------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS deps
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /app
# Keyed on the lockfile only, so editing app code doesn't rebuild dependencies.
# --no-install-project: run-from-source (no build-system), only deps are needed.
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ---- Stage 3: runtime -------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime
RUN groupadd --system app && useradd --system --gid app --home /app app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Tells the app where the built frontend lives; docker-compose can override
    # REDIS_URL / WEB_CONCURRENCY / CORS_ORIGINS.
    STATIC_DIR=/app/static \
    WEB_CONCURRENCY=2

WORKDIR /app
COPY --from=deps /opt/venv /opt/venv
COPY backend/app ./app
COPY --from=frontend /fe/dist ./static

USER app
EXPOSE 8000

# Liveness via the FastAPI /health route (no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status==200 else 1)"]

# Multiple workers share one warm cache via Redis (vs. N cold per-process
# caches). WEB_CONCURRENCY tunes the count without rebuilding.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY}"]
