import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import FineTuneModelTrained from "./templates/FineTuneModelTrained";
import { prisma } from "../db";
import { type TypedFineTune } from "~/types/dbColumns.types";

export const sendFineTuneModelTrained = async (fineTune: TypedFineTune) => {
  if (!fineTune.userId) return;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: fineTune.projectId },
  });

  const creator = await prisma.user.findUniqueOrThrow({
    where: { id: fineTune.userId },
  });

  if (!creator.email) return;

  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${project.slug}`;
  const fineTuneModelLink = `${projectLink}/fine-tunes/${fineTune.id}`;

  const emailBody = render(
    FineTuneModelTrained({
      fineTuneModelName: `openpipe:${fineTune.slug}`,
      baseModel: fineTune.baseModel,
      fineTuneModelLink,
    }),
  );

  await sendEmail({
    to: creator.email,
    subject: "Fine-tuned model trained successfully! 🚀",
    body: emailBody,
  });
};
