import { VStack, HStack, Button } from "@chakra-ui/react";

import DeleteButton from "~/components/datasets/DatasetContentTabs/General/DeleteButton";
import FineTuneButton from "./FineTuneButton";
import UploadDataButton from "./UploadDataButton";
import DatasetEntriesTable from "./DatasetEntriesTable/DatasetEntriesTable";
import DatasetEntryPaginator from "./DatasetEntryPaginator";
import { JsonParam, NumberParam, useQueryParam, withDefault } from "use-query-params";

const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

type FilterType = {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string;
};

const useFilters = () => {
  const [filters, setFilters] = useQueryParam<FilterType[]>("filters", withDefault(JsonParam, []));

  const addFilter = (filter: FilterType) => setFilters([...filters, filter]);
  const updateFilter = (filter: FilterType) =>
    setFilters(filters.map((f) => (f.id === filter.id ? filter : f)));

  const removeFilter = (filter: FilterType) =>
    setFilters(filters.filter((f) => f.id !== filter.id));

  return { filters, setFilters, addFilter, updateFilter, removeFilter };
};

const QueryParamsTest = () => {
  const [numberParam, setNumberParam] = useQueryParam("number", withDefault(NumberParam, 0));

  const filters = useFilters();

  console.log("filters are", filters.filters);

  return (
    <Button
      onClick={() => {
        setNumberParam(numberParam + 1);
        filters.addFilter({
          id: "1",
          field: "2",
          comparator: "=",
          value: "3",
        });
      }}
    >
      Click me {numberParam}
    </Button>
  );
};

const General = () => {
  return (
    <VStack pb={8} px={8} alignItems="flex-start" spacing={4} w="full">
      <HStack w="full" justifyContent="flex-end">
        <QueryParamsTest />
        <FineTuneButton />
        <UploadDataButton />
        <DeleteButton />
      </HStack>
      <DatasetEntriesTable />
      <DatasetEntryPaginator />
    </VStack>
  );
};

export default General;
