import { Card, VStack, Text, Icon, Link as ChakraLink, Heading } from "@chakra-ui/react";
import { useInvoices } from "~/utils/hooks";
import InvoicesTable from "./InvoicesTable";
import NewTestInvoiceButton from "./NewTestInvoiceButton";
import { FaTable } from "react-icons/fa";

const Invoices = () => {
  const query = useInvoices();

  const pendingInvoices = query?.data?.invoices.filter((inv) => inv.status === "PENDING");
  const historyInvoices = query?.data?.invoices.filter((inv) => inv.status !== "PENDING");

  return (
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      {pendingInvoices?.length && (
        <>
          <Heading as="h2" fontSize="2xl">
            Pending payments
          </Heading>
          <InvoicesTable invoices={pendingInvoices} />
        </>
      )}
      {historyInvoices?.length && (
        <>
          <Heading as="h2" fontSize="2xl">
            Payment history
          </Heading>
          <InvoicesTable invoices={historyInvoices} />
        </>
      )}

      {!pendingInvoices?.length && !historyInvoices?.length && !query.isLoading && (
        <Card width="100%" overflowX="auto">
          <VStack py={8}>
            <Icon as={FaTable} boxSize={16} color="gray.300" />
            <Text fontWeight="bold" fontSize="md">
              No invoices yet
            </Text>
            <Text color="gray.500" textAlign="center" w="full" p={4}>
              An invoice will be created at the end of each calendar month.
            </Text>
          </VStack>
        </Card>
      )}
      <NewTestInvoiceButton />
    </VStack>
  );
};

export default Invoices;
