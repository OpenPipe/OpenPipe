import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { comparators, defaultFilterableFields } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";

const AddFilterButton = () => {
  const addFilter = useAppStore((s) => s.logFilters.addFilter);

  return (
    <HStack
      as={Button}
      variant="ghost"
      onClick={() =>
        addFilter({
          id: Date.now().toString(),
          field: defaultFilterableFields[0],
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
