import { useEffect, useState } from "react";
import { Table, Thead, Tr, Th, Td, VStack } from "@chakra-ui/react";

import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import AppShell from "~/components/nav/AppShell";
import { useCopyToClipboard } from "~/utils/useCopyToClipboard";

// useful for debugging
const Nodes = () => {
  const project = useSelectedProject().data;

  const [refetchInterval, setRefetchInterval] = useState<number | undefined>(undefined);

  const nodes = api.projects.listProjectNodes.useQuery(
    { projectId: project?.id as string },
    { enabled: !!project?.id, refetchInterval },
  ).data;

  const anyPendingOrProcessingEntries = nodes?.some(
    (node) => node.numPendingEntries || node.numProcessingEntries,
  );

  useEffect(() => {
    if (anyPendingOrProcessingEntries) {
      setRefetchInterval(500);
    } else {
      setRefetchInterval(undefined);
    }
  }, [anyPendingOrProcessingEntries, setRefetchInterval]);

  const copyToClipboard = useCopyToClipboard();

  return (
    <AppShell title="Nodes">
      <VStack p={8}>
        <Table bgColor="white" borderWidth={1} borderColor="gray.300" borderRadius={8}>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Id</Th>
              <Th>Created At</Th>
              <Th>Pending</Th>
              <Th>Processing</Th>
              <Th>Processed</Th>
              <Th>Error</Th>
            </Tr>
          </Thead>
          {nodes?.map((node) => (
            <Tr key={node.id}>
              <Td>{node.name}</Td>
              <Td>{node.type}</Td>
              <Td cursor="pointer" onClick={() => void copyToClipboard(node.id)}>
                {node.id}
              </Td>
              <Td>{dayjs(node.createdAt).format("MM-D h:mm A")}</Td>
              <Td>{node.numPendingEntries}</Td>
              <Td>{node.numProcessingEntries}</Td>
              <Td>{node.numProcessedEntries}</Td>
              <Td>{node.numErrorEntries}</Td>
            </Tr>
          ))}
        </Table>
      </VStack>
    </AppShell>
  );
};

export default Nodes;
