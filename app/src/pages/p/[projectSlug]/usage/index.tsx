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
  Button,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon, DollarSign, Hash } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useQueryParam, DateParam } from "use-query-params";
import { ProjectLink } from "~/components/ProjectLink";
import CostGraph from "~/components/dashboard/CostGraph";

import UsageGraph from "~/components/dashboard/UsageGraph";
import AppShell from "~/components/nav/AppShell";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import dayjs, { toUTC, toUTCDateShortFormat } from "~/utils/dayjs";
import { useSelectedProject, useStats } from "~/utils/hooks";

const numberWithDefault = (num: number | string | bigint | null, defaultValue = 0) =>
  Number(num ?? defaultValue);

export default function Usage() {
  const { data: selectedProject } = useSelectedProject();

  const router = useRouter();

  const [startDate, setStartDate] = useQueryParam("start", DateParam);
  const [endDate, setEndDate] = useQueryParam("end", DateParam);

  const startOfThisMonth = toUTC(new Date()).startOf("month").toDate();
  const endOfThisMonth = toUTC(new Date()).endOf("month").toDate();

  console.log(startDate);

  const { projectSlug } = router.query;

  useEffect(() => {
    // Prevents `href` Interpolation error in nextjs
    if (projectSlug) {
      if (!startDate) setStartDate(startOfThisMonth);
      if (!endDate) setEndDate(endOfThisMonth);
    }
  }, [startDate, endDate, setStartDate, setEndDate, projectSlug]);

  const stats = useStats(selectedProject?.id || "", startDate, endDate);

  const { totalInferenceSpend, totalTrainingSpend, totalInputTokens, totalOutputTokens } =
    useMemo(() => {
      const totalTrainingSpend =
        stats.data?.periods.reduce((acc, cur) => {
          acc += Number(cur.trainingCost);
          return acc;
        }, 0) ?? 0;

      const totalInferenceSpend =
        stats.data?.periods.reduce((acc, cur) => {
          acc += Number(cur.inferenceCost);
          return acc;
        }, 0) ?? 0;

      const totalInputTokens =
        stats.data?.fineTunes.reduce((acc, cur) => {
          acc += Number(cur.inputTokens);
          return acc;
        }, 0) ?? 0;

      const totalOutputTokens =
        stats.data?.fineTunes.reduce((acc, cur) => {
          acc += Number(cur.outputTokens);
          return acc;
        }, 0) ?? 0;

      return { totalTrainingSpend, totalInferenceSpend, totalInputTokens, totalOutputTokens };
    }, [stats.data]);

  const updateMonth = (operation: "add" | "subtract") => {
    const newStartDate = dayjs(startDate)[operation](1, "month").startOf("month").toDate();
    const newEndDate = dayjs(endDate)[operation](1, "month").endOf("month").toDate();

    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const nextMonthIsClickable = () => dayjs(startDate).add(1, "month").isBefore(dayjs());

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
            <Card w={"180px"} colorScheme="white" color={"gray.900"} padding={"5px"}>
              <HStack spacing={0} justifyContent="space-between">
                <Icon
                  onClick={handlePrevMonthChange}
                  cursor={"pointer"}
                  as={ChevronLeftIcon}
                  boxSize={5}
                  color={"gray.900"}
                />
                <Text onClick={handlePrevMonthChange} cursor={"pointer"}>
                  {toUTCDateShortFormat(startDate || startOfThisMonth)}
                </Text>
                <Text paddingX={"5px"}> - </Text>
                <Text onClick={handleNextMonthChange} cursor={"pointer"}>
                  {toUTCDateShortFormat(endDate || endOfThisMonth)}
                </Text>
                <Icon
                  onClick={handleNextMonthChange}
                  cursor={"pointer"}
                  as={ChevronRightIcon}
                  boxSize={5}
                  color={nextMonthIsClickable() ? "gray.900" : "gray.400"}
                />
              </HStack>
            </Card>
          </HStack>

          <TabPanels>
            <TabPanel paddingX={0}>
              <HStack gap={4} align="start">
                <Card flex={1}>
                  <CardBody>
                    <CostGraph
                      startDate={startDate || startOfThisMonth}
                      endDate={endDate || endOfThisMonth}
                    />
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
                          $
                          {parseFloat(stats.data?.totals?.cost?.toString() ?? "0")
                            .toFixed(2)
                            .toLocaleString()}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Training Spend</StatLabel>
                          <Icon as={DollarSign} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          ${parseFloat(totalTrainingSpend.toString()).toFixed(2)}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Inference Spend</StatLabel>
                          <Icon as={DollarSign} boxSize={4} color="gray.500" />
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          ${parseFloat(totalInferenceSpend.toString()).toFixed(2)}
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
                    <UsageGraph
                      startDate={startDate || startOfThisMonth}
                      endDate={endDate || endOfThisMonth}
                    />
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
                          <StatLabel flex={1}>Total input tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {totalInputTokens}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <HStack>
                          <StatLabel flex={1}>Total output tokens</StatLabel>
                          <Icon as={Hash} boxSize={4} color="gray.500" />{" "}
                        </HStack>
                        <StatNumber color="gray.600" fontSize={"xl"}>
                          {totalOutputTokens}
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
