import { type Expression, type SqlBool, sql, type RawBuilder } from "kysely";

import { type comparators } from "~/types/shared.types";

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
  value: [number, number],
) => {
  const [start, end] = value;
  let startDate: string;
  let endDate: string;
  if (comparator === "BEFORE" || comparator === "AFTER" || comparator === "RANGE") {
    try {
      startDate = new Date(start).toISOString();
      endDate = new Date(end).toISOString();
    } catch (e) {
      throw new Error("Failed to parse start and end dates");
    }
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
