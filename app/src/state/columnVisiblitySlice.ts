import { type SliceCreator } from "./store";

export const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

export const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"] as const;

export enum StaticColumnKeys {
  SENT_AT = "sentAt",
  MODEL = "model",
  DURATION = "duration",
  INPUT_TOKENS = "inputTokens",
  OUTPUT_TOKENS = "outputTokens",
  STATUS_CODE = "statusCode",
}

export type ColumnVisibilitySlice = {
  hiddenColumns: Set<string>;
  toggleColumnVisibility: (columnKey: string) => void;
  showAllColumns: () => void;
  hideColumns: (columnKeys: string[]) => void;
};

export const createColumnVisibilitySlice: SliceCreator<ColumnVisibilitySlice> = (set, get) => ({
  hiddenColumns: new Set(),
  allColumns: new Set(),
  toggleColumnVisibility: (columnKey: string) =>
    set((state) => {
      if (state.columnVisibility.hiddenColumns.has(columnKey)) {
        state.columnVisibility.hiddenColumns.delete(columnKey);
      } else {
        state.columnVisibility.hiddenColumns.add(columnKey);
      }
    }),
  showAllColumns: () =>
    set((state) => {
      state.columnVisibility.hiddenColumns = new Set();
    }),
  hideColumns: (columnKeys: string[]) =>
    set((state) => {
      state.columnVisibility.hiddenColumns = new Set(columnKeys);
    }),
});
