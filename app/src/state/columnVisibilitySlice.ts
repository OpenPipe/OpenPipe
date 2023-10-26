import { type SliceCreator } from "./store";

export enum StaticColumnKeys {
  SENT_AT = "sentAt",
  MODEL = "model",
  DURATION = "duration",
  INPUT_TOKENS = "inputTokens",
  OUTPUT_TOKENS = "outputTokens",
  COST = "cost",
  STATUS_CODE = "statusCode",
}

export type ColumnVisibilitySlice = {
  visibleColumns: Set<string>;
  toggleColumnVisibility: (columnKey: string) => void;
  showAllColumns: (columnKeys: string[]) => void;
};

export const createColumnVisibilitySlice: SliceCreator<ColumnVisibilitySlice> = (set, get) => ({
  // initialize with all static columns visible
  visibleColumns: new Set(Object.values(StaticColumnKeys)),
  toggleColumnVisibility: (columnKey: string) =>
    set((state) => {
      if (state.columnVisibility.visibleColumns.has(columnKey)) {
        state.columnVisibility.visibleColumns.delete(columnKey);
      } else {
        state.columnVisibility.visibleColumns.add(columnKey);
      }
    }),
  showAllColumns: (columnKeys: string[]) =>
    set((state) => {
      state.columnVisibility.visibleColumns = new Set(columnKeys);
    }),
});
