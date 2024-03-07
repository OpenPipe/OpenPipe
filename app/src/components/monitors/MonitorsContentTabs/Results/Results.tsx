import { VStack } from "@chakra-ui/react";

import NodeEntriesTable from "~/components/NodeEntriesTable/NodeEntriesTable";
import { useMonitor } from "../../useMonitor";
import { useNodeEntries } from "~/utils/hooks";

const Results = () => {
  const monitor = useMonitor().data;

  const entries = useNodeEntries({ nodeId: monitor?.llmRelabel.id }).data?.entries;

  return (
    <VStack w="full">
      <NodeEntriesTable nodeId={monitor?.llmRelabel.id} entries={entries} />
    </VStack>
  );
};

export default Results;
