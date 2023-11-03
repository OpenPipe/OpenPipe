import { kysely, prisma } from "~/server/db";
import { sql } from "kysely";

console.log("correcting logged call model response status codes");

const notFoundResponses = await kysely
  .selectFrom("LoggedCallModelResponse as lcmr")
  .where(sql`lcmr."statusCode" = 200`)
  .where(sql`lcmr."respPayload"::text LIKE '%The model does not exist%'`)
  .where(sql`lcmr."respPayload"::text LIKE '%NOT_FOUND%'`)
  .select(["id"])
  .execute();

console.log(
  `setting ${notFoundResponses.length} not found responses with a current status code of 200 to a status code of 404`,
);

await prisma.loggedCallModelResponse.updateMany({
  where: {
    id: {
      in: notFoundResponses.map((response) => response.id),
    },
  },
  data: {
    statusCode: 404,
  },
});

console.log("finished with not found responses");

console.log("searching for bad responses with status code 200");

const badResponses = await kysely
  .selectFrom("LoggedCallModelResponse as lcmr")
  .where(sql`lcmr."statusCode" = 200`)
  .where(sql`lcmr."respPayload"::text NOT LIKE '%choices%'`)
  .select(["id"])
  .execute();

console.log(
  `setting ${badResponses.length} bad responses with a current status code of 200 to a status code of 400`,
);

await prisma.loggedCallModelResponse.updateMany({
  where: {
    id: {
      in: badResponses.map((response) => response.id),
    },
  },
  data: {
    statusCode: 400,
  },
});

console.log("done");
