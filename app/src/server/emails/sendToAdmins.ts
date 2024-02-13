import { prisma } from "../db";

export async function sendToAdmins(projectId: string, callback: (...args: any[]) => Promise<void>) {
  const admins = await prisma.projectUser.findMany({
    where: {
      projectId: projectId,
      role: "ADMIN",
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  for (const admin of admins) {
    if (admin.user.email) {
      await callback(admin.user.email);
    }
  }
}
