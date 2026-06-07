/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the API backend (e.g. https://api.example.com).
   *  Empty/undefined in dev, where calls are relative and use the Vite proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** Canonical site URL baked into SEO pages / sitemap at build time. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
