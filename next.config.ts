import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

// Report-Only for now: browsers report what this policy would block (to
// /api/csp-report, which logs it) but block nothing. Switch the header name
// to Content-Security-Policy once the logs stay quiet.
//
// Inline scripts are still allowed. Next.js inlines its page data, and the
// theme script runs inline before paint; a nonce would remove that need but
// makes every page fully dynamic, which gives up the prerendered shells.
// form-action lists Google because the Google sign-in form is answered with
// a redirect there, and browsers check form-action on that redirect too.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

// Features the app never uses are switched off for the page and any frame.
const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "bluetooth=()",
  "hid=()",
  "midi=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "display-capture=()",
  "browsing-topics=()",
  "screen-wake-lock=(self)",
  "fullscreen=(self)",
].join(", ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The dev server prints server function arguments by default. Ours carry
  // passwords and health answers, so that logging is off.
  logging: { serverFunctions: false },
  // The home screen moved from /dashboard to /today; old links keep working.
  async redirects() {
    return [
      {
        source: "/:locale(ar|en)/dashboard",
        destination: "/:locale/today",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
          { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      {
        // Signed-in screens hold personal data (health answers, weights).
        // Neither a shared cache nor the browser's back/forward store should
        // keep a copy, for example on a shared computer after sign-out.
        // Keep this list in step with PROTECTED in src/proxy.ts.
        source:
          "/:locale(ar|en)/:section(today|onboarding|plan|workout|exercises|progress|settings)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        // Exercise photos change rarely but keep their file names, so they
        // are cached for a month rather than marked immutable.
        source: "/exercise-media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // The service worker must never be served stale, or a fix to it
        // could not reach installed apps.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
