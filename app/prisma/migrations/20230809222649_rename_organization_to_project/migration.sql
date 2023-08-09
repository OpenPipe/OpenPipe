-- Rename Enum
ALTER TYPE "OrganizationUserRole" RENAME TO "ProjectUserRole";

-- Drop and recreate foreign keys
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_organizationId_fkey";
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_organizationId_fkey";
ALTER TABLE "Experiment" DROP CONSTRAINT "Experiment_organizationId_fkey";
ALTER TABLE "LoggedCall" DROP CONSTRAINT "LoggedCall_organizationId_fkey";
ALTER TABLE "OrganizationUser" DROP CONSTRAINT "OrganizationUser_organizationId_fkey";
ALTER TABLE "OrganizationUser" DROP CONSTRAINT "OrganizationUser_userId_fkey";

-- Rename columns
ALTER TABLE "ApiKey" RENAME COLUMN "organizationId" TO "projectId";
ALTER TABLE "Dataset" RENAME COLUMN "organizationId" TO "projectId";
ALTER TABLE "Experiment" RENAME COLUMN "organizationId" TO "projectId";
ALTER TABLE "LoggedCall" RENAME COLUMN "organizationId" TO "projectId";
ALTER TABLE "OrganizationUser" RENAME COLUMN "organizationId" TO "projectId";
ALTER TABLE "Organization" RENAME COLUMN "personalOrgUserId" TO "personalProjectUserId";

-- Rename table
ALTER TABLE "Organization" RENAME TO "Project";
ALTER TABLE "OrganizationUser" RENAME TO "ProjectUser";

-- Recreate foreign keys
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoggedCall" ADD CONSTRAINT "LoggedCall_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename indexes
ALTER TABLE "Project" RENAME CONSTRAINT "Organization_pkey" TO "Project_pkey";
ALTER TABLE "ProjectUser" RENAME CONSTRAINT "OrganizationUser_pkey" TO "ProjectUser_pkey";
ALTER TABLE "Project" RENAME CONSTRAINT "Organization_personalOrgUserId_fkey" TO "Project_personalProjectUserId_fkey";
ALTER INDEX "Organization_personalOrgUserId_key" RENAME TO "Project_personalProjectUserId_key";
ALTER INDEX "OrganizationUser_organizationId_userId_key" RENAME TO "ProjectUser_projectId_userId_key";
