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
import { Ban, DollarSign, Hash } from "lucide-react";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import LoggedCallTable from "~/components/dashboard/LoggedCallTable";
import UsageGraph from "~/components/dashboard/UsageGraph";

export default function LoggedCalls() {
  const { data: selectedProject } = useSelectedProject();

  const stats = api.dashboard.stats.useQuery(
    { projectId: selectedProject?.id ?? "" },
    { enabled: !!selectedProject },
  );

  return (
    <AppShell title="Logged Calls" requireAuth>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <Text>Logged Calls</Text>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <VStack px={8} pt={4} alignItems="flex-start" spacing={4}>
        <Text fontSize="2xl" fontWeight="bold">
          {selectedProject?.name}
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
                <UsageGraph />
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
                      ${parseFloat(stats.data?.totals?.cost?.toString() ?? "0").toFixed(3)}
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
