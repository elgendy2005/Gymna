import { CircleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getResetTokenStatus } from "@/server/password-reset";

type Props = PageProps<"/[locale]/reset-password">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return {
    title: t("resetTitle"),
    // The address carries a secret: keep it out of search results and out
    // of the Referer header of any link followed from this page.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const t = await getTranslations("Auth");
  return (
    <AuthPanel title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <Suspense fallback={<FormSkeleton />}>
        <ResetGate
          token={searchParams.then((value) =>
            typeof value.token === "string" ? value.token : null,
          )}
        />
      </Suspense>
    </AuthPanel>
  );
}

const STATUS_ERRORS = {
  invalid: "token_invalid",
  expired: "token_expired",
  used: "token_used",
} as const;

/** Checks the link before asking for a new password, so a dead link says so up front. */
async function ResetGate({ token }: { token: Promise<string | null> }) {
  const value = await token;
  let status: Awaited<ReturnType<typeof getResetTokenStatus>>["status"];
  try {
    status = (await getResetTokenStatus(value)).status;
  } catch (error) {
    // The form still works; submitting it reports any problem.
    console.error("getResetTokenStatus failed", error);
    status = "valid";
  }

  if (status === "valid" && value) return <ResetPasswordForm token={value} />;

  const t = await getTranslations("Auth");
  const code = status === "valid" ? "token_invalid" : STATUS_ERRORS[status];
  return (
    <div className="space-y-4">
      <p
        role="alert"
        className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive"
      >
        <CircleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        {t(`errors.${code}`)}
      </p>
      <Link href="/forgot-password" className={cn(buttonVariants({ size: "xl" }), "w-full")}>
        {t("requestNewLink")}
      </Link>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
