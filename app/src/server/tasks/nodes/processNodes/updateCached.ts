import { type Node } from "@prisma/client";
import { sql } from "kysely";

import { kysely } from "~/server/db";
import { processNodeProperties } from "./processNode.task";
import { type typedNode } from "~/server/utils/nodes/node.types";

export const updateCached = async ({
  node,
}: {
  node: ReturnType<typeof typedNode> & Pick<Node, "id" | "projectId" | "hash">;
}) => {
  const nodeProperties = processNodeProperties[node.type];

  if (nodeProperties.cacheMatchFields && nodeProperties.cacheWriteFields) {
    let processCachedQuery = kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("CachedProcessedEntry as cpne")
      .where((eb) => eb.or([eb("cpne.nodeHash", "=", node.hash), eb("cpne.nodeId", "=", node.id)]))
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PENDING");

    if (nodeProperties.cacheWriteFields.includes("outgoingDEIHash")) {
      processCachedQuery = processCachedQuery.set({
        inputHash: sql`"cpne"."outgoingDEIHash"`,
      });
    }
    if (nodeProperties.cacheWriteFields.includes("outgoingDEOHash")) {
      processCachedQuery = processCachedQuery.set({
        outputHash: sql`"cpne"."outgoingDEOHash"`,
        originalOutputHash: sql`"ne"."outputHash"`,
      });
    }
    if (nodeProperties.cacheWriteFields.includes("outgoingSplit")) {
      processCachedQuery = processCachedQuery.set({ split: sql`"cpne"."outgoingSplit"` });
    }
    if (nodeProperties.cacheMatchFields.includes("nodeEntryPersistentId")) {
      processCachedQuery = processCachedQuery.whereRef(
        "ne.persistentId",
        "=",
        "cpne.nodeEntryPersistentId",
      );
    }
    if (nodeProperties.cacheMatchFields.includes("incomingDEIHash")) {
      processCachedQuery = processCachedQuery.whereRef("ne.inputHash", "=", "cpne.incomingDEIHash");
    }
    if (nodeProperties.cacheMatchFields.includes("incomingDEOHash")) {
      processCachedQuery = processCachedQuery.whereRef(
        "ne.outputHash",
        "=",
        "cpne.incomingDEOHash",
      );
    }
    await processCachedQuery.execute();
  }
};
