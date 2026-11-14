-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('FULL_GYM', 'DUMBBELLS', 'BODYWEIGHT');

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "goal" "Goal" NOT NULL,
    "level" "Level" NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "onboardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "HealthScreening" (
    "userId" TEXT NOT NULL,
    "heartCondition" BOOLEAN NOT NULL DEFAULT false,
    "chestPain" BOOLEAN NOT NULL DEFAULT false,
    "highBloodPressure" BOOLEAN NOT NULL DEFAULT false,
    "dizziness" BOOLEAN NOT NULL DEFAULT false,
    "diabetes" BOOLEAN NOT NULL DEFAULT false,
    "lowerBack" BOOLEAN NOT NULL DEFAULT false,
    "knee" BOOLEAN NOT NULL DEFAULT false,
    "shoulder" BOOLEAN NOT NULL DEFAULT false,
    "otherJoint" BOOLEAN NOT NULL DEFAULT false,
    "recentSurgery" BOOLEAN NOT NULL DEFAULT false,
    "pregnancy" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "needsClearance" BOOLEAN NOT NULL DEFAULT false,
    "contraindications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScreening_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScreening" ADD CONSTRAINT "HealthScreening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
