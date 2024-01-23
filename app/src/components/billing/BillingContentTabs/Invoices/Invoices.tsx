import { Card, VStack, Text, Icon, Link as ChakraLink } from "@chakra-ui/react";
import { useInvoices } from "~/utils/hooks";
import InvoicesTable from "./InvoicesTable";
import NewTestInvoiceButton from "./NewTestInvoiceButton";
import { FaTable } from "react-icons/fa";

const Models = () => {
  const query = useInvoices(10000);

  const pendingCount = query.data?.invoices.filter((inv) => inv.status === "PENDING").length;
  const paidCount = query.data?.invoices.filter((inv) => inv.status !== "PENDING").length;

  return (
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      {pendingCount && (
        <>
          <Text fontSize="2xl" fontWeight="bold">
            Pending payments
          </Text>
          <InvoicesTable showStatuses={["PENDING"]} />
        </>
      )}
      {paidCount && (
        <>
          <Text fontSize="2xl" fontWeight="bold">
            Payment history
          </Text>
          <InvoicesTable showStatuses={["PAID", "CANCELED", "REFUNDED"]} />
        </>
      )}

      {!pendingCount && !paidCount && !query.isLoading && (
        <Card width="100%" overflowX="auto">
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
        </Card>
      )}
      <NewTestInvoiceButton />
    </VStack>
  );
};

export default Models;
