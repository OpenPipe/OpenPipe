import { VStack, HStack, Text } from "@chakra-ui/react";

import FineTuneButton from "./FineTuneButton";
import UploadDataButton from "./UploadDataButton";
import DatasetEntryTable from "./DatasetEntriesTable/DatasetEntryTable";
import DatasetEntryPaginator from "./DatasetEntryPaginator";
import GeneralFilters from "./GeneralFilters";
import { useFilters } from "~/components/Filters/useFilters";
import RelabelButton from "./RelabelButton";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";
import { useNodeEntries } from "~/utils/hooks";

const General = () => {
  const filtersShown = useFilters().filtersShown;
  const filtersApplied = useFilters().filters.length > 0;

  const matchingCount = useNodeEntries().data?.matchingCount;

  return (
    <VStack pb={8} px={8} alignItems="flex-start" spacing={4} w="full">
      <HStack w="full" justifyContent="flex-end">
        <FineTuneButton />
        <UploadDataButton />
        <ToggleFiltersButton />
        <RelabelButton />
      </HStack>
      {filtersShown && <GeneralFilters pb={8} />}
      <Text fontWeight="bold" fontSize="lg">
        {filtersApplied && "Matching "}Dataset Entries{" "}
        {matchingCount ? `(${matchingCount.toLocaleString()})` : ""}
      </Text>
      <DatasetEntryTable />
      <DatasetEntryPaginator />
    </VStack>
  );
};

export default General;
