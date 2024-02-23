import { sql } from "kysely";
import { kysely } from "~/server/db";
import { v4 as uuidv4 } from "uuid";

export const recordOngoingRequestStart = async (projectId: string, record = true) => {
  if (!record) return;

  const requestId = await kysely
    .insertInto("OngoingRequest")
    .values({
      id: uuidv4(),
      projectId: projectId,
    })
    .returning(["id"])
    .executeTakeFirst();

  return requestId?.id;
};

export const recordOngoingRequestEnd = (id: string) => {
  kysely.deleteFrom("OngoingRequest").where("id", "=", id).execute();
};
