import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("Common");

  return (
    <main
      id="main"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center"
    >
      <p className="text-6xl font-extrabold text-brand-text" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className={buttonVariants({ size: "xl" })}>
        {t("backHome")}
      </Link>
    </main>
  );
}
