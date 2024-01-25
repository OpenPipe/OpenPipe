import {
  Card,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Button,
  TableContainer,
  Badge,
} from "@chakra-ui/react";
import { InvoiceStatus } from "@prisma/client";

import { useSelectedProject } from "~/utils/hooks";
import { ProjectLink } from "../../../ProjectLink";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { RouterOutputs } from "~/utils/api";

type Invoices = RouterOutputs["invoices"]["list"];

type Props = {
  invoices: Invoices;
};

const InvoicesTable = ({ invoices }: Props) => {
  const selectedProject = useSelectedProject().data;
  const router = useRouter();

  const handleOpenInvoiceClick = (id: string) => {
    if (selectedProject?.slug) {
      void router.push({
        pathname: "/p/[projectSlug]/billing/invoices/[id]",
        query: { projectSlug: selectedProject?.slug, id },
      });
    }
  };

  return (
    <Card width="100%" overflowX="auto">
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th textAlign="center">Status</Th>
              <Th isNumeric>Amount</Th>
              <Th isNumeric>{invoices.some((invoice) => invoice.paidAt) ? "Paid at" : ""}</Th>
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
                      px={2}
                      py={0.5}
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
    case "CANCELLED":
      return "pink";
    case "REFUNDED":
      return "purple";
    default:
      return "yellow";
  }
};
