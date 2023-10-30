import { type z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";

import { kysely } from "~/server/db";
import { EVALUATION_FILTERS_OUTPUT_APPENDIX, type filtersSchema } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./constructLoggedCallFiltersQuery";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";

export const constructEvaluationFiltersQuery = (
  filters: z.infer<typeof filtersSchema>,
  datasetId: string,
) => {
  const baseQuery = kysely.selectFrom("DatasetEntry as de").where((eb) => {
    const wheres: Expression<SqlBool>[] = [
      eb("de.datasetId", "=", datasetId),
      eb("de.outdated", "=", false),
      eb("de.type", "=", "TEST"),
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
      if (filter.field === EvaluationFiltersDefaultFields.OriginalOutput) {
        wheres.push(filterExpression(sql.raw(`de."output"::text`)));
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
    const tableAlias = `te${i}`;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator,
      filter.value as string,
    );

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

  return updatedBaseQuery;
};
