import { NodeEntryStatus } from "@prisma/client";

import NodeEntriesTable from "~/components/nodeEntries/NodeEntriesTable/NodeEntriesTable";
import { useMonitor } from "../../useMonitor";
import { useNodeEntries } from "~/utils/hooks";
import { type FilterData } from "~/components/Filters/types";
import { type FilterOutput } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

export const addFilterOutcomeFilter = ({
  filters,
  filterOutcome,
}: {
  filters?: FilterData[];
  filterOutcome?: FilterOutput;
}) => {
  if (!filterOutcome) return filters ?? [];
  return [
    ...(filters ?? []),
    {
      id: "filter-outcome",
      field: GeneralFiltersDefaultFields.FilterOutcome,
      comparator: "=" as const,
      value: filterOutcome,
    },
  ];
};

const FilteredResultsTable = ({ filters }: { filters: FilterData[] }) => {
  const monitor = useMonitor().data;

  const entries = useNodeEntries({
    nodeId: monitor?.filter.id,
    filters,
    status: NodeEntryStatus.PROCESSED,
    defaultSortOrder: {
      field: "persistentId",
      order: "asc",
    },
  }).data?.entries;

  return <NodeEntriesTable nodeId={monitor?.filter.id} entries={entries} />;
};

export default FilteredResultsTable;
