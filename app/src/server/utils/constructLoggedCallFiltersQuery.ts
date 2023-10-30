import { type z } from "zod";
import { type Expression, type SqlBool, sql, type RawBuilder } from "kysely";
import { kysely } from "~/server/db";
import {
  LoggedCallsFiltersDefaultFields,
  type filtersSchema,
  type comparators,
} from "~/types/shared.types";

// create comparator type based off of comparators
export const textComparatorToSqlExpression = (
  comparator: (typeof comparators)[number],
  value: string,
) => {
  return (reference: RawBuilder<unknown>): Expression<SqlBool> => {
    switch (comparator) {
      case "=":
        return sql`${reference} = ${value}`;
      case "!=":
        // Handle NULL values
        return sql`${reference} IS DISTINCT FROM ${value}`;
      case "CONTAINS":
        return sql`${reference} LIKE ${"%" + value + "%"}`;
      case "NOT_CONTAINS":
        return sql`(${reference} NOT LIKE ${"%" + value + "%"} OR ${reference} IS NULL)`;
      default:
        throw new Error("Unknown comparator");
    }
  };
};

export const dateComparatorToSqlExpression = (
  comparator: (typeof comparators)[number],
  value: number[],
) => {
  const [start, end] = value;
  let startDate: string;
  let endDate: string;
  try {
    startDate = new Date(start as number).toISOString();
    endDate = new Date(end as number).toISOString();
  } catch (e) {
    throw new Error("Failed to parse start and end dates");
  }
  return (reference: RawBuilder<unknown>): Expression<SqlBool> => {
    switch (comparator) {
      case "LAST 15M":
        return sql`${reference} > timezone('UTC', NOW()) - INTERVAL '15 minutes'`;
      case "LAST 24H":
        return sql`${reference} > timezone('UTC', NOW()) - INTERVAL '24 hours'`;
      case "LAST 7D":
        return sql`${reference} > timezone('UTC', NOW()) - INTERVAL '7 days'`;
      case "BEFORE":
        return sql`${reference} < ${startDate}`;
      case "AFTER":
        return sql`${reference} > ${startDate}`;
      case "RANGE":
        return sql`${reference} BETWEEN ${startDate} AND ${endDate}`;
      default:
        throw new Error("Unknown comparator");
    }
  };
};

export const constructLoggedCallFiltersQuery = (
  filters: z.infer<typeof filtersSchema>,
  projectId: string,
  selectionParams?: {
    defaultToSelected: boolean;
    selectedLogIds: string[];
    deselectedLogIds: string[];
  },
) => {
  const baseQuery = kysely
    .selectFrom("LoggedCall as lc")
    .leftJoin("LoggedCallModelResponse as lcmr", "lc.id", "lcmr.originalLoggedCallId")
    .where((eb) => {
      const wheres: Expression<SqlBool>[] = [eb("lc.projectId", "=", projectId)];

      console.log("filters", filters);

      const dateFilters = filters.filter(
        (filter) => filter.field === LoggedCallsFiltersDefaultFields.SentAt,
      );

      // Add date-related filters first
      for (const filter of dateFilters) {
        const filterExpression = dateComparatorToSqlExpression(
          filter.comparator,
          filter.value as number[],
        );

        if (filter.field === LoggedCallsFiltersDefaultFields.SentAt) {
          wheres.push(filterExpression(sql.raw(`lc."requestedAt"`)));
        }
      }

      for (const filter of filters) {
        if (!filter.value) continue;
        const filterExpression = textComparatorToSqlExpression(
          filter.comparator,
          filter.value as string,
        );

        if (filter.field === LoggedCallsFiltersDefaultFields.Request) {
          wheres.push(filterExpression(sql.raw(`lcmr."reqPayload"::text`)));
        }
        if (filter.field === LoggedCallsFiltersDefaultFields.Response) {
          wheres.push(filterExpression(sql.raw(`lcmr."respPayload"::text`)));
        }
        if (filter.field === LoggedCallsFiltersDefaultFields.Model) {
          wheres.push(filterExpression(sql.raw(`lc."model"`)));
        }
        if (filter.field === LoggedCallsFiltersDefaultFields.StatusCode) {
          wheres.push(filterExpression(sql.raw(`lcmr."statusCode"::text`)));
        }
      }

      return eb.and(wheres);
    });

  const tagFilters = filters.filter(
    (filter) =>
      !Object.values(LoggedCallsFiltersDefaultFields).includes(
        filter.field as LoggedCallsFiltersDefaultFields,
      ),
  );

  let updatedBaseQuery = baseQuery;

  for (let i = 0; i < tagFilters.length; i++) {
    const filter = tagFilters[i];
    if (!filter?.value) continue;
    const tableAlias = `lct${i}`;
    const filterExpression = textComparatorToSqlExpression(
      filter.comparator,
      filter.value as string,
    );

    updatedBaseQuery = updatedBaseQuery
      .leftJoin(`LoggedCallTag as ${tableAlias}`, (join) =>
        join
          .onRef("lc.id", "=", `${tableAlias}.loggedCallId`)
          .on(`${tableAlias}.name`, "=", filter.field),
      )
      .where(filterExpression(sql.raw(`${tableAlias}.value`))) as unknown as typeof baseQuery;
  }

  if (selectionParams) {
    if (selectionParams.defaultToSelected && selectionParams.deselectedLogIds.length) {
      updatedBaseQuery = updatedBaseQuery.where(({ eb, not }) =>
        not(eb("lc.id", "in", selectionParams.deselectedLogIds)),
      );
    } else if (!selectionParams.defaultToSelected && selectionParams.selectedLogIds.length) {
      updatedBaseQuery = updatedBaseQuery.where((eb) =>
        eb("lc.id", "in", selectionParams.selectedLogIds),
      );
    }
    updatedBaseQuery = updatedBaseQuery.where((eb) => eb("lcmr.statusCode", "=", 200));
  }

  return updatedBaseQuery;
};
