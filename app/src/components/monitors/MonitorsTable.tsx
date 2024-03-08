import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";

import { api } from "~/utils/api";
import dayjs from "~/utils/dayjs";
import { useSelectedProject } from "~/utils/hooks";

import { ProjectLink } from "../ProjectLink";

const MonitorsTable = () => {
  const project = useSelectedProject().data;
  const monitors = api.monitors.list.useQuery(
    {
      projectId: project?.id as string,
    },
    { enabled: !!project?.id },
  ).data;

  if (!monitors) return null;

  return (
    <Card width="100%" overflowX="auto">
      {monitors.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Created At</Th>
              <Th>Entries</Th>
              <Th>Datasets</Th>
            </Tr>
          </Thead>
          <Tbody>
            {monitors.map((monitor) => {
              return (
                <Tr key={monitor.id}>
                  <Td>
                    <ProjectLink href={{ pathname: "/monitors/[id]", query: { id: monitor.id } }}>
                      <Text color="blue.600">{monitor.name}</Text>
                    </ProjectLink>
                  </Td>
                  <Td>{dayjs(monitor.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>{monitor.numEntries?.toLocaleString()}</Td>
                  <Td>{monitor.numDatasets.toLocaleString()}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      ) : (
        <VStack py={8}>
          <Icon as={FaTable} boxSize={16} color="gray.300" />
          <Text color="gray.500" textAlign="center" w="full" p={4}>
            This project has no monitors. Create a new one to get started.
          </Text>
        </VStack>
      )}
    </Card>
  );
};

export default MonitorsTable;
