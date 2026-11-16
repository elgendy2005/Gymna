const FALLBACK_URL = "https://gymna-two.vercel.app";

function siteUrl(value: string | undefined): string {
  try {
    const url = new URL(value || FALLBACK_URL);
    return url.origin;
  } catch {
    return FALLBACK_URL;
  }
}

/**
 * The public address, for absolute links in metadata, robots.txt and the
 * sitemap. Set SITE_URL when the site moves to its own domain.
 */
export const SITE_URL = siteUrl(process.env.SITE_URL);

/** Pages a signed-out visitor (or a crawler) can open, without the locale. */
export const PUBLIC_PATHS = ["", "/login", "/signup"] as const;
