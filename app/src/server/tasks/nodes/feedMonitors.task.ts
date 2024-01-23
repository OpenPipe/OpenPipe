import { kysely } from "~/server/db";
import defineTask from "../defineTask";
import { processNode } from "./processNode.task";

export const feedMonitors = defineTask({
  id: "feedMonitors",
  handler: async () => {
    const projects = await kysely
      .selectFrom("Project")
      .where("isHidden", "=", false)
      .select(["id"])
      .execute();

    for (const project of projects) {
      // set all PENDING LoggedCalls to PROCESSING
      await kysely
        .updateTable("LoggedCall")
        .set({ processingStatus: "PROCESSING" })
        .where("projectId", "=", project.id)
        .where("processingStatus", "=", "PENDING")
        .execute();

      const projectMonitors = await kysely
        .selectFrom("Node")
        .where("projectId", "=", project.id)
        .where("type", "=", "Monitor")
        .select(["id"])
        .execute();

      for (const monitor of projectMonitors) {
        await kysely
          .insertInto("MonitorMatch")
          .columns(["monitorId", "loggedCallId"])
          .expression((eb) =>
            eb
              .selectFrom("LoggedCall")
              .select([eb.val(monitor.id).as("monitorId"), "id"])
              .where("processingStatus", "=", "PROCESSING"),
          )
          .onConflict((oc) => oc.columns(["monitorId", "loggedCallId"]).doNothing())
          .execute();
        await processNode.enqueue({
          nodeId: monitor.id,
          nodeType: "Monitor",
        });
      }

      await kysely
        .updateTable("LoggedCall")
        .set({ processingStatus: "PROCESSED" })
        .where("projectId", "=", project.id)
        .where("processingStatus", "=", "PROCESSING")
        .execute();
    }
  },
});
