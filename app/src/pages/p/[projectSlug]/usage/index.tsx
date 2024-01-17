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
  Flex,
  Spacer,
  Center,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon, DollarSign, Hash } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useQueryParam, StringParam, DateParam } from "use-query-params";
import { set } from "zod";
import { ProjectLink } from "~/components/ProjectLink";

import UsageGraph from "~/components/dashboard/UsageGraph";
import AppShell from "~/components/nav/AppShell";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import { api } from "~/utils/api";
import dayjs from "~/utils/dayjs";
import { useSelectedProject } from "~/utils/hooks";

const numberWithDefault = (num: number | string | bigint | null, defaultValue = 0) =>
  Number(num ?? defaultValue);

export default function Usage() {
  const { data: selectedProject } = useSelectedProject();

  const router = useRouter();
  const { projectSlug } = router.query; // Extract dynamic segment from the URL

  // Define query parameters
  const [startDate, setStartDate] = useQueryParam("start", DateParam);
  const [endDate, setEndDate] = useQueryParam("end", DateParam);
  const [currentPeriod, setCurrentPeriod] = useState(dayjs().format("MMMM YYYY"));

  // Initialize the query parameters if they are not set
  useEffect(() => {
    if (projectSlug) {
      if (!endDate) setEndDate(dayjs().endOf("month").toDate());
      if (!startDate) setStartDate(dayjs().startOf("month").toDate());
    }
  }, [startDate, endDate, setStartDate, setEndDate, projectSlug]);

  const updateMonth = (operation: "add" | "subtract") => {
    const newStartDate = dayjs(startDate)[operation](1, "month").startOf("month").toDate();
    const newEndDate = dayjs(endDate)[operation](1, "month").endOf("month").toDate();
    const newCurrentPeriod = dayjs(startDate)[operation](1, "month").format("MMMM YYYY");

    // Then, update all states/parameters at once
    setEndDate(newEndDate);
    setStartDate(newStartDate);
    setCurrentPeriod(newCurrentPeriod);
  };

  const nextMonthIsClickable = () => dayjs(startDate).add(1, "month").isBefore(dayjs());

  const handleNextMonthChange = () => {
    if (!nextMonthIsClickable()) return;
    updateMonth("add");
  };

  const handlePrevMonthChange = () => {
    updateMonth("subtract");
  };

  const stats = api.usage.stats.useQuery(
    {
      projectId: selectedProject?.id ?? "",
      startDate: startDate || dayjs().startOf("month").toDate(),
      endDate: endDate || dayjs().endOf("month").toDate(),
    },
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
                <UsageGraph
                  startDate={startDate || dayjs().startOf("month").toDate()}
                  endDate={endDate || dayjs().startOf("month").toDate()}
                />
              </CardBody>
            </Card>
            <VStack spacing="4" width="300px" align="stretch">
              <Card>
                <CardBody>
                  <Stat>
                    <Flex>
                      <Center>
                        <Icon
                          onClick={handlePrevMonthChange}
                          cursor={"pointer"}
                          as={ChevronLeftIcon}
                          boxSize={5}
                          color={"gray.500"}
                        />
                      </Center>
                      <Spacer />
                      <Text fontSize="lg" as="b">
                        {currentPeriod}
                      </Text>
                      <Spacer />
                      <Center>
                        <Icon
                          onClick={handleNextMonthChange}
                          cursor={"pointer"}
                          as={ChevronRightIcon}
                          boxSize={5}
                          color={nextMonthIsClickable() ? "gray.500" : "gray.300"}
                        />
                      </Center>
                    </Flex>
                  </Stat>
                </CardBody>
              </Card>
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
                      ${parseFloat(stats.data?.totals?.cost?.toString() ?? "0").toLocaleString()}
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
