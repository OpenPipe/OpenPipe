/*
  Warnings:

  - A unique constraint covering the columns `[loggedCallId,name]` on the table `LoggedCallTag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LoggedCallTag_loggedCallId_name_key" ON "LoggedCallTag"("loggedCallId", "name");
