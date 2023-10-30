import { type comparators, dateComparators, textComparators } from "~/types/shared.types";

export type FilterTypeType = "text" | "date";

export type FilterOptionType = {
  field: string;
  type?: FilterTypeType;
};

export interface FilterDataType {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string | number[];
}

export const comparatorsForFilterType = (
  filterType?: FilterTypeType,
): readonly (typeof comparators)[number][] => {
  if (filterType === "date") return dateComparators;
  return textComparators;
};
