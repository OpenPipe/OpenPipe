import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { comparators } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { useFilterableFields } from "~/utils/hooks";

const AddFilterButton = () => {
  const filterableFields = useFilterableFields().data;

  const addFilter = useAppStore((s) => s.logFilters.addFilter);

  if (!filterableFields || !filterableFields.length || !comparators || !comparators.length)
    return null;

  return (
    <HStack
      as={Button}
      variant="ghost"
      fontWeight="normal"
      onClick={() =>
        addFilter({ field: filterableFields[0] as string, comparator: comparators[0] })
      }
    >
      <Icon as={BsPlus} />
      <Text>Add Filter</Text>
    </HStack>
  );
};

export default AddFilterButton;
