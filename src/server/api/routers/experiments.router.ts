import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import dedent from "dedent";
import { generateNewCell } from "~/server/utils/generateNewCell";
import {
  canModifyExperiment,
  requireCanModifyExperiment,
  requireCanViewExperiment,
  requireNothing,
} from "~/utils/accessControl";
import userOrg from "~/server/utils/userOrg";

export const experimentsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Anyone can list experiments
    requireNothing(ctx);

    const experiments = await prisma.experiment.findMany({
      where: {
        organization: {
          OrganizationUser: {
            some: { userId: ctx.session.user.id },
          },
        },
      },
      orderBy: {
        sortIndex: "desc",
      },
    });

    // TODO: look for cleaner way to do this. Maybe aggregate?
    const experimentsWithCounts = await Promise.all(
      experiments.map(async (experiment) => {
        const visibleTestScenarioCount = await prisma.testScenario.count({
          where: {
            experimentId: experiment.id,
            visible: true,
          },
        });

        const visiblePromptVariantCount = await prisma.promptVariant.count({
          where: {
            experimentId: experiment.id,
            visible: true,
          },
        });

        return {
          ...experiment,
          testScenarioCount: visibleTestScenarioCount,
          promptVariantCount: visiblePromptVariantCount,
        };
      }),
    );

    return experimentsWithCounts;
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewExperiment(input.id, ctx);
    const experiment = await prisma.experiment.findFirstOrThrow({
      where: { id: input.id },
    });

    const canModify = ctx.session?.user.id
      ? await canModifyExperiment(experiment.id, ctx.session?.user.id)
      : false;

    return {
      ...experiment,
      access: {
        canView: true,
        canModify,
      },
    };
  }),

  create: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    // Anyone can create an experiment
    requireNothing(ctx);

    const maxSortIndex =
      (
        await prisma.experiment.aggregate({
          _max: {
            sortIndex: true,
          },
        })
      )._max?.sortIndex ?? 0;

    const exp = await prisma.experiment.create({
      data: {
        sortIndex: maxSortIndex + 1,
        label: `Experiment ${maxSortIndex + 1}`,
        organizationId: (await userOrg(ctx.session.user.id)).id,
      },
    });

    const [variant, _, scenario] = await prisma.$transaction([
      prisma.promptVariant.create({
        data: {
          experimentId: exp.id,
          label: "Prompt Variant 1",
          sortIndex: 0,
          // The interpolated $ is necessary until dedent incorporates
          // https://github.com/dmnd/dedent/pull/46
          constructFn: dedent`
          /**
           * Use Javascript to define an OpenAI chat completion
           * (https://platform.openai.com/docs/api-reference/chat/create) and
           * assign it to the \`prompt\` variable.
           *
           * You have access to the current scenario in the \`scenario\`
           * variable.
           */
          
          prompt = {
            model: "gpt-3.5-turbo-0613",
            stream: true,
            messages: [
              {
                role: "system",
                content: \`"Return 'this is output for the scenario "${"$"}{scenario.text}"'\`,
              },
            ],
          };`,
          model: "gpt-3.5-turbo-0613",
        },
      }),
      prisma.templateVariable.create({
        data: {
          experimentId: exp.id,
          label: "text",
        },
      }),
      prisma.testScenario.create({
        data: {
          experimentId: exp.id,
          variableValues: {
            text: "This is a test scenario.",
          },
        },
      }),
    ]);

    await generateNewCell(variant.id, scenario.id);

    return exp;
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ label: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.id, ctx);
      return await prisma.experiment.update({
        where: {
          id: input.id,
        },
        data: {
          label: input.updates.label,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.id, ctx);

      await prisma.experiment.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
