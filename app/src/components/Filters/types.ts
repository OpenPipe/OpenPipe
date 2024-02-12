import {
  type comparators,
  selectComparators,
  dateComparators,
  textComparators,
  type AtLeastOne,
} from "~/types/shared.types";

export type FilterType = "text" | "date" | "select";

export type TextFilterOption = {
  type: "text";
  field: string;
  label?: string;
};

export type DateFilterOption = {
  type: "date";
  field: string;
  label?: string;
};

export type SelectFilterOption = {
  type: "select";
  field: string;
  label?: string;
  options: SelectFilterSelectOption[];
};

export type FilterOption = TextFilterOption | DateFilterOption | SelectFilterOption;

export type SelectFilterSelectOption = {
  value: string;
  label?: string;
};

export interface FilterData {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string | [number, number];
}

export const comparatorsForFilterType = (
  filterType: FilterType,
): AtLeastOne<(typeof comparators)[number]> => {
  if (filterType === "select") return selectComparators;
  if (filterType === "date") return dateComparators;
  return textComparators;
};
