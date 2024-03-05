import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { useFilters } from "./useFilters";
import { type AtLeastOne, comparators } from "~/types/shared.types";
import { type FilterOption } from "./types";

const AddFilterButton = ({
  filterOptions,
  urlKey,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  urlKey?: string;
}) => {
  const addFilter = useFilters({ urlKey }).addFilter;

  return (
    <HStack
      as={Button}
      variant="ghost"
      onClick={() =>
        addFilter({
          id: Date.now().toString(),
          field: filterOptions[0].field,
          comparator: comparators[0],
          value: "",
        })
      }
      spacing={0}
      fontSize="sm"
    >
      <Icon as={BsPlus} boxSize={5} />
      <Text>Add Filter</Text>
    </HStack>
  );
};

export default AddFilterButton;
