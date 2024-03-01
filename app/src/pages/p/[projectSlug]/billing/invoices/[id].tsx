import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
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
import { ProjectLink, useProjectLink } from "~/components/ProjectLink";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { typedInvoice } from "~/types/dbColumns.types";
import { useInvoice, useSelectedProject } from "~/utils/hooks";
import { type JsonValue } from "~/types/kysely-codegen.types";
import PayButton from "~/components/billing/BillingContentTabs/PaymentMethods/PayButton";
import { getStatusColor } from "~/components/billing/BillingContentTabs/Invoices/InvoicesTable";
import dayjs from "dayjs";

export default function Invoice() {
  const selectedProject = useSelectedProject().data;

  const router = useRouter();
  const id = router.query.id as string;

  const query = useInvoice(id);
  const invoice = query.data;

  const invoicesLink = useProjectLink({ pathname: "/billing/[tab]", query: { tab: "invoices" } });

  if (!query.isLoading && !invoice) {
    router.push(invoicesLink).catch(console.error);
    return null;
    // return (
    // <AppShell title="Invoice not found" requireAuth>
    //   <Center h="100%">
    //     <Text>Invoice not found 😕</Text>
    //   </Center>
    // </AppShell>
    // );
  }

  if (!invoice) {
    return (
      <AppShell title="Billing" requireAuth>
        <></>
      </AppShell>
    );
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
          <HStack w="full" justifyContent="start" gap={4}>
            <Text fontSize="2xl" fontWeight="bold">
              Invoice {invoice.slug}
            </Text>
            <Badge
              variant="outline"
              px={3}
              py={1}
              textAlign="center"
              borderRadius={4}
              colorScheme={getStatusColor(invoice.status)}
            >
              {invoice.status === "PAID"
                ? "PAID ON " + dayjs(invoice.paidAt).format("MMM D YYYY")
                : invoice.status}
            </Badge>
          </HStack>
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
          <HStack w="full" justifyContent="space-between">
            <Button onClick={() => window.print()} variant="ghost">
              <HStack spacing={0}>
                <Icon as={FaPrint} color="gray.600" mr={2} />
                <Text>Print</Text>
              </HStack>
            </Button>
            {invoice.status === "UNPAID" && <PayButton invoiceId={invoice.id} />}
          </HStack>
        </VStack>
      </VStack>
    </AppShell>
  );
}

function InvoiceBody(props: { description: JsonValue }) {
  let description;

  try {
    ({ description } = typedInvoice({ description: props.description }));
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
