import { useState } from "react";
import { HStack, Icon, Text, Button, useDisclosure } from "@chakra-ui/react";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import { BsPlus } from "react-icons/bs";
import PaymentDetailsModal from "./AddPaymentMethodModal";

export default function AddPaymentMethodButton() {
  const disclosure = useDisclosure();
  const selectedProject = useSelectedProject().data;

  const createStripeIntentMutation = api.payments.createStripeIntent.useMutation();

  const [clientSecret, setClientSecret] = useState("");

  const [addPaymentMethod, addPaymentMethodLoading] = useHandledAsyncCallback(async () => {
    if (!selectedProject) return;

    const { clientSecret } = await createStripeIntentMutation.mutateAsync({
      projectId: selectedProject.id,
    });

    if (clientSecret) {
      setClientSecret(clientSecret);
      disclosure.onOpen();
    }
  }, [selectedProject, createStripeIntentMutation, disclosure.onClose, setClientSecret]);

  return (
    <>
      <Button
        colorScheme="blue"
        onClick={() => addPaymentMethod()}
        w="240px"
        isLoading={addPaymentMethodLoading}
      >
        <HStack spacing={0}>
          <Icon as={BsPlus} boxSize={6} strokeWidth={0.8} />
          <Text>Add Payment Method</Text>
        </HStack>
      </Button>
      <PaymentDetailsModal clientSecret={clientSecret} disclosure={disclosure} />
    </>
  );
}
