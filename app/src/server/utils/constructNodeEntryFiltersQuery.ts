import { type z } from "zod";
import { type Expression, type SqlBool, sql, type WhereInterface } from "kysely";

import { kysely } from "~/server/db";
import type { NodeEntry, DB } from "~/types/kysely-codegen.types";
import { GeneralFiltersDefaultFields, type filtersSchema } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

const BASE_QUERY = kysely.selectFrom("NodeEntry as ne");

export const constructNodeEntryFiltersQuery = ({
  filters,
  datasetNodeId,
  baseQuery = BASE_QUERY,
}: {
  filters: z.infer<typeof filtersSchema>;
  datasetNodeId: string;
  baseQuery?: WhereInterface<
    DB & {
      ne: NodeEntry;
    },
    "ne"
  >;
}) => {
  let updatedBaseQuery = (baseQuery as typeof BASE_QUERY)
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
    .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [eb("ne.nodeId", "=", datasetNodeId)];

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

    updatedBaseQuery = updatedBaseQuery.where(filterExpression(sql`ne."split"`));
  }

  const importFilters = filters.filter(
    (filter) => filter.field === GeneralFiltersDefaultFields.Source,
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
