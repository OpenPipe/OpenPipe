import { prisma } from "~/server/db";
import { env } from "~/env.mjs";

const defaultId = "11111111-1111-1111-1111-111111111111";

await prisma.project.deleteMany({
  where: { id: defaultId },
});

// Mark all users as admins
await prisma.user.updateMany({
  where: {},
  data: {
    role: "ADMIN",
  },
});

// If there's an existing project, just seed into it
const project =
  (await prisma.project.findFirst({})) ??
  (await prisma.project.create({
    data: { id: defaultId },
  }));

if (env.OPENPIPE_API_KEY) {
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      apiKey: env.OPENPIPE_API_KEY,
    },
  });
  if (!existingApiKey) {
    await prisma.apiKey.create({
      data: {
        projectId: project.id,
        name: "Default API Key",
        apiKey: env.OPENPIPE_API_KEY,
      },
    });
  }
}
