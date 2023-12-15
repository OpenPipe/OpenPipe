import {
  Card,
  CardBody,
  HStack,
  Heading,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { DollarSign, Hash } from "lucide-react";
import Link from "next/link";

import UsageGraph from "~/components/dashboard/UsageGraph";
import AppShell from "~/components/nav/AppShell";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";

const numberWithDefault = (num: number | string | bigint | null, defaultValue = 0) =>
  Number(num ?? defaultValue);

export default function Usage() {
  const { data: selectedProject } = useSelectedProject();

  const stats = api.usage.stats.useQuery(
    { projectId: selectedProject?.id ?? "" },
    { enabled: !!selectedProject },
  );

  return (
    <AppShell title="Usage" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4}>
        <Text fontSize="2xl" fontWeight="bold">
          Usage
        </Text>
        <VStack margin="auto" spacing={4} align="stretch" w="full">
          <HStack gap={4} align="start">
            <Card flex={1}>
              <CardBody>
                <UsageGraph />
              </CardBody>
            </Card>
            <VStack spacing="4" width="300px" align="stretch">
              <Card>
                <CardBody>
                  <Stat>
                    <HStack>
                      <StatLabel flex={1}>Total Requests</StatLabel>
                      <Icon as={Hash} boxSize={4} color="gray.500" />
                    </HStack>
                    <StatNumber>
                      {stats.data?.totals?.numQueries
                        ? parseInt(stats.data?.totals?.numQueries.toString())?.toLocaleString()
                        : undefined}
                    </StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <HStack>
                      <StatLabel flex={1}>Total Spent</StatLabel>
                      <Icon as={DollarSign} boxSize={4} color="gray.500" />
                    </HStack>
                    <StatNumber>
                      ${parseFloat(stats.data?.totals?.cost?.toString() ?? "0").toFixed(3)}
                    </StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </VStack>
          </HStack>
          <Heading size="md" mt={4}>
            Models
          </Heading>
          <Card>
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Base Model</Th>
                  <Th isNumeric>Requests</Th>
                  <Th isNumeric>Input Tokens</Th>
                  <Th isNumeric>Output Tokens</Th>
                  <Th isNumeric>Spent</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stats.data?.fineTunes.map((model) => (
                  <Tr key={model.ftId}>
                    <Td>
                      <Link href={{ pathname: "/fine-tunes/[id]", query: { id: model.ftId } }}>
                        <Text color="blue.600">openpipe:{model.slug}</Text>
                      </Link>
                    </Td>
                    <Td>{modelInfo(model).name}</Td>
                    <Td isNumeric>{numberWithDefault(model.numQueries).toLocaleString()}</Td>
                    <Td isNumeric>{numberWithDefault(model.inputTokens).toLocaleString()}</Td>
                    <Td isNumeric>{numberWithDefault(model.outputTokens).toLocaleString()}</Td>
                    <Td isNumeric>{numberWithDefault(model.cost).toFixed(2)}</Td>
                  </Tr>
                )) ?? <Tr />}
              </Tbody>
            </Table>
          </Card>
        </VStack>
      </VStack>
    </AppShell>
  );
}
