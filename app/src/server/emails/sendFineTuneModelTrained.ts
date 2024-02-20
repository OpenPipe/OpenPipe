import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import FineTuneModelTrained from "./templates/FineTuneModelTrained";

export const sendFineTuneModelTrained = async (
  fineTuneModelName: string,
  fineTuneId: string,
  baseModel: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}`;
  const fineTuneModelLink = `${projectLink}/fine-tunes/${fineTuneId}`;

  const emailBody = render(
    FineTuneModelTrained({
      fineTuneModelName,
      baseModel,
      fineTuneModelLink,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: "Fine-tune model trained successfully! 🚀",
    body: emailBody,
  });
};
