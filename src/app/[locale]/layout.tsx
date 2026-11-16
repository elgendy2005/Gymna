import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Providers } from "@/components/layout/providers";
import { ServiceWorker } from "@/components/layout/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { isRtl, routing } from "@/i18n/routing";
import "../globals.css";

const latin = Sora({ subsets: ["latin"], display: "swap" });

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// next/font appends a metric-adjusted Arial fallback to each family. Arial
// has Arabic glyphs, so in a "Sora, Sora Fallback, Plex Arabic" stack it
// would render all Arabic text. So the primary names go first (Sora has no
// Arabic glyphs, and Arabic falls through to Plex Arabic) and the adjusted
// fallbacks go after both. They only show while the web fonts load, and
// because they match the real fonts' metrics, text does not rewrap and push
// the page down when the fonts arrive.
const primaryFamily = (fontFamily: string) => fontFamily.split(",")[0].trim();
const fallbackFamily = (fontFamily: string) =>
  fontFamily.split(",").slice(1).join(",").trim();

/** The page's main script decides which fallback is tried first. */
function fontVariables(locale: string) {
  const fallbacks = [fallbackFamily(latin.style.fontFamily), fallbackFamily(arabic.style.fontFamily)];
  if (isRtl(locale)) fallbacks.reverse();
  return {
    "--font-latin": primaryFamily(latin.style.fontFamily),
    "--font-arabic": primaryFamily(arabic.style.fontFamily),
    "--fallback-family": fallbacks.filter(Boolean).join(", ") || "system-ui",
  } as React.CSSProperties;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  const locale = await rootLocale();
  return {
    title: { default: t("title"), template: "%s · Gymna" },
    description: t("description"),
    applicationName: "Gymna",
    // One manifest per language, so the installed app opens in the language
    // it was installed from. See manifest.webmanifest/route.ts.
    manifest: `/${locale}/manifest.webmanifest`,
    icons: {
      // favicon.ico is picked up from the app folder on its own.
      icon: [{ url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: { capable: true, title: "Gymna", statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafbf8" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Common");

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      // Dark is the default; an inline script (see Providers) swaps to light before paint
      // when the visitor chose it, which is why hydration warnings are off.
      className="dark h-full antialiased"
      style={fontVariables(locale)}
      // Tells the router that smooth scrolling is intentional, so it turns
      // it off during route transitions.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-center" />
        </NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
