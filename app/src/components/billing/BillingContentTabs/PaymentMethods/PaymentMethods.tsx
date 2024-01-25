import { VStack } from "@chakra-ui/react";

import AddPaymentMethodButton from "./AddPaymentMethodButton";

const PaymentMethods = () => {
  return (
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      <AddPaymentMethodButton />
    </VStack>
  );
};

export default PaymentMethods;
