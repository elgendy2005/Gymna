import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
