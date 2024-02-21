import { type NextApiRequest, type NextApiResponse } from "next";
import Stripe from "stripe";
import { prisma } from "~/server/db";
import { env } from "~/env.mjs";
import { captureException } from "@sentry/node";
import { sendPaymentSuccessful } from "~/server/emails/sendPaymentSuccessful";
import { sendPaymentFailed } from "~/server/emails/sendPaymentFailed";
import { sendToOwner } from "~/server/emails/sendToOwner";

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "");
const endpointSecret = env.STRIPE_WEBHOOK_SECRET ?? "";

// Stripe needs raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

const readRequestBody = (req: NextApiRequest): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", (err) => reject(err));
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const rawBody = await readRequestBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", endpointSecret);
  } catch {
    return res.status(400).send(`Webhook Error`);
  }

  let invoiceId;

  switch (event.type) {
    case "charge.succeeded":
      invoiceId = event.data.object.metadata.invoiceId;

      if (invoiceId) {
        await prisma.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });

        await sendPaymentNotification(invoiceId, "SUCCESS");
      }
      break;

    case "charge.failed":
      invoiceId = event.data.object.metadata.invoiceId;

      if (invoiceId) {
        await prisma.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: "UNPAID",
            paidAt: null,
          },
        });

        await sendPaymentNotification(invoiceId, "FAILURE");
      }
      break;

    case "charge.expired":
      invoiceId = event.data.object.metadata.invoiceId;

      if (invoiceId) {
        await prisma.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: "UNPAID",
            paidAt: null,
          },
        });

        await sendPaymentNotification(invoiceId, "FAILURE");
      }
      break;
    case "payment_intent.succeeded":
      invoiceId = event.data.object.metadata.invoiceId;

      if (invoiceId) {
        await prisma.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });

        await sendPaymentNotification(invoiceId, "SUCCESS");
      }
      break;
  }

  res.json({ received: true });
};

export default handler;

async function sendPaymentNotification(
  invoiceId: string | undefined,
  result: "SUCCESS" | "FAILURE",
) {
  try {
    const invoice = await prisma.invoice.findFirstOrThrow({
      where: {
        id: invoiceId,
      },
    });

    const project = await prisma.project.findFirstOrThrow({
      where: {
        id: invoice?.projectId,
      },
    });

    if (result === "SUCCESS") {
      await sendToOwner(invoice.projectId, (email: string) =>
        sendPaymentSuccessful(
          invoice.id,
          Number(invoice.amount),
          invoice.description,
          invoice.billingPeriod || "",
          project.name,
          project.slug,
          email,
        ),
      );
    }

    if (result === "FAILURE") {
      await sendToOwner(invoice.projectId, (email: string) =>
        sendPaymentFailed(
          invoice.id,
          Number(invoice.amount),
          invoice.description,
          invoice.billingPeriod || "",
          project.name,
          project.slug,
          email,
        ),
      );
    }
  } catch (e) {
    captureException(e);
  }
}
