-- CreateEnum
CREATE TYPE "ExerciseEquipment" AS ENUM ('BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'EZ_BAR', 'KETTLEBELL', 'CABLE', 'MACHINE', 'BANDS', 'MEDICINE_BALL', 'EXERCISE_BALL', 'FOAM_ROLL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('STRENGTH', 'STRETCHING', 'PLYOMETRICS', 'CARDIO', 'POWERLIFTING', 'OLYMPIC_WEIGHTLIFTING', 'STRONGMAN');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('FRAME_SEQUENCE', 'GIF', 'VIDEO', 'LOTTIE');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "category" "ExerciseCategory" NOT NULL,
    "equipment" "ExerciseEquipment" NOT NULL,
    "difficulty" "Level" NOT NULL,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "isCompound" BOOLEAN NOT NULL DEFAULT false,
    "movementPattern" TEXT,
    "contraindications" TEXT[],
    "requirements" TEXT[],
    "engineEligible" BOOLEAN NOT NULL DEFAULT false,
    "instructionsEn" TEXT[],
    "instructionsAr" TEXT[],
    "mistakesEn" TEXT[],
    "mistakesAr" TEXT[],
    "breathingEn" TEXT,
    "breathingAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseMedia" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "urls" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExerciseMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE INDEX "Exercise_equipment_idx" ON "Exercise"("equipment");

-- CreateIndex
CREATE INDEX "Exercise_difficulty_idx" ON "Exercise"("difficulty");

-- CreateIndex
CREATE INDEX "Exercise_movementPattern_idx" ON "Exercise"("movementPattern");

-- CreateIndex
CREATE INDEX "Exercise_engineEligible_idx" ON "Exercise"("engineEligible");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseMedia_exerciseId_provider_key" ON "ExerciseMedia"("exerciseId", "provider");

-- AddForeignKey
ALTER TABLE "ExerciseMedia" ADD CONSTRAINT "ExerciseMedia_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
