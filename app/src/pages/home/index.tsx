import {
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Table,
  Tbody,
  Tr,
  Td,
  Divider,
  Breadcrumb,
  BreadcrumbItem,
} from "@chakra-ui/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Ban, DollarSign, Hash } from "lucide-react";
import { useMemo } from "react";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useSelectedOrg } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { api } from "~/utils/api";
import LoggedCallTable from "~/components/dashboard/LoggedCallTable";

export default function HomePage() {
  const { data: selectedOrg } = useSelectedOrg();

  const stats = api.dashboard.stats.useQuery(
    { organizationId: selectedOrg?.id ?? "" },
    { enabled: !!selectedOrg },
  );

  const data = useMemo(() => {
    return (
      stats.data?.periods.map(({ period, numQueries, totalCost }) => ({
        period,
        Requests: numQueries,
        "Total Spent (USD)": parseFloat(totalCost.toString()),
      })) || []
    );
  }, [stats.data]);

  return (
    <AppShell requireAuth>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <Text>Homepage</Text>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <VStack px={8} pt={4} alignItems="flex-start" spacing={4}>
        <Text fontSize="2xl" fontWeight="bold">
          {selectedOrg?.name}
        </Text>
        <Divider />
        <VStack margin="auto" spacing={4} align="stretch" w="full">
          <HStack gap={4} align="start">
            <Card variant="outline" flex={1}>
              <CardHeader>
                <Heading as="h3" size="sm">
                  Usage Statistics
                </Heading>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="period"
                      tickFormatter={(str: string) => dayjs(str).format("MMM D")}
                    />
                    <YAxis yAxisId="left" dataKey="Requests" orientation="left" stroke="#8884d8" />
                    <YAxis
                      yAxisId="right"
                      dataKey="Total Spent (USD)"
                      orientation="right"
                      unit="$"
                      stroke="#82ca9d"
                    />
                    <Tooltip />
                    <Legend />
                    <CartesianGrid stroke="#f5f5f5" />
                    <Line
                      dataKey="Requests"
                      stroke="#8884d8"
                      yAxisId="left"
                      dot={false}
                      strokeWidth={3}
                    />
                    <Line
                      dataKey="Total Spent (USD)"
                      stroke="#82ca9d"
                      yAxisId="right"
                      dot={false}
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <VStack spacing="4" width="300px" align="stretch">
              <Card variant="outline">
                <CardBody>
                  <Stat>
                    <HStack>
                      <StatLabel flex={1}>Total Spent</StatLabel>
                      <Icon as={DollarSign} boxSize={4} color="gray.500" />
                    </HStack>
                    <StatNumber>
                      ${parseFloat(stats.data?.totals?.totalCost?.toString() ?? "0").toFixed(2)}
                    </StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card variant="outline">
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
              <Card variant="outline" overflow="hidden">
                <Stat>
                  <CardHeader>
                    <HStack>
                      <StatLabel flex={1}>Errors</StatLabel>
                      <Icon as={Ban} boxSize={4} color="gray.500" />
                    </HStack>
                  </CardHeader>
                  <Table variant="simple">
                    <Tbody>
                      {stats.data?.errors?.map((error) => (
                        <Tr key={error.code}>
                          <Td>
                            {error.name} ({error.code})
                          </Td>
                          <Td isNumeric color="red.600">
                            {parseInt(error.count.toString()).toLocaleString()}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Stat>
              </Card>
            </VStack>
          </HStack>
          <LoggedCallTable />
        </VStack>
      </VStack>
    </AppShell>
  );
}
