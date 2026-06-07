/**
 * Build-time programmatic SEO. For each curated comparison (see docs/seo.md),
 * emit a static landing page that reuses the built SPA shell — so the hashed
 * asset URLs stay correct — but overrides the head metadata and injects:
 *
 *   - `window.__SEO_STATE__`, so the SPA boots into that comparison; and
 *   - a visible H1 + intro copy in #root, so crawlers that don't run JS still
 *     read relevant content (React replaces it on hydration).
 *
 * Also writes sitemap.xml and robots.txt. Run after `vite build`. Expanding
 * SEED_COMPARISONS is the only thing between this and thousands of pages.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareHeadline,
  comparePath,
  DEFAULT_SITE_URL,
  metaForState,
  SEED_COMPARISONS,
  type SeoInput,
} from "../src/lib/seo.ts";

const DIST = join(process.cwd(), "dist");
const SITE_URL = (process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");

const template = readFileSync(join(DIST, "index.html"), "utf8");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Swap a single-attribute meta/link tag's value, tolerating Vite's multiline
 *  formatting (`name`/`content` may sit on separate lines). */
function replaceTag(
  html: string,
  pattern: RegExp,
  replacement: string,
): string {
  if (!pattern.test(html)) {
    throw new Error(`SEO template missing expected tag: ${pattern}`);
  }
  return html.replace(pattern, replacement);
}

function renderPage(tickers: string[]): string {
  const state: SeoInput = { mode: "compare", tickers, holdings: [], benchmark: null };
  const { title, description } = metaForState(state);
  const canonical = `${SITE_URL}${comparePath(tickers)}`;

  let html = template;
  html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );

  // Boot the SPA into this comparison (escape "<" so the JSON can't break out).
  const seoState = JSON.stringify({ mode: "compare", tickers }).replace(/</g, "\\u003c");
  html = html.replace(
    "</head>",
    `    <script>window.__SEO_STATE__=${seoState}</script>\n  </head>`,
  );

  // Static content for non-JS crawlers; React replaces #root on hydration.
  const prerendered =
    `<div id="root"><main style="max-width:64rem;margin:0 auto;padding:2.5rem 1rem">` +
    `<h1>${escapeHtml(compareHeadline(tickers))}</h1>` +
    `<p>${escapeHtml(description)}</p></main></div>`;
  return html.replace('<div id="root"></div>', prerendered);
}

const paths: string[] = ["/"];
for (const tickers of SEED_COMPARISONS) {
  const path = comparePath(tickers);
  const outDir = join(DIST, path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), renderPage(tickers), "utf8");
  paths.push(path);
}

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap, "utf8");

writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8",
);

console.log(
  `SEO: generated ${SEED_COMPARISONS.length} landing pages + sitemap.xml + robots.txt`,
);
