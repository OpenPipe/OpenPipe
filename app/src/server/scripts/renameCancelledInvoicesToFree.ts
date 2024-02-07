import { prisma } from "../db";

console.log("Doing: rename cancelled to free");

//Rename invoices with cancelled status to free
await prisma.invoice.updateMany({
  where: {
    status: "CANCELLED",
  },
  data: {
    status: "FREE",
  },
});
console.log("Done!");
