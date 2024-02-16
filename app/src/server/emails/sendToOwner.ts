import { prisma } from "../db";

export async function sendToOwner(projectId: string, callback: (...args: any[]) => Promise<void>) {
  const owner = await prisma.projectUser.findFirst({
    where: {
      projectId: projectId,
      role: "OWNER",
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (owner?.user.email) {
    await callback(owner.user.email);
  }
}
