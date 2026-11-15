import type {
  Contraindication,
  MovementPattern,
} from "../../../src/lib/exercise-options";

/**
 * Coaching content shared by every exercise of a movement pattern: the
 * mistakes and breathing are the same for, say, every squat variation.
 * `avoid` lists the health tags that rule the whole pattern out; single
 * exercises add their own in curated.ts.
 */
export type PatternContent = {
  avoid: Contraindication[];
  mistakesEn: string[];
  mistakesAr: string[];
  breathingEn: string;
  breathingAr: string;
};

export const PATTERN_CONTENT: Record<MovementPattern, PatternContent> = {
  squat: {
    avoid: ["knee"],
    mistakesEn: [
      "Knees caving inward instead of tracking over the toes.",
      "Heels lifting off the floor.",
      "Rounding the lower back at the bottom.",
      "Cutting the depth short to lift more weight.",
    ],
    mistakesAr: [
      "دخول الركبتين للداخل بدل ما يكونوا في اتجاه أصابع القدم.",
      "رفع الكعبين عن الأرض.",
      "تقوّس أسفل الظهر في آخر النزول.",
      "تقصير النزول عشان تشيل وزن أكبر.",
    ],
    breathingEn: "Breathe in and brace your core on the way down. Breathe out as you stand up.",
    breathingAr: "خد نفس وشدّ بطنك وأنت نازل، وطلّع النفس وأنت طالع.",
  },
  hinge: {
    avoid: ["lower_back"],
    mistakesEn: [
      "Rounding the back instead of hinging at the hips.",
      "Letting the weight drift away from the legs.",
      "Turning it into a squat by bending the knees too much.",
      "Leaning back and overextending at the top.",
    ],
    mistakesAr: [
      "تقوّس الظهر بدل ما الحركة تيجي من الحوض.",
      "إبعاد الوزن عن الرجلين.",
      "ثني الركبتين زيادة فتتحول الحركة لسكوات.",
      "الميل للخلف والمبالغة في فرد الظهر في آخر الحركة.",
    ],
    breathingEn: "Breathe in and brace before you lower. Breathe out as you drive your hips forward.",
    breathingAr: "خد نفس وشدّ بطنك قبل النزول، وطلّع النفس وأنت بتدفع الحوض لقدام.",
  },
  lunge: {
    avoid: ["knee", "balance"],
    mistakesEn: [
      "Front knee collapsing inward.",
      "Taking too short a step, so the front heel lifts.",
      "Leaning the torso far forward.",
      "Slamming the back knee into the floor.",
    ],
    mistakesAr: [
      "دخول الركبة الأمامية للداخل.",
      "خطوة قصيرة تخلّي كعب الرجل الأمامية يترفع.",
      "ميل الجسم لقدام زيادة.",
      "خبط الركبة الخلفية في الأرض.",
    ],
    breathingEn: "Breathe in as you lower. Breathe out as you push back up.",
    breathingAr: "خد نفس وأنت نازل، وطلّع النفس وأنت بتدفع لفوق.",
  },
  horizontal_push: {
    avoid: ["shoulder"],
    mistakesEn: [
      "Flaring the elbows straight out to the sides.",
      "Bouncing the weight off the chest.",
      "Shoulders rolling forward instead of staying back and down.",
      "Using only half the range of motion.",
    ],
    mistakesAr: [
      "فتح الكوعين على الآخر للجانبين.",
      "ارتداد الوزن من على الصدر.",
      "خروج الكتفين لقدام بدل ما يفضلوا لورا ولتحت.",
      "أداء نص الحركة بس.",
    ],
    breathingEn: "Breathe in as you lower. Breathe out as you press.",
    breathingAr: "خد نفس وأنت نازل، وطلّع النفس وأنت بتدفع.",
  },
  vertical_push: {
    avoid: ["shoulder"],
    mistakesEn: [
      "Arching the lower back to get the weight up.",
      "Pressing forward instead of straight overhead.",
      "Shrugging the shoulders up to the ears.",
      "Using the legs to bounce the weight.",
    ],
    mistakesAr: [
      "تقويس أسفل الظهر عشان ترفع الوزن.",
      "دفع الوزن لقدام بدل ما يطلع فوق الرأس على طول.",
      "رفع الكتفين ناحية الودان.",
      "استخدام الرجلين لنطّ الوزن.",
    ],
    breathingEn: "Breathe in at the bottom. Breathe out as you press overhead.",
    breathingAr: "خد نفس تحت، وطلّع النفس وأنت بتدفع لفوق.",
  },
  horizontal_pull: {
    avoid: [],
    mistakesEn: [
      "Yanking the weight with momentum.",
      "Rounding the back.",
      "Pulling with the arms only instead of squeezing the shoulder blades.",
      "Shrugging the shoulders up.",
    ],
    mistakesAr: [
      "شدّ الوزن بالمرجحة.",
      "تقوّس الظهر.",
      "الشدّ بالذراعين بس من غير ضمّ لوحي الكتف.",
      "رفع الكتفين لفوق.",
    ],
    breathingEn: "Breathe out as you pull. Breathe in as you return.",
    breathingAr: "طلّع النفس وأنت بتشد، وخد نفس وأنت راجع.",
  },
  vertical_pull: {
    avoid: ["shoulder"],
    mistakesEn: [
      "Swinging the body to finish the rep.",
      "Stopping short instead of pulling to the upper chest.",
      "Leaning far back and turning it into a row.",
      "Dropping fast instead of lowering under control.",
    ],
    mistakesAr: [
      "مرجحة الجسم عشان تكمّل العدّة.",
      "التوقف قبل ما توصل لأعلى الصدر.",
      "الميل للخلف زيادة فتتحول الحركة لسحب أفقي.",
      "النزول بسرعة بدل التحكم في الرجوع.",
    ],
    breathingEn: "Breathe out as you pull down or up. Breathe in as you return.",
    breathingAr: "طلّع النفس وأنت بتشد، وخد نفس وأنت راجع.",
  },
  chest_fly: {
    avoid: ["shoulder"],
    mistakesEn: [
      "Lowering too deep and overstretching the shoulders.",
      "Bending the elbows so much it becomes a press.",
      "Going too heavy and losing control.",
    ],
    mistakesAr: [
      "النزول زيادة وشدّ الكتف أكتر من اللازم.",
      "ثني الكوعين زيادة فتتحول الحركة لضغط.",
      "وزن تقيل يخلّيك تفقد التحكم.",
    ],
    breathingEn: "Breathe in as your arms open. Breathe out as you bring them together.",
    breathingAr: "خد نفس وأنت بتفتح ذراعيك، وطلّع النفس وأنت بتضمّهم.",
  },
  lateral_raise: {
    avoid: ["shoulder"],
    mistakesEn: [
      "Swinging the weights up with the body.",
      "Raising above shoulder height.",
      "Shrugging so the traps take over.",
    ],
    mistakesAr: [
      "رفع الوزن بمرجحة الجسم.",
      "الرفع أعلى من مستوى الكتف.",
      "رفع الكتفين فتشتغل الترابيس بدل الكتف.",
    ],
    breathingEn: "Breathe out as you raise. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت بترفع، وخد نفس وأنت نازل.",
  },
  rear_delt: {
    avoid: [],
    mistakesEn: [
      "Using momentum instead of the rear shoulders.",
      "Squeezing the shoulder blades too early so the back does the work.",
      "Going too heavy.",
    ],
    mistakesAr: [
      "الاعتماد على المرجحة بدل الكتف الخلفي.",
      "ضمّ لوحي الكتف بدري فالظهر هو اللي يشتغل.",
      "وزن تقيل زيادة.",
    ],
    breathingEn: "Breathe out as you open your arms. Breathe in as you return.",
    breathingAr: "طلّع النفس وأنت بتفتح ذراعيك، وخد نفس وأنت راجع.",
  },
  biceps: {
    avoid: [],
    mistakesEn: [
      "Swinging the body to lift the weight.",
      "Letting the elbows drift forward.",
      "Not lowering all the way.",
    ],
    mistakesAr: [
      "مرجحة الجسم عشان ترفع الوزن.",
      "تحريك الكوعين لقدام.",
      "عدم النزول للآخر.",
    ],
    breathingEn: "Breathe out as you curl. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت بترفع، وخد نفس وأنت نازل.",
  },
  triceps: {
    avoid: [],
    mistakesEn: [
      "Elbows flaring out or moving around.",
      "Using the shoulders to push the weight.",
      "Not straightening the arms fully.",
    ],
    mistakesAr: [
      "فتح الكوعين أو تحريكهم.",
      "استخدام الكتف في دفع الوزن.",
      "عدم فرد الذراع للآخر.",
    ],
    breathingEn: "Breathe out as you straighten your arms. Breathe in as you bend them.",
    breathingAr: "طلّع النفس وأنت بتفرد ذراعك، وخد نفس وأنت بتتنيها.",
  },
  core: {
    avoid: [],
    mistakesEn: [
      "Pulling on the neck with the hands.",
      "Letting the lower back arch or sag.",
      "Rushing the reps with momentum.",
      "Holding your breath.",
    ],
    mistakesAr: [
      "شدّ الرقبة باليدين.",
      "ترك أسفل الظهر يتقوّس أو يهبط.",
      "الاستعجال والاعتماد على المرجحة.",
      "حبس النفس.",
    ],
    breathingEn: "Breathe out as you tighten your abs. Keep breathing steadily during holds.",
    breathingAr: "طلّع النفس وأنت بتشد بطنك، واتنفس بانتظام في تمارين الثبات.",
  },
  glutes: {
    avoid: [],
    mistakesEn: [
      "Arching the lower back instead of squeezing the glutes.",
      "Pushing through the toes instead of the heels.",
      "Not reaching full hip extension at the top.",
    ],
    mistakesAr: [
      "تقويس أسفل الظهر بدل شدّ عضلة المؤخرة.",
      "الدفع بأصابع القدم بدل الكعب.",
      "عدم فرد الحوض للآخر في أعلى الحركة.",
    ],
    breathingEn: "Breathe out as you lift your hips. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت بترفع الحوض، وخد نفس وأنت نازل.",
  },
  leg_curl: {
    avoid: [],
    mistakesEn: [
      "Lifting the hips off the pad.",
      "Letting the weight drop on the way back.",
      "Using a short range of motion.",
    ],
    mistakesAr: [
      "رفع الحوض عن المسند.",
      "ترك الوزن يقع وأنت راجع.",
      "أداء الحركة بمدى قصير.",
    ],
    breathingEn: "Breathe out as you curl. Breathe in as you return.",
    breathingAr: "طلّع النفس وأنت بتتني رجلك، وخد نفس وأنت راجع.",
  },
  leg_extension: {
    avoid: ["knee"],
    mistakesEn: [
      "Kicking the weight up with momentum.",
      "Lifting the hips off the seat.",
      "Dropping the weight instead of lowering it slowly.",
    ],
    mistakesAr: [
      "رفع الوزن بالمرجحة.",
      "رفع الحوض عن الكرسي.",
      "ترك الوزن يقع بدل النزول ببطء.",
    ],
    breathingEn: "Breathe out as you straighten your legs. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت بتفرد رجلك، وخد نفس وأنت نازل.",
  },
  calves: {
    avoid: [],
    mistakesEn: [
      "Bouncing at the bottom.",
      "Not rising fully onto the toes.",
      "Bending the knees to help.",
    ],
    mistakesAr: [
      "الارتداد في أسفل الحركة.",
      "عدم الصعود على أطراف الأصابع للآخر.",
      "ثني الركبتين للمساعدة.",
    ],
    breathingEn: "Breathe out as you rise. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت طالع، وخد نفس وأنت نازل.",
  },
  shrug: {
    avoid: [],
    mistakesEn: [
      "Rolling the shoulders in circles.",
      "Bending the elbows to lift the weight.",
      "Pushing the head forward.",
    ],
    mistakesAr: [
      "لفّ الكتفين في دواير.",
      "ثني الكوعين عشان ترفع الوزن.",
      "دفع الرأس لقدام.",
    ],
    breathingEn: "Breathe out as you lift your shoulders. Breathe in as you lower.",
    breathingAr: "طلّع النفس وأنت بترفع كتفك، وخد نفس وأنت نازل.",
  },
};
