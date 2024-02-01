import { type z } from "zod";
import { type Expression, type SqlBool, sql, type ExpressionBuilder } from "kysely";

import { kysely } from "~/server/db";
import { type DB } from "~/types/kysely-codegen.types";
import { GeneralFiltersDefaultFields, type filtersSchema } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

export const constructNodeDataFiltersQuery = ({
  filters,
  datasetNodeId,
  ftteEB,
}: {
  filters: z.infer<typeof filtersSchema>;
  datasetNodeId: string;
  ftteEB?: ExpressionBuilder<DB, "FineTuneTrainingEntry">;
}) => {
  const queryBuilder = (ftteEB ?? kysely) as typeof kysely;
  const baseQuery = queryBuilder
    .selectFrom("NodeData as nd")
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
    .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.outputHash")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [
        eb("nd.nodeId", "=", datasetNodeId),
        eb("nd.status", "=", "PROCESSED"),
      ];

      for (const filter of filters) {
        if (!filter.value) continue;
        const filterExpression = textComparatorToSqlExpression(
          filter.comparator,
          filter.value as string,
        );

        if (filter.field === GeneralFiltersDefaultFields.Input) {
          wheres.push(filterExpression(sql.raw(`dei."messages"::text`)));
        }
        if (filter.field === GeneralFiltersDefaultFields.Output) {
          wheres.push(filterExpression(sql.raw(`deo."output"::text`)));
        }
      }

      return eb.and(wheres);
    });

  let updatedBaseQuery = baseQuery;

  const splitFilters = filters.filter(
    (filter) => filter.field === GeneralFiltersDefaultFields.Split,
  );

  for (let i = 0; i < splitFilters.length; i++) {
    const filter = splitFilters[i];
    if (!filter?.value) continue;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator,
      filter.value as string,
    );

    updatedBaseQuery = updatedBaseQuery.where(filterExpression(sql.raw(`nd."split"`)));
  }

  return updatedBaseQuery;
};
