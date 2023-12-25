import { type z } from "zod";
import { type Expression, type SqlBool, sql, type ExpressionBuilder } from "kysely";

import { kysely } from "~/server/db";
import { type DB } from "~/types/kysely-codegen.types";
import { GeneralFiltersDefaultFields, type filtersSchema } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

export const constructDatasetEntryFiltersQuery = (
  filters: z.infer<typeof filtersSchema>,
  datasetId: string,
  ftteEB?: ExpressionBuilder<DB, "FineTuneTrainingEntry">,
) => {
  const queryBuilder = (ftteEB ?? kysely) as typeof kysely;
  const baseQuery = queryBuilder.selectFrom("DatasetEntry as de").where((eb) => {
    const wheres: Expression<SqlBool>[] = [
      eb("de.datasetId", "=", datasetId),
      eb("de.outdated", "=", false),
    ];

    for (const filter of filters) {
      if (!filter.value) continue;
      const filterExpression = textComparatorToSqlExpression(
        filter.comparator,
        filter.value as string,
      );

      if (filter.field === GeneralFiltersDefaultFields.Input) {
        wheres.push(filterExpression(sql.raw(`de."messages"::text`)));
      }
      if (filter.field === GeneralFiltersDefaultFields.Output) {
        wheres.push(filterExpression(sql.raw(`de."output"::text`)));
      }
      if (filter.field === GeneralFiltersDefaultFields.ImportId) {
        wheres.push(filterExpression(sql.raw(`de."importId"`)));
      }
    }

    return eb.and(wheres);
  });

  let updatedBaseQuery = baseQuery;

  const relabelBatchIdFilters = filters.filter(
    (filter) => filter.field === GeneralFiltersDefaultFields.RelabelBatchId,
  );

  for (let i = 0; i < relabelBatchIdFilters.length; i++) {
    const filter = relabelBatchIdFilters[i];
    if (!filter?.value) continue;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator,
      filter.value as string,
    );

    const tableAlias = `rr${i}`;

    updatedBaseQuery = updatedBaseQuery
      .leftJoin(`RelabelRequest as ${tableAlias}`, (join) =>
        join.on(
          sql.raw('de."persistentId"'),
          "=",
          sql.raw(`${tableAlias}."datasetEntryPersistentId"`),
        ),
      )
      .where(filterExpression(sql.raw(`${tableAlias}."batchId"`)))
      .groupBy("de.id") as unknown as typeof baseQuery;
  }

  return updatedBaseQuery;
};
