import { VStack, HStack } from "@chakra-ui/react";

import DeleteButton from "./DeleteButton";
import FineTuneButton from "./FineTuneButton";
import UploadDataButton from "./UploadDataButton";
import DatasetEntriesTable from "./DatasetEntriesTable/DatasetEntriesTable";
import DatasetEntryPaginator from "./DatasetEntryPaginator";
import GeneralFilters from "./GeneralFilters";
import { useFilters } from "~/components/Filters/useFilters";
import RelabelButton from "./RelabelButton";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";

const General = () => {
  const filtersShown = useFilters().filtersShown;

  return (
    <VStack pb={8} px={8} alignItems="flex-start" spacing={4} w="full">
      <HStack w="full" justifyContent="flex-end">
        <FineTuneButton />
        <UploadDataButton />
        <ToggleFiltersButton />
        <RelabelButton />
        <DeleteButton />
      </HStack>
      {filtersShown && <GeneralFilters />}
      <DatasetEntriesTable />
      <DatasetEntryPaginator />
    </VStack>
  );
};

export default General;
