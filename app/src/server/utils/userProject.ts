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
          role: "OWNER",
        },
      },
      apiKeys: {
        create: [
          {
            name: "Default API Key",
            apiKey: generateApiKey(),
          },
          {
            name: "Read-Only API Key",
            apiKey: generateApiKey(),
            readOnly: true,
          },
        ],
      },
    },
  });
}
