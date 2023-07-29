import { prisma } from "~/server/db";

export default async function userOrg(userId: string) {
  return await prisma.organization.upsert({
    where: {
      personalOrgUserId: userId,
    },
    update: {},
    create: {
      personalOrgUserId: userId,
      organizationUsers: {
        create: {
          userId: userId,
          role: "ADMIN",
        },
      },
    },
  });
}
