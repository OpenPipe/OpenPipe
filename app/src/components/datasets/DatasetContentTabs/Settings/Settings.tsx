import { VStack } from "@chakra-ui/react";

import PruningRulesEditor from "./PruningRulesEditor";
import DatasetDangerZone from "./DatasetDangerZone";

const Settings = () => {
  return (
    <VStack spacing={8} px={8} pb={8}>
      <PruningRulesEditor />
      <DatasetDangerZone />
    </VStack>
  );
};

export default Settings;
