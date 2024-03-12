import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type NodeEntryRow = RouterOutputs["nodeEntries"]["list"]["entries"][0];
export type SortableField = NonNullable<RouterInputs["nodeEntries"]["list"]["sortOrder"]>["field"];
