import { type z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";

import { kysely } from "~/server/db";
import { EVALUATION_FILTERS_OUTPUT_APPENDIX, type filtersSchema } from "~/types/shared.types";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

export const constructEvaluationFiltersQuery = ({
  filters,
  nodeId,
}: {
  filters: z.infer<typeof filtersSchema>;
  nodeId: string;
}) => {
  const baseQuery = kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
    .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [
        eb("ne.nodeId", "=", nodeId),
        eb("ne.status", "=", "PROCESSED"),
        eb("ne.split", "=", "TEST"),
      ];

      for (const filter of filters) {
        if (!filter.value) continue;
        const filterExpression = textComparatorToSqlExpression(
          filter.comparator,
          filter.value as string,
        );

        if (filter.field === EvaluationFiltersDefaultFields.Input) {
          wheres.push(filterExpression(sql.raw(`dei."messages"::text`)));
        }
        if (filter.field === EvaluationFiltersDefaultFields.DatasetOutput) {
          wheres.push(filterExpression(sql.raw(`deo."output"::text`)));
        }
      }

      return eb.and(wheres);
    });

  const modelOutputFilters = filters
    .filter((filter) => filter.field.endsWith(EVALUATION_FILTERS_OUTPUT_APPENDIX))
    .map(({ field, ...rest }) => {
      return {
        field: field.replace(EVALUATION_FILTERS_OUTPUT_APPENDIX, ""),
        ...rest,
      };
    });

  let updatedBaseQuery = baseQuery;

  for (let i = 0; i < modelOutputFilters.length; i++) {
    const filter = modelOutputFilters[i];
    if (!filter?.value) continue;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator,
      filter.value as string,
    );

    const tableAlias = `te${i}`;
    updatedBaseQuery = updatedBaseQuery
      .leftJoin(`NewFineTuneTestingEntry as ${tableAlias}`, (join) =>
        join
          .onRef("ne.inputHash", "=", `${tableAlias}.inputHash`)
          .on(`${tableAlias}.modelId`, "=", filter.field),
      )
      .where(
        filterExpression(sql.raw(`${tableAlias}.output::text`)),
      ) as unknown as typeof baseQuery;
  }

  // Add select filters
  const selectFilters = filters.filter(
    (filter) => filter.field === EvaluationFiltersDefaultFields.EvalApplied,
  );

  for (let i = 0; i < selectFilters.length; i++) {
    const filter = selectFilters[i];
    if (!filter?.value) continue;

    updatedBaseQuery = updatedBaseQuery.where((eb) => {
      const wheres: Expression<SqlBool>[] = [];

      if (filter.field === EvaluationFiltersDefaultFields.EvalApplied) {
        const existsClause = eb.exists(
          eb
            .selectFrom("DatasetEvalNodeEntry as dene")
            .whereRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
            .innerJoin("DatasetEval as eval", "eval.id", "dene.datasetEvalId")
            .where("eval.id", "=", filter.value as string),
        );
        wheres.push(filter.comparator === "=" ? existsClause : eb.not(existsClause));
      }

      return eb.and(wheres);
    }) as unknown as typeof baseQuery;
  }

  return updatedBaseQuery;
};
