import { VStack, HStack, Text } from "@chakra-ui/react";

import FineTuneButton from "./FineTuneButton";
import UploadDataButton from "./UploadDataButton";
import DatasetEntriesTable from "./DatasetEntriesTable";
import DatasetEntryPaginator from "~/components/nodeEntries/NodeEntriesTable/NodeEntriesPaginator";
import GeneralFilters from "./GeneralFilters";
import { useFilters } from "~/components/Filters/useFilters";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";
import { useNodeEntries, useDataset } from "~/utils/hooks";

const General = () => {
  const filtersShown = useFilters().filtersShown;
  const filtersApplied = useFilters().filters.length > 0;

  const dataset = useDataset().data;

  const matchingCount = useNodeEntries({ nodeId: dataset?.nodeId }).data?.matchingCount;

  return (
    <VStack pb={8} px={8} alignItems="flex-start" spacing={4} w="full">
      <HStack w="full" justifyContent="flex-end">
        <FineTuneButton />
        <UploadDataButton />
        <ToggleFiltersButton />
      </HStack>
      {filtersShown && <GeneralFilters pb={8} />}
      <Text fontWeight="bold" fontSize="lg">
        {filtersApplied && "Matching "}Dataset Entries{" "}
        {matchingCount ? `(${matchingCount.toLocaleString()})` : ""}
      </Text>
      <DatasetEntriesTable />
      <DatasetEntryPaginator nodeId={dataset?.nodeId} />
    </VStack>
  );
};

export default General;
