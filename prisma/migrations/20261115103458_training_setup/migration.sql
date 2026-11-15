-- CreateEnum
CREATE TYPE "TrainingExperience" AS ENUM ('NEVER', 'UNDER_6_MONTHS', 'OVER_6_MONTHS', 'OVER_2_YEARS');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "dumbbellStepKg" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "experience" "TrainingExperience",
ADD COLUMN     "focusAreas" TEXT[],
ADD COLUMN     "machineStepKg" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "trainingDays" INTEGER[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo';

-- CreateTable
CREATE TABLE "StrengthBaseline" (
    "userId" TEXT NOT NULL,
    "lift" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthBaseline_pkey" PRIMARY KEY ("userId","lift")
);

-- AddForeignKey
ALTER TABLE "StrengthBaseline" ADD CONSTRAINT "StrengthBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
