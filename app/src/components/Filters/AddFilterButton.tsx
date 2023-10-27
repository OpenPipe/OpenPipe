import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { useFilters } from "./useFilters";
import { comparators } from "~/types/shared.types";

const AddFilterButton = ({ filterOptions }: { filterOptions: string[] }) => {
  const addFilter = useFilters().addFilter;

  return (
    <HStack
      as={Button}
      variant="ghost"
      onClick={() =>
        addFilter({
          id: Date.now().toString(),
          field: filterOptions[0] as string,
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
