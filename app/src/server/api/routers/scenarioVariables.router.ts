import { type TemplateVariable } from "@prisma/client";
import { sql } from "kysely";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";

export const scenarioVarsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ experimentId: z.string(), label: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.experimentId, ctx);

      // Make sure there isn't an existing variable with the same name
      const existingVariable = await prisma.templateVariable.findFirst({
        where: {
          experimentId: input.experimentId,
          label: input.label,
        },
      });
      if (existingVariable) {
        return error(`A variable named ${input.label} already exists.`);
      }

      await prisma.templateVariable.create({
        data: {
          experimentId: input.experimentId,
          label: input.label,
        },
      });

      return success();
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), label: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const templateVariable = await prisma.templateVariable.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyExperiment(templateVariable.experimentId, ctx);

      // Make sure there isn't an existing variable with the same name
      const existingVariable = await prisma.templateVariable.findFirst({
        where: {
          experimentId: templateVariable.experimentId,
          label: input.label,
        },
      });
      if (existingVariable) {
        return error(`A variable named ${input.label} already exists.`);
      }

      await renameTemplateVariable(templateVariable, input.label);
      return success();
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.templateVariable.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireCanModifyExperiment(experimentId, ctx);

      await prisma.templateVariable.delete({ where: { id: input.id } });
    }),

  list: publicProcedure
    .input(z.object({ experimentId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);
      return await prisma.templateVariable.findMany({
        where: {
          experimentId: input.experimentId,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          label: true,
        },
      });
    }),
});

export const renameTemplateVariable = async (
  templateVariable: TemplateVariable,
  newLabel: string,
) => {
  const { experimentId } = templateVariable;

  await kysely.transaction().execute(async (trx) => {
    await trx
      .updateTable("TemplateVariable")
      .set({
        label: newLabel,
      })
      .where("id", "=", templateVariable.id)
      .execute();

    await sql`
      CREATE TEMP TABLE "TempTestScenario" AS
      SELECT *
      FROM "TestScenario"
      WHERE "experimentId" = ${experimentId}

      -- Only copy the rows that actually have a value for the variable, no reason to churn the rest and simplifies the update.
      AND "variableValues"->${templateVariable.label} IS NOT NULL
      `.execute(trx);

    await sql`
      UPDATE "TempTestScenario"
      SET "variableValues" = jsonb_set(
        "variableValues",
        ${`{${newLabel}}`},
        "variableValues"->${templateVariable.label}
      ) - ${templateVariable.label},
      "updatedAt" = NOW(),
      "id" = uuid_generate_v4()
    `.execute(trx);

    // Print the contents of the temp table
    const results = await sql`SELECT * FROM "TempTestScenario"`.execute(trx);
    console.log(results.rows);

    await trx
      .updateTable("TestScenario")
      .set({
        visible: false,
      })
      .where("experimentId", "=", experimentId)
      .execute();

    await sql`
      INSERT INTO "TestScenario" (id, "variableValues", "uiId", visible, "sortIndex", "experimentId", "createdAt", "updatedAt")
      SELECT * FROM "TempTestScenario";
    `.execute(trx);
  });
};
