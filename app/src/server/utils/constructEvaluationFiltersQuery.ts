import { type z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";

import { kysely } from "~/server/db";
import { EVALUATION_FILTERS_OUTPUT_APPENDIX, type filtersSchema } from "~/types/shared.types";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

export const constructEvaluationFiltersQuery = (
  filters: z.infer<typeof filtersSchema>,
  datasetId: string,
) => {
  const baseQuery = kysely.selectFrom("DatasetEntry as de").where((eb) => {
    const wheres: Expression<SqlBool>[] = [
      eb("de.datasetId", "=", datasetId),
      eb("de.outdated", "=", false),
      eb("de.split", "=", "TEST"),
    ];

    for (const filter of filters) {
      if (!filter.value) continue;
      const filterExpression = textComparatorToSqlExpression(
        filter.comparator,
        filter.value as string,
      );

      if (filter.field === EvaluationFiltersDefaultFields.Input) {
        wheres.push(filterExpression(sql.raw(`de."messages"::text`)));
      }
      if (filter.field === EvaluationFiltersDefaultFields.DatasetOutput) {
        wheres.push(filterExpression(sql.raw(`de."output"::text`)));
      }
      if (filter.field === EvaluationFiltersDefaultFields.ImportId) {
        wheres.push(filterExpression(sql.raw(`de."importId"`)));
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
      .leftJoin(`FineTuneTestingEntry as ${tableAlias}`, (join) =>
        join
          .onRef("de.id", "=", `${tableAlias}.datasetEntryId`)
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
            .selectFrom("DatasetEvalDatasetEntry as dede")
            .whereRef("de.id", "=", "dede.datasetEntryId")
            .innerJoin("DatasetEval as eval", "eval.id", "dede.datasetEvalId")
            .where("eval.id", "=", filter.value as string),
        );
        wheres.push(filter.comparator === "=" ? existsClause : eb.not(existsClause));
      }

      return eb.and(wheres);
    }) as unknown as typeof baseQuery;
  }

  return updatedBaseQuery;
};
