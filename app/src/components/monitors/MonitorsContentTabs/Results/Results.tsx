import { VStack } from "@chakra-ui/react";

import NodeEntriesTable from "~/components/nodeEntries/NodeEntriesTable/NodeEntriesTable";
import { useMonitor } from "../../useMonitor";
import { useNodeEntries } from "~/utils/hooks";
import NodeEntriesPaginator from "~/components/nodeEntries/NodeEntriesTable/NodeEntriesPaginator";

const Results = () => {
  const monitor = useMonitor().data;

  const entries = useNodeEntries({ nodeId: monitor?.llmRelabel.id }).data?.entries;

  return (
    <VStack w="full">
      <NodeEntriesTable nodeId={monitor?.llmRelabel.id} entries={entries} />
      <NodeEntriesPaginator nodeId={monitor?.llmRelabel.id} />
    </VStack>
  );
};

export default Results;
