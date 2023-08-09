import { prisma } from "~/server/db";
import { generateApiKey } from "./generateApiKey";

export default async function userProject(userId: string) {
  return await prisma.project.upsert({
    where: {
      personalProjectUserId: userId,
    },
    update: {},
    create: {
      personalProjectUserId: userId,
      projectUsers: {
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
