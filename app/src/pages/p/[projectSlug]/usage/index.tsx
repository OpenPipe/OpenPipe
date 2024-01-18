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
  Box,
  Spacer,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  IconButton,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon, DollarSign, Hash } from "lucide-react";
import { StringParam, withDefault, useQueryParams } from "use-query-params";
import { ProjectLink } from "~/components/ProjectLink";
import CostGraph from "~/components/dashboard/CostGraph";

import UsageGraph from "~/components/dashboard/UsageGraph";
import AppShell from "~/components/nav/AppShell";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import dayjs, { formatToUTCDayMonth } from "~/utils/dayjs";
import { useSelectedProject, useStats } from "~/utils/hooks";

const numberWithDefault = (num: number | string | bigint | null, defaultValue = 0) =>
  Number(num ?? defaultValue);

export default function Usage() {
  const { data: selectedProject } = useSelectedProject();

  const startDateDefaultParam = withDefault(
    StringParam,
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const endDateDefaultParam = withDefault(StringParam, dayjs().endOf("month").format("YYYY-MM-DD"));

  const [query, setQuery] = useQueryParams({
    start: startDateDefaultParam,
    end: endDateDefaultParam,
  });

  const stats = useStats(selectedProject?.id || "", query.start, query.end);

  const {
    cost = 0,
    numQueries = 0,
    totalTrainingSpend = 0,
    totalInferenceSpend = 0,
    totalInputTokens = 0,
    totalOutputTokens = 0,
    totalTrainingTokens = 0,
  } = stats.data?.totals ?? {};

  const updateMonth = (operation: "add" | "subtract") => {
    setQuery({
      start: dayjs(query.start)[operation](1, "month").startOf("month").format("YYYY-MM-DD"),
      end: dayjs(query.end)[operation](1, "month").endOf("month").format("YYYY-MM-DD"),
    });
  };

  const nextMonthIsClickable = () => dayjs(query.start).add(1, "month").isBefore(dayjs());

  const handleNextMonthChange = () => {
    if (!nextMonthIsClickable()) return;
    updateMonth("add");
  };

  const handlePrevMonthChange = () => {
    updateMonth("subtract");
  };

  return (
    <AppShell title="Usage" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start">
        <Tabs w="full">
          <HStack justifyContent="space-between" marginX={0}>
            <TabList>
              <Tab>
                <Heading size="md">Cost</Heading>
              </Tab>
              <Tab>
                <Heading size="md">Activity</Heading>
              </Tab>
            </TabList>
            <Spacer />
            <Card w="190px" colorScheme="white" color={"gray.900"} padding="5px">
              <HStack spacing={0} justifyContent="space-between">
                <IconButton
                  onClick={handlePrevMonthChange}
                  variant="ghost"
                  aria-label="Previous month"
                  boxSize={7}
                  minWidth={0}
                  icon={<Icon as={ChevronLeftIcon} color={"gray.900"} />}
                />
                <Text>
                  {formatToUTCDayMonth(query.start)} - {formatToUTCDayMonth(query.end)}
                </Text>
                <IconButton
                  onClick={handleNextMonthChange}
                  aria-label="Next month"
                  boxSize={7}
                  minWidth={0}
                  variant="ghost"
                  isDisabled={!nextMonthIsClickable()}
                  icon={<Icon as={ChevronRightIcon} color={"gray.900"} />}
                />
              </HStack>
            </Card>
          </HStack>

          <TabPanels>
            <TabPanel paddingX={0}>
              <HStack gap={4} align="start">
                <Card flex={1}>
                  <CardBody>
                    <CostGraph startDate={query.start} endDate={query.end} />
                  </CardBody>
                </Card>
                <VStack spacing="4" width="300px" align="stretch">
                  <Card>
                    <CardBody>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total Spent</StatLabel>
                          <Icon as={DollarSign} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber>
                          ${parseFloat(cost.toString()).toFixed(2).toLocaleString()}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat marginBottom={4}>
                        <HStack>
                          <StatLabel flex={1}>Total inference spend</StatLabel>
                          <Icon as={DollarSign} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          ${parseFloat(totalInferenceSpend.toString()).toFixed(2)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total training spend</StatLabel>
                          <Icon as={DollarSign} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          ${parseFloat(totalTrainingSpend.toString()).toFixed(2)}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                </VStack>
              </HStack>
            </TabPanel>
            <TabPanel paddingX={0}>
              <HStack gap={4} align="start">
                <Card flex={1}>
                  <CardBody>
                    <UsageGraph startDate={query.start} endDate={query.end} />
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
                        <StatNumber>{parseInt(numQueries.toString()).toLocaleString()}</StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat marginBottom={4}>
                        <HStack>
                          <StatLabel flex={1}>Total input tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {parseInt(totalInputTokens.toString()).toLocaleString()}
                        </StatNumber>
                      </Stat>
                      <Stat marginBottom={4}>
                        <HStack>
                          <StatLabel flex={1}>Total output tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {parseInt(totalOutputTokens.toString()).toLocaleString()}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total training tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {parseInt(totalTrainingTokens.toString()).toLocaleString()}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                </VStack>
              </HStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <VStack margin="auto" spacing={4} align="stretch" w="full">
          <Heading size="md" mt={4}>
            Models
          </Heading>
          <Card>
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Created At</Th>
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
                      <ProjectLink
                        href={{ pathname: "/fine-tunes/[id]", query: { id: model.ftId } }}
                      >
                        <Text color="blue.600">openpipe:{model.slug}</Text>
                      </ProjectLink>
                    </Td>
                    <Td>
                      <Box whiteSpace="nowrap" minW="120px">
                        {dayjs(model.createdAt).format("MMMM D h:mm A")}
                      </Box>
                    </Td>
                    <Td>
                      <Text
                        color="orange.500"
                        fontWeight="bold"
                        fontSize="xs"
                        textTransform="uppercase"
                      >
                        {modelInfo(model).name}
                      </Text>
                    </Td>
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
