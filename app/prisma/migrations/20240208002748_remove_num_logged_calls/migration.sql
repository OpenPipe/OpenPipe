/*
  Warnings:

  - You are about to drop the column `numLoggedCalls` on the `Project` table. All the data in the column will be lost.

*/

DROP TRIGGER IF EXISTS trigger_increment_num_logged_calls ON "LoggedCall";
DROP FUNCTION IF EXISTS increment_num_logged_calls();

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "numLoggedCalls";
