import { type z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";

import { kysely } from "~/server/db";
import { GeneralFiltersDefaultFields, type filtersSchema } from "~/types/shared.types";
import { textComparatorToSqlExpression } from "./comparatorToSqlExpression";

export const constructNodeEntryFiltersQuery = ({
  filters,
  nodeId,
}: {
  filters: z.infer<typeof filtersSchema>;
  nodeId: string;
}) => {
  let updatedBaseQuery = kysely
    .with("dc", (eb) =>
      eb.selectFrom("DataChannel").where("destinationId", "=", nodeId).select("id"),
    )
    .selectFrom("dc")
    .innerJoin("NodeEntry as ne", (join) => join.onRef("ne.dataChannelId", "=", "dc.id"))
    // leftJoin to avoid unnecessary lookups when we don't filter by input/output
    .leftJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
    .leftJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [];

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
