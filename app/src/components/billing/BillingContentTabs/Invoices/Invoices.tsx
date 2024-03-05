import { Card, VStack, Text, Icon, Heading } from "@chakra-ui/react";
import { useInvoices } from "~/utils/hooks";
import InvoicesTable from "./InvoicesTable";
import { FaTable } from "react-icons/fa";

const Invoices = () => {
  const query = useInvoices();

  const unpaidInvoices = query?.data?.filter((inv) => inv.status === "UNPAID");
  const historyInvoices = query?.data?.filter((inv) => inv.status !== "UNPAID");

  return (
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      {unpaidInvoices?.length && (
        <>
          <Heading as="h2" fontSize="2xl">
            Pending payments
          </Heading>
          <InvoicesTable invoices={unpaidInvoices} />
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

      {!unpaidInvoices?.length && !historyInvoices?.length && !query.isLoading && (
        <Card width="100%" overflowX="auto">
          <VStack py={8} color="gray.500">
            <Icon as={FaTable} boxSize={16} color="gray.300" />
            <Text fontWeight="bold" fontSize="md">
              No invoices yet
            </Text>
            <Text textAlign="center" w="full" p={4}>
              An invoice will be created at the end of each calendar month.
            </Text>
          </VStack>
        </Card>
      )}
    </VStack>
  );
};

export default Invoices;
