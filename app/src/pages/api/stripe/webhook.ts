import { type NextApiRequest, type NextApiResponse } from "next";
import Stripe from "stripe";
import { prisma } from "~/server/db";
import { env } from "~/env.mjs";
import { emailAdminsAboutPaymentFailure } from "~/server/utils/emails";

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

  switch (event.type) {
    case "charge.succeeded":
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata.invoiceId;

      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      break;

    case "charge.failed":
      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: "PENDING",
          paidAt: null,
        },
      });

      await notifyAdminsAboutFailure(invoiceId);

      break;

    case "charge.expired":
      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: "PENDING",
          paidAt: null,
        },
      });

      await notifyAdminsAboutFailure(invoiceId);

      break;
    case "payment_intent.succeeded":
      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      break;
  }

  res.json({ received: true });
};

export default handler;

async function notifyAdminsAboutFailure(invoiceId: string | undefined) {
  const project = await findProject(invoiceId);
  project && (await emailAdminsAboutPaymentFailure(project.id, project.name, project.slug));
}

async function findProject(invoiceId: string | undefined) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  return await prisma.project.findUnique({
    where: {
      id: invoice?.projectId,
    },
  });
}
