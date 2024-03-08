import { VStack } from "@chakra-ui/react";

import DatasetDangerZone from "./DatasetDangerZone";
import PruningRulesEditor from "./PruningRulesEditor";

const Settings = () => {
  return (
    <VStack spacing={8} px={8} pb={8}>
      <PruningRulesEditor />
      <DatasetDangerZone />
    </VStack>
  );
};

export default Settings;
