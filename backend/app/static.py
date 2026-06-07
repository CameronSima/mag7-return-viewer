"""Serve the built frontend (SPA + prerendered SEO pages) from FastAPI.

In production the SPA and the API run in a single process/container — there's no
separate web server. This module wires FastAPI to serve the Vite build output
directly: content-hashed assets get an immutable long cache, the HTML shell is
never cached, prerendered SEO pages at ``/compare/<slug>/index.html`` are served
as-is, and any other path falls back to the SPA shell for client-side routing.

It's a no-op when ``STATIC_DIR`` is unset (local dev, where Vite serves the
frontend on its own port and proxies /api here). TLS, HTTP/2, and edge
compression are handled by the platform reverse proxy (e.g. Coolify/Traefik)
sitting in front of this container.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

# Vite emits content-hashed asset filenames, so a changed file always has a new
# URL — its old URL can safely be cached forever.
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
NO_CACHE = "no-cache"


class ImmutableStaticFiles(StaticFiles):
    """StaticFiles that stamps responses with an immutable long-lived cache."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = IMMUTABLE_CACHE
        return response


def mount_static(app: FastAPI, static_dir: str | None) -> None:
    """Wire ``app`` to serve the built frontend from ``static_dir``.

    No-op when ``static_dir`` is falsy or the build output isn't present, so the
    same app object runs API-only in local dev and full-stack in the container.
    """
    if not static_dir:
        return
    root = Path(static_dir).resolve()
    index = root / "index.html"
    if not index.is_file():
        return

    # Hashed assets get their own mount so they're served with the immutable
    # cache header (and benefit from StaticFiles' range/etag handling).
    assets = root / "assets"
    if assets.is_dir():
        app.mount("/assets", ImmutableStaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        # Mirror nginx try_files: exact file, then dir/index.html (the
        # prerendered SEO landing pages), else the SPA shell for client routing.
        # Resolve and confine to root so "../" can't escape the static dir.
        candidate = (root / full_path).resolve()
        if candidate == root or root in candidate.parents:
            if candidate.is_file():
                return FileResponse(candidate)
            page = candidate / "index.html"
            if candidate.is_dir() and page.is_file():
                return FileResponse(page, headers={"Cache-Control": NO_CACHE})
        return FileResponse(index, headers={"Cache-Control": NO_CACHE})
