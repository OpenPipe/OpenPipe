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
  Button,
  TableContainer,
  Link as ChakraLink,
  Badge,
} from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";
import { InvoiceStatus } from "@prisma/client";

import { useInvoices, useSelectedProject } from "~/utils/hooks";
import { ProjectLink } from "../../../ProjectLink";
import { useRouter } from "next/router";
import dayjs from "dayjs";

type Props = {
  showStatuses: InvoiceStatus[];
};

const InvoicesTable = ({ showStatuses }: Props) => {
  const selectedProject = useSelectedProject().data;
  const router = useRouter();

  const query = useInvoices(10000);
  const invoices = query.data?.invoices.filter((i) => showStatuses.includes(i.status)) || [];

  const handleOpenInvoiceClick = (id: string) => {
    if (selectedProject?.slug) {
      void router.push({
        pathname: "/p/[projectSlug]/billing/invoices/[id]",
        query: { projectSlug: selectedProject?.slug, id },
      });
    }
  };

  if (query.isLoading) return null;

  return (
    <Card width="100%" overflowX="auto">
      {invoices.length ? (
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th textAlign="center">Status</Th>
                <Th isNumeric>Amount</Th>
                <Th isNumeric>{showStatuses.includes("PAID") ? "Paid on" : ""}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {invoices.map((invoice) => {
                return (
                  <Tr
                    onClick={() => handleOpenInvoiceClick(invoice.id)}
                    key={invoice.id}
                    _hover={{ td: { bgColor: "gray.50", cursor: "pointer" } }}
                  >
                    <Td>
                      <ProjectLink
                        href={{ pathname: "/billing/invoices/[id]", query: { id: invoice.id } }}
                      >
                        <strong>{invoice.billingPeriod}</strong>
                        <br />
                        {invoice.slug}
                      </ProjectLink>
                    </Td>
                    <Td w="200px" textAlign="center">
                      <Badge
                        variant="outline"
                        p="1px 8px"
                        textAlign="center"
                        borderRadius={4}
                        colorScheme={getStatusColor(invoice.status)}
                      >
                        {invoice.status}
                      </Badge>
                    </Td>

                    <Td isNumeric>
                      <ProjectLink
                        href={{ pathname: "/billing/invoices/[id]", query: { id: invoice.id } }}
                      >
                        <Text as={"b"} color="gray.900">
                          ${parseFloat(invoice.amount.toString()).toFixed(2)}
                        </Text>
                      </ProjectLink>
                    </Td>
                    <Td w="400px" isNumeric>
                      {invoice.status === "PENDING" && (
                        <Button
                          borderRadius={4}
                          mt={2}
                          variant="ghost"
                          color="blue.500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Pay
                        </Button>
                      )}

                      {invoice.paidAt && (
                        <Text>{dayjs.utc(invoice.paidAt).format("MMM D, YYYY")}</Text>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      ) : (
        <VStack py={8}>
          <Icon as={FaTable} boxSize={16} color="gray.300" />
          <Text fontWeight="bold" fontSize="md">
            No invoices yet
          </Text>
          <Text color="gray.500" textAlign="center" w="full" p={4}>
            <ChakraLink
              href="https://docs.openpipe.ai/getting-started/quick-start"
              target="_blank"
              color="blue.600"
            >
              Begin
            </ChakraLink>{" "}
            the journey of creating a language model that truly understands your data and
            objectives.
          </Text>
        </VStack>
      )}
    </Card>
  );
};

export default InvoicesTable;

export const getStatusColor = (status: InvoiceStatus) => {
  switch (status) {
    case "PAID":
      return "green";
    case "PENDING":
      return "red";
    case "CANCELED":
      return "pink";
    case "REFUNDED":
      return "purple";
    default:
      return "yellow";
  }
};
