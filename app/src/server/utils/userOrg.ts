import { prisma } from "~/server/db";
import { generateApiKey } from "./generateApiKey";

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
      apiKeys: {
        create: [
          {
            name: "Default API Key",
            apiKey: generateApiKey(),
          },
        ],
      },
    },
  });
}
