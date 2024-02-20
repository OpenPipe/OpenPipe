import {
  Card,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  TableContainer,
  Badge,
} from "@chakra-ui/react";
import { type InvoiceStatus } from "@prisma/client";
import { useSelectedProject } from "~/utils/hooks";
import { ProjectLink } from "../../../ProjectLink";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { type RouterOutputs } from "~/utils/api";
import PayButton from "../PaymentMethods/PayButton";

type Invoices = RouterOutputs["invoices"]["list"];

type Props = {
  invoices: Invoices;
};

const InvoicesTable = ({ invoices }: Props) => {
  const router = useRouter();
  const selectedProject = useSelectedProject().data;

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
              <Th isNumeric>{invoices.some((invoice) => invoice.paidAt) ? "Paid at" : ""}</Th>
              <Th isNumeric>Amount</Th>
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

                  <Td w="400px" isNumeric>
                    {invoice.status === "UNPAID" && <PayButton invoiceId={invoice.id} />}

                    {invoice.paidAt && <Text>{dayjs(invoice.paidAt).format("MMM D, YYYY")}</Text>}
                  </Td>
                  <Td w="200px" isNumeric>
                    <ProjectLink
                      href={{ pathname: "/billing/invoices/[id]", query: { id: invoice.id } }}
                    >
                      <Text as="b" color="gray.900">
                        ${parseFloat(invoice.amount.toString()).toFixed(2)}
                      </Text>
                    </ProjectLink>
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
    case "UNPAID":
      return "red";
    case "FREE":
      return "blue";
    case "CANCELLED":
      return "pink";
    case "REFUNDED":
      return "purple";
    default:
      return "yellow";
  }
};
