import { kysely } from "~/server/db";
import defineTask from "../defineTask";
import { processNode } from "./processNode.task";

export const feedMonitors = defineTask({
  id: "feedMonitors",
  handler: async () => {
    const monitors = await kysely
      .selectFrom("Node")
      .where("type", "=", "Monitor")
      .select(["id"])
      .execute();

    for (const monitor of monitors) {
      await processNode.enqueue({
        nodeId: monitor.id,
        nodeType: "Monitor",
      });
    }
  },
});
