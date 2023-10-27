import { type z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";

import { kysely } from "~/server/db";
import { type filtersSchema } from "~/types/shared.types";
import { comparatorToSqlExpression } from "./constructLoggedCallFiltersQuery";

export const constructTestDatasetEntryFiltersQuery = (
  filters: z.infer<typeof filtersSchema>,
  datasetId: string,
) => {
  const baseQuery = kysely
    .selectFrom("DatasetEntry as de")
    .leftJoin("FineTuneTestingEntry as te", "de.id", "te.datasetEntryId")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [
        eb("de.datasetId", "=", datasetId),
        eb("de.outdated", "=", false),
        eb("de.type", "=", "TEST"),
      ];

      for (const filter of filters) {
        if (!filter.value) continue;
        const filterExpression = comparatorToSqlExpression(filter.comparator, filter.value);

        if (filter.field === "Input") {
          wheres.push(filterExpression(sql.raw(`de."messages"::text`)));
        }
        if (filter.field === "Original Output") {
          wheres.push(filterExpression(sql.raw(`de."output"::text`)));
        }
      }

      return eb.and(wheres);
    });

  return baseQuery;
};
