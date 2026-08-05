-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('DIRECT', 'BROADCAST');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "source" "LeadSource" NOT NULL DEFAULT 'DIRECT';
