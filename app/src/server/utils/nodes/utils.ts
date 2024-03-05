import { kysely } from "~/server/db";

export const generatePersistentId = ({
  creationTime,
  key,
  nodeId,
}: {
  creationTime: Date;
  key: string;
  nodeId: string;
}) => `${new Date(creationTime).toISOString()}_${key}_${nodeId}`;

export const creationTimeFromPersistentId = (persistentId: string) => {
  const [creationTime] = persistentId.split("_");

  if (!creationTime) {
    throw new Error("Invalid persistentId");
  }

  return new Date(creationTime);
};

export const printNodeEntries = async (nodeId: string) => {
  const nodeEntries = await kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DataChannel as dc", (join) =>
      join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", nodeId),
    )
    .selectAll("ne")
    .execute();
  console.log(nodeEntries);
};
