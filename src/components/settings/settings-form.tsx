"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ChoicePills } from "@/components/onboarding/choice";
import { FocusAreaGrid, TrainingDaysPicker } from "@/components/onboarding/focus-areas";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import {
  DUMBBELL_STEPS_KG,
  FOCUS_AREAS,
  MACHINE_STEPS_KG,
  MAX_FOCUS_AREAS,
  UNIT_SYSTEMS,
  WEEKDAYS,
  type FocusArea,
} from "@/lib/profile-options";
import type { SettingsErrorCode, SettingsInput } from "@/lib/validation/settings";
import { saveSettingsAction } from "@/server/actions/settings";

export function SettingsForm({
  initial,
  daysPerWeek,
}: {
  initial: SettingsInput;
  daysPerWeek: number;
}) {
  const t = useTranslations("Settings");
  const o = useTranslations("Onboarding");
  const w = useTranslations("Common.weekdays");
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SettingsErrorCode | null>(null);

  const set = (patch: Partial<SettingsInput>) => {
    setValues((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const save = async () => {
    if (values.trainingDays.length !== daysPerWeek) {
      setError("trainingDaysCount");
      return;
    }
    setSaving(true);
    let result;
    try {
      result = await saveSettingsAction(values);
    } catch {
      result = { ok: false as const, error: "server_error" as const };
    }
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  };

  const focusLabels = Object.fromEntries(
    FOCUS_AREAS.map((area) => [area, o(`focus.areas.${area}`)]),
  ) as Record<FocusArea, string>;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <ChoicePills
        legend={t("units")}
        size="sm"
        options={UNIT_SYSTEMS.map((value) => ({ value, title: t(value) }))}
        value={values.unitSystem}
        onChange={(unitSystem) => set({ unitSystem })}
      />

      {/* The gym-step choices are in kg and only steer metric rounding. */}
      {values.unitSystem === "IMPERIAL" ? (
        <p className="text-sm text-muted-foreground">{t("stepHintImperial")}</p>
      ) : (
        <div className="space-y-4">
          <ChoicePills
            legend={t("dumbbellStep")}
            size="sm"
            options={DUMBBELL_STEPS_KG.map((value) => ({
              value,
              title: t("stepValue", { value }),
            }))}
            value={values.dumbbellStepKg}
            onChange={(dumbbellStepKg) => set({ dumbbellStepKg })}
          />
          <ChoicePills
            legend={t("machineStep")}
            size="sm"
            options={MACHINE_STEPS_KG.map((value) => ({
              value,
              title: t("stepValue", { value }),
            }))}
            value={values.machineStepKg}
            onChange={(machineStepKg) => set({ machineStepKg })}
          />
          <p className="text-sm text-muted-foreground">{t("stepHint")}</p>
        </div>
      )}

      <TrainingDaysPicker
        legend={t("trainingDays")}
        hint={t("trainingDaysHint", { count: daysPerWeek })}
        labels={WEEKDAYS.map((day) => w(`short.${day}`))}
        names={WEEKDAYS.map((day) => w(`long.${day}`))}
        count={daysPerWeek}
        value={values.trainingDays}
        onChange={(trainingDays) => set({ trainingDays })}
        error={
          error === "trainingDaysCount"
            ? t("errors.trainingDaysCount", { count: daysPerWeek })
            : null
        }
      />

      <FocusAreaGrid
        legend={t("focus")}
        hint={t("focusHint", { max: MAX_FOCUS_AREAS })}
        labels={focusLabels}
        value={values.focusAreas}
        onChange={(focusAreas) => set({ focusAreas })}
      />

      {error && error !== "trainingDaysCount" && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          {t(`errors.${error}`)}
        </p>
      )}

      <Button type="submit" size="xl" className="w-full" disabled={saving}>
        {saving && <Loader2Icon className="animate-spin" aria-hidden />}
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
