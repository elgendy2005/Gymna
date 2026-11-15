"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { regeneratePlanAction } from "@/server/actions/plan";

/** Asks first, then swaps the plan for a new mix of exercises. */
export function RegeneratePlan() {
  const t = useTranslations("Plan");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const regenerate = async () => {
    setWorking(true);
    let result;
    try {
      result = await regeneratePlanAction();
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }
    setWorking(false);
    if (!result.ok) {
      toast.error(t(`errors.${result.error}`));
      return;
    }
    setOpen(false);
    toast.success(t("regenerated"));
    router.refresh();
  };

  return (
    <>
      <Button variant="outline" size="xl" className="w-full" onClick={() => setOpen(true)}>
        <RefreshCwIcon aria-hidden />
        {t("regenerate")}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !working && setOpen(next)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>{t("confirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="xl" disabled={working} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button size="xl" disabled={working} onClick={() => void regenerate()}>
              {working && <Loader2Icon className="animate-spin" aria-hidden />}
              {working ? t("regenerating") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
