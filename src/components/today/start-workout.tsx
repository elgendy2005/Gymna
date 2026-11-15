"use client";

import { Loader2Icon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { startWorkoutAction } from "@/server/actions/workout";

/** The big Start (or Resume) button on the Today page. */
export function StartWorkout({ planDayId, resume }: { planDayId: string | null; resume: boolean }) {
  const t = useTranslations("Today");
  const w = useTranslations("Workout");
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    if (!resume && planDayId) {
      let result;
      try {
        result = await startWorkoutAction({ planDayId });
      } catch {
        result = { ok: false as const, error: "server_error" as const };
      }
      if (!result.ok) {
        setStarting(false);
        toast.error(w(`errors.${result.error}`));
        return;
      }
    }
    // Keep the spinner while the workout loads.
    router.push("/workout");
  };

  return (
    <Button size="xl" className="glow-brand h-14 w-full text-lg" disabled={starting} onClick={() => void start()}>
      {starting ? <Loader2Icon className="animate-spin" aria-hidden /> : <PlayIcon aria-hidden />}
      {t(resume ? "resume" : "start")}
    </Button>
  );
}
