import {
  Card,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  VStack,
  Icon,
  Text,
  Skeleton,
} from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";

import dayjs from "~/utils/dayjs";
import { ProjectLink } from "../ProjectLink";
import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";

const MonitorsTable = () => {
  const project = useSelectedProject().data;
  const { data: monitors, isLoading } = api.monitors.list.useQuery(
    {
      projectId: project?.id as string,
    },
    { enabled: !!project?.id },
  );

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton isLoaded={!isLoading}>
        {monitors?.length ? (
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
      </Skeleton>
    </Card>
  );
};

export default MonitorsTable;
