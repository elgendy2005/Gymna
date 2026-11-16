import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** The card used by the password reset screens; matches the login card. */
export async function AuthPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("Auth");
  return (
    <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
