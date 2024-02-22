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
  Skeleton,
  useBreakpointValue,
  Stack,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon, DollarSign, Hash } from "lucide-react";
import { StringParam, withDefault, useQueryParams } from "use-query-params";
import { ProjectLink } from "~/components/ProjectLink";
import CostGraph from "~/components/dashboard/CostGraph";

import UsageGraph from "~/components/dashboard/UsageGraph";
import AppShell from "~/components/nav/AppShell";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import { calculateSpendingsWithCredits } from "~/utils/billing";
import dayjs, { formatToUTCDayMonth } from "~/utils/dayjs";
import { useSelectedProject, useStats } from "~/utils/hooks";
import { numberWithDefault } from "~/utils/utils";

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
    cost,
    numQueries,
    totalTrainingSpend,
    totalInferenceSpend,
    totalInputTokens,
    totalOutputTokens,
    totalTrainingTokens,
  } = stats?.data?.totals ?? {};

  const credits = stats?.data?.credits ?? 0;

  const { totalSpent, creditsUsed, remainingCredits } = calculateSpendingsWithCredits(
    Number(cost ?? 0),
    credits,
  );

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
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <AppShell title="Usage" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start">
        <Tabs w="full">
          <HStack justifyContent="space-between" marginX={0} wrap={isMobile ? "wrap" : "nowrap"}>
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
              <Stack direction={isMobile ? "column" : "row"} gap={4} align="start">
                <Card flex={1} width="100%">
                  <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!stats.isLoading}>
                    <CardBody>
                      <CostGraph startDate={query.start} endDate={query.end} />
                    </CardBody>
                  </Skeleton>
                </Card>

                <VStack spacing="4" width={isMobile ? "100%" : "300px"} align="stretch">
                  <Card>
                    <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!stats.isLoading}>
                      <CardBody>
                        {credits > 0 && (
                          <Stat marginBottom={1}>
                            <HStack>
                              <StatLabel flex={1}>Total used</StatLabel>
                              <Icon as={DollarSign} boxSize={4} color="gray.500" />
                            </HStack>
                            <StatNumber color="gray.600" fontSize={"xl"}>
                              $
                              {Number(cost ?? 0)
                                .toFixed(2)
                                .toLocaleString()}
                            </StatNumber>
                          </Stat>
                        )}
                        {credits > 0 && (
                          <>
                            <Stat marginBottom={1}>
                              <HStack>
                                <StatLabel flex={1}>Credits used</StatLabel>
                                <Icon as={DollarSign} boxSize={4} color="gray.500" />
                              </HStack>
                              <StatNumber color="gray.600" fontSize={"xl"}>
                                ${creditsUsed.toFixed(2).toLocaleString()} / $
                                {(creditsUsed + remainingCredits).toFixed(2).toLocaleString()}
                              </StatNumber>
                            </Stat>
                          </>
                        )}
                        <Stat>
                          <HStack>
                            <StatLabel flex={1}>Total spend</StatLabel>
                            <Icon as={DollarSign} boxSize={4} color="gray.500" />
                          </HStack>
                          <StatNumber>${Number(totalSpent).toFixed(2).toLocaleString()}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Skeleton>
                  </Card>
                  <Card>
                    <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!stats.isLoading}>
                      <CardBody>
                        <Stat marginBottom={4}>
                          <HStack>
                            <StatLabel flex={1}>Total inference spend</StatLabel>
                            <Icon as={DollarSign} boxSize={4} color="gray.500" />
                          </HStack>
                          <StatNumber color="gray.600" fontSize={"xl"}>
                            $
                            {Number(totalInferenceSpend ?? 0)
                              .toFixed(2)
                              .toLocaleString()}
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <HStack>
                            <StatLabel flex={1}>Total training spend</StatLabel>
                            <Icon as={DollarSign} boxSize={4} color="gray.500" />
                          </HStack>
                          <StatNumber color="gray.600" fontSize={"xl"}>
                            $
                            {Number(totalTrainingSpend ?? 0)
                              .toFixed(2)
                              .toLocaleString()}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Skeleton>
                  </Card>
                </VStack>
              </Stack>
            </TabPanel>
            <TabPanel paddingX={0}>
              <Stack direction={isMobile ? "column" : "row"} gap={4} align="start">
                <Card flex={1} width="100%">
                  <CardBody>
                    <UsageGraph startDate={query.start} endDate={query.end} />
                  </CardBody>
                </Card>
                <VStack spacing="4" width={isMobile ? "100%" : "300px"} align="stretch">
                  <Card>
                    <CardBody>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total Requests</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber>{numberWithDefault(numQueries).toLocaleString()}</StatNumber>
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
                          {numberWithDefault(totalInputTokens).toLocaleString()}
                        </StatNumber>
                      </Stat>
                      <Stat marginBottom={4}>
                        <HStack>
                          <StatLabel flex={1}>Total output tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {numberWithDefault(totalOutputTokens).toLocaleString()}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total training tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {numberWithDefault(totalTrainingTokens).toLocaleString()}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                </VStack>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <VStack margin="auto" spacing={4} align="stretch" w="full">
          <Heading size="md" mt={4}>
            Models
          </Heading>
          <Card width="100%" overflowX="auto">
            <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!stats.isLoading}>
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
                      <Td isNumeric>{Number(model.numQueries ?? 0).toLocaleString()}</Td>
                      <Td isNumeric>{Number(model.inputTokens ?? 0).toLocaleString()}</Td>
                      <Td isNumeric>{Number(model.outputTokens ?? 0).toLocaleString()}</Td>
                      <Td isNumeric>{Number(model.cost ?? 0).toFixed(2)}</Td>
                    </Tr>
                  )) ?? <Tr />}
                </Tbody>
              </Table>
            </Skeleton>
          </Card>
        </VStack>
      </VStack>
    </AppShell>
  );
}
