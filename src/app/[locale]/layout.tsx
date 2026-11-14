import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Providers } from "@/components/layout/providers";
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
// would render all Arabic text. Only the primary names go into the stack:
// Sora has no Arabic glyphs, so Arabic falls through to Plex Arabic.
const primaryFamily = (fontFamily: string) => fontFamily.split(",")[0].trim();

const fontVariables = {
  "--font-latin": primaryFamily(latin.style.fontFamily),
  "--font-arabic": primaryFamily(arabic.style.fontFamily),
} as React.CSSProperties;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: { default: t("title"), template: "%s · Gymna" },
    description: t("description"),
    applicationName: "Gymna",
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
      style={fontVariables}
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
      </body>
    </html>
  );
}
