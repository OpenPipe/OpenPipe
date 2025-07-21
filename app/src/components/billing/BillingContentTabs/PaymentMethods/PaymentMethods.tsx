import { Card, CardBody, Text, HStack, VStack, Icon, Button } from "@chakra-ui/react";
import { api } from "~/utils/api";

import AddPaymentMethodButton from "./AddPaymentMethodButton";
import { useHandledAsyncCallback, usePaymentMethods, useSelectedProject } from "~/utils/hooks";
import { FaCcMastercard, FaCcVisa, FaCreditCard } from "react-icons/fa";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

const PaymentMethods = () => {
  const selectedProject = useSelectedProject().data;
  const paymentMethods = usePaymentMethods().data;
  const utils = api.useContext();

  const setDefaultPaymentMethodMutation = api.payments.setDefaultPaymentMethod.useMutation();
  const deletePaymentMethodMutation = api.payments.deletePaymentMethod.useMutation();

  const [setDefaultPaymentMethod, setDefaultInProgress] = useHandledAsyncCallback(
    async (paymentMethodId: string) => {
      if (!selectedProject) return;

      await setDefaultPaymentMethodMutation.mutateAsync({
        projectId: selectedProject.id,
        paymentMethodId,
      });

      await utils.payments.getPaymentMethods.invalidate();
    },
    [selectedProject, utils, setDefaultPaymentMethodMutation],
  );

  const [deletePaymentMethod, deletionInProgress] = useHandledAsyncCallback(
    async (paymentMethodId: string) => {
      if (!selectedProject) return;

      const res = await deletePaymentMethodMutation.mutateAsync({
        projectId: selectedProject.id,
        paymentMethodId,
      });

      maybeReportError(res);

      await utils.payments.getPaymentMethods.invalidate();
    },
    [selectedProject, utils, setDefaultPaymentMethodMutation],
  );

  return (
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      <HStack spacing="4" align="stretch">
        {paymentMethods &&
          paymentMethods.data.length &&
          paymentMethods.data.map((method) => (
            <Card key={method.id} width="240px">
              <CardBody pb={2}>
                <HStack justify="space-between">
                  {method.card?.brand === "visa" ? (
                    <Icon as={FaCcVisa} color={"gray.500"} boxSize={16} />
                  ) : method.card?.brand === "mastercard" ? (
                    <Icon as={FaCcMastercard} color={"gray.500"} boxSize={16} />
                  ) : (
                    <Icon as={FaCreditCard} color={"gray.500"} boxSize={16} />
                  )}
                  <VStack alignItems="end">
                    <Text fontSize="xl" as="b">
                      ****{method.card?.last4}
                    </Text>
                    <Text fontSize="sm">
                      Expires: {method.card?.exp_month}/{method.card?.exp_year}
                    </Text>
                  </VStack>
                </HStack>
                <HStack justify="space-between" m={0} p={0}>
                  {method.id === paymentMethods.defaultPaymentMethodId ? (
                    <Text fontSize="sm" color="gray.400" py={2}>
                      Default
                    </Text>
                  ) : (
                    <Button
                      onClick={() => {
                        if (!setDefaultInProgress) setDefaultPaymentMethod(method.id);
                      }}
                      fontSize="sm"
                      px={1}
                      variant="ghost"
                      _hover={{ bgColor: "transparent" }}
                      isLoading={setDefaultInProgress}
                    >
                      Set as default
                    </Button>
                  )}

                  {method.id !== paymentMethods.defaultPaymentMethodId && (
                    <Button
                      onClick={() => {
                        if (!deletionInProgress) deletePaymentMethod(method.id);
                      }}
                      fontSize="sm"
                      px={1}
                      variant="ghost"
                      _hover={{ bgColor: "transparent" }}
                      isLoading={deletionInProgress}
                    >
                      Delete
                    </Button>
                  )}
                </HStack>
              </CardBody>
            </Card>
          ))}
      </HStack>
      <AddPaymentMethodButton />
    </VStack>
  );
};

export default PaymentMethods;
