import { prisma } from "~/server/db";

export default async function userOrg(userId: string) {
  return await prisma.organization.upsert({
    where: {
      personalOrgUserId: userId,
    },
    update: {},
    create: {
      personalOrgUserId: userId,
      OrganizationUser: {
        create: {
          userId: userId,
          role: "ADMIN",
        },
      },
    },
  });
}
