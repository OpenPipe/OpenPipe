import { prisma } from "../db";

export async function sendToAdmins(invoiceId: string, callback: (...args: any[]) => Promise<void>) {
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: {
      id: invoiceId,
    },
  });

  const admins = await prisma.projectUser.findMany({
    where: {
      projectId: invoice.projectId,
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
