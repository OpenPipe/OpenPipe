import { prisma } from "../db";
import { sendPaymentFailed } from "../emails/sendPaymentFailed";

export async function emailAdminsAboutPaymentFailure(
  projectId: string,
  projectName: string,
  projectSlug: string,
) {
  const admins = await prisma.projectUser.findMany({
    where: {
      projectId,
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
      await sendPaymentFailed({
        recipientEmail: admin.user.email,
        projectName,
        projectSlug,
      });
    }
  }
}
