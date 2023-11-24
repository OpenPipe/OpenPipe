import {
  type comparators,
  selectComparators,
  dateComparators,
  textComparators,
  type AtLeastOne,
} from "~/types/shared.types";

export type FilterTypeType = "text" | "date" | "select";

export type FilterOptionType = {
  field: string;
  type?: FilterTypeType;
  options?: FilterSelectOptionType[];
};

export type FilterSelectOptionType = {
  value: string;
  label: string;
};

export interface FilterDataType {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string | [number, number];
}

export const comparatorsForFilterType = (
  filterType?: FilterTypeType,
): AtLeastOne<(typeof comparators)[number]> => {
  if (filterType === "select") return selectComparators;
  if (filterType === "date") return dateComparators;
  return textComparators;
};
