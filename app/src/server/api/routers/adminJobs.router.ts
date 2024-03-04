import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";

export const adminJobsRouter = createTRPCRouter({
  list: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    await requireIsAdmin(ctx);

    return await kysely
      .selectFrom("graphile_worker._private_jobs")
      .limit(100)
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
  }),
});
