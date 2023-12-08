import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "~/server/db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  await prisma.project.findFirst();

  res.status(200).json({ status: "OK" });
}
