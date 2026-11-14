// Health screening questions (PAR-Q style) and what each "yes" means for
// the training plan.

export const HEALTH_QUESTIONS = [
  "heartCondition",
  "chestPain",
  "highBloodPressure",
  "dizziness",
  "diabetes",
  "lowerBack",
  "knee",
  "shoulder",
  "otherJoint",
  "recentSurgery",
  "pregnancy",
] as const;

export type HealthQuestion = (typeof HEALTH_QUESTIONS)[number];
export type HealthAnswers = Record<HealthQuestion, boolean>;

/** Exercise tags the program engine filters on. */
export type Contraindication =
  | "cardiac"
  | "high_intensity"
  | "hypertension"
  | "balance"
  | "lower_back"
  | "knee"
  | "shoulder"
  | "joint"
  | "post_surgery"
  | "pregnancy";

// Diabetes has no movement to avoid; it still triggers the clearance notice
// and the conservative plan like every other "yes".
const TAGS: Record<HealthQuestion, readonly Contraindication[]> = {
  heartCondition: ["cardiac", "high_intensity"],
  chestPain: ["cardiac", "high_intensity"],
  highBloodPressure: ["hypertension"],
  dizziness: ["balance"],
  diabetes: [],
  lowerBack: ["lower_back"],
  knee: ["knee"],
  shoulder: ["shoulder"],
  otherJoint: ["joint"],
  recentSurgery: ["post_surgery"],
  pregnancy: ["pregnancy"],
};

export function emptyHealthAnswers(): HealthAnswers {
  return Object.fromEntries(
    HEALTH_QUESTIONS.map((question) => [question, false]),
  ) as HealthAnswers;
}

/** Questions answered "yes", in display order. */
export function flaggedQuestions(answers: HealthAnswers): HealthQuestion[] {
  return HEALTH_QUESTIONS.filter((question) => answers[question]);
}

export type HealthAssessment = {
  /** Any "yes": recommend medical clearance and build a conservative plan. */
  needsClearance: boolean;
  contraindications: Contraindication[];
};

export function assessHealth(answers: HealthAnswers): HealthAssessment {
  const flagged = flaggedQuestions(answers);
  const tags = new Set(flagged.flatMap((question) => TAGS[question]));
  return {
    needsClearance: flagged.length > 0,
    contraindications: [...tags].sort(),
  };
}
