import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Center,
  Flex,
  HStack,
  Icon,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { FaPrint } from "react-icons/fa";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { ProjectLink } from "~/components/ProjectLink";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { typedInvoice } from "~/types/dbColumns.types";
import { JsonValue } from "~/types/kysely-codegen.types";
import { useInvoice, useSelectedProject } from "~/utils/hooks";

export default function Invoice() {
  const selectedProject = useSelectedProject().data;

  const router = useRouter();
  const id = router.query.id as string;

  const query = useInvoice(id);
  const invoice = query.data;

  if (!query.isLoading && !invoice) {
    return (
      <AppShell title="Dataset not found">
        <Center h="100%">
          <Text>Dataset not found 😕</Text>
        </Center>
      </AppShell>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <AppShell title="Billing" requireAuth>
      <VStack position="sticky" left={0} right={0} w="full">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents projectName={selectedProject?.name} />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/billing">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={LiaFileInvoiceDollarSolid} boxSize={4} mr={2} /> Billing
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>{invoice.slug}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>

        <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
          <Text fontSize="2xl" fontWeight="bold">
            Invoice {invoice.slug}
          </Text>
          <Card width="100%" overflowX="auto">
            <VStack py={8}>
              <HStack px={8} w="900px" justifyContent="space-between" paddingBottom={5}>
                <VStack alignItems="start">
                  <Text fontSize="2xl" fontWeight="bold">
                    Invoice
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    OpenPipe
                  </Text>
                </VStack>
                <VStack alignItems="end">
                  <Text fontSize="2xl" fontWeight="bold" textAlign={"right"}>
                    {invoice.slug}
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" textAlign={"end"}>
                    {invoice.billingPeriod}
                  </Text>
                </VStack>
              </HStack>

              <TableContainer>
                <Table size="lg" width="900px">
                  <Thead>
                    <Tr>
                      <Th></Th>
                      <Th>Description</Th>
                      <Th isNumeric>Amount</Th>
                    </Tr>
                  </Thead>

                  <InvoiceBody description={invoice.description} />
                  <Tfoot>
                    <Tr>
                      <Th></Th>
                      <Th></Th>
                      <Th isNumeric fontSize="2xl">
                        Total: ${parseFloat(invoice.amount.toString()).toFixed(2)}
                      </Th>
                    </Tr>
                  </Tfoot>
                </Table>
              </TableContainer>
            </VStack>
          </Card>
          <HStack w="full" justifyContent="flex-end">
            <Button colorScheme="blue" onClick={() => window.print()}>
              <HStack spacing={0}>
                <Icon as={FaPrint} color="white" mr={2} />
                <Text>Print</Text>
              </HStack>
            </Button>
          </HStack>
        </VStack>
      </VStack>
    </AppShell>
  );
}

function InvoiceBody(prop: { description: JsonValue }) {
  let description;

  try {
    ({ description } = typedInvoice({ description: prop.description }));
  } catch (e) {
    return null;
  }

  return (
    <Tbody>
      {description.map((item, index) => (
        <Tr key={index}>
          <Td>{index + 1}</Td>
          <Td>
            <Text fontWeight="bold" fontSize="lg">
              {item.text}
            </Text>
            {item.description?.split("\n").map((i, key) => (
              <Text fontSize="md" key={key}>
                {i}
              </Text>
            ))}
          </Td>
          <Td isNumeric>
            <Text fontWeight="bold" fontSize="lg">
              {item.value}
            </Text>
          </Td>
        </Tr>
      ))}
    </Tbody>
  );
}
