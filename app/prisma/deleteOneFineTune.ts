import { prisma } from "~/server/db";

// delete most recent fineTune
const mostRecentFineTune = await prisma.fineTune.findFirst({
  orderBy: { createdAt: "desc" },
});

if (mostRecentFineTune) {
  await prisma.fineTune.delete({
    where: { id: mostRecentFineTune.id },
  });
}
