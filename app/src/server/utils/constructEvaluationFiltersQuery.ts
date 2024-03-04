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
    .innerJoin("DataChannel as dc", (join) => join.onRef("dc.id", "=", "ne.dataChannelId"))
    .where("dc.destinationId", "=", nodeId)
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [
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
      .innerJoin(`FineTuneTestingEntry as ${tableAlias}`, (join) =>
        join
          .onRef("ne.inputHash", "=", `${tableAlias}.inputHash`)
          .on(`${tableAlias}.modelId`, "=", filter.field),
      )
      .where(
        filterExpression(sql.raw(`${tableAlias}.output::text`)),
      ) as unknown as typeof baseQuery;
  }

  // Add select filters
  const evalAppliedFilters = filters.filter(
    (filter) => filter.field === EvaluationFiltersDefaultFields.EvalApplied,
  );

  for (let i = 0; i < evalAppliedFilters.length; i++) {
    const filter = evalAppliedFilters[i];
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

  const importFilters = filters.filter(
    (filter) => filter.field === EvaluationFiltersDefaultFields.Source,
  );

  for (let i = 0; i < importFilters.length; i++) {
    const filter = importFilters[i];
    if (!filter?.value) continue;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator === "=" ? "CONTAINS" : "NOT_CONTAINS",
      filter.value as string,
    );

    updatedBaseQuery = updatedBaseQuery.where(filterExpression(sql`ne."persistentId"`));
  }

  return updatedBaseQuery;
};
