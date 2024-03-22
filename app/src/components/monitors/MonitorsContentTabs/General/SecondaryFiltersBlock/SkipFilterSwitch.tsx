import { HStack, Switch, Text } from "@chakra-ui/react";

import { useMonitorFilters } from "../useMonitorFilters";

export const SkipFilterSwitch = () => {
  const { skipFilter, setSkipFilter } = useMonitorFilters();

  return (
    <HStack justifyContent="flex-end" spacing={2}>
      <Text fontSize="sm">Enabled</Text>
      <Switch
        isChecked={!skipFilter}
        onChange={() => setSkipFilter(!skipFilter)}
        colorScheme="blue"
      />
    </HStack>
  );
};
