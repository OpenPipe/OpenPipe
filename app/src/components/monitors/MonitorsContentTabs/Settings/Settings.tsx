import { VStack } from "@chakra-ui/react";

import MonitorDangerZone from "./MonitorDangerZone";

const Settings = () => {
  return (
    <VStack w="full" spacing={8} pb={8}>
      <MonitorDangerZone />
    </VStack>
  );
};

export default Settings;
