import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  HStack,
  VStack,
  Icon,
  Text,
  Button,
  Box,
  useDisclosure,
  type UseDisclosureReturn,
  Spinner,
} from "@chakra-ui/react";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import { BsPlus } from "react-icons/bs";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "~/theme/ChakraThemeProvider";
import { env } from "~/env.mjs";

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

// Call `loadStripe` outside of a component’s render to avoid recreating the `Stripe` object on every render.
const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const PaymentDetailsModal = ({
  clientSecret,
  disclosure,
}: {
  clientSecret: string;
  disclosure: UseDisclosureReturn;
}) => {
  const options = {
    clientSecret,
    // Fully customizable with appearance API.
    appearance: {
      /*...*/
    },
  };

  return (
    <Modal
      size={{ base: "xl", md: "2xl" }}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      {...disclosure}
    >
      <ModalOverlay />
      <ModalContent maxW="95%" h="auto">
        <ModalHeader>
          <HStack>
            <Text>Add payment method</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto" p={8}>
          <Box w="full">
            <VStack w="full" justifyContent={"center"}>
              <Elements stripe={stripePromise} options={options}>
                <SetupStripePaymentMethodForm disclosure={disclosure} clientSecret={clientSecret} />
              </Elements>
            </VStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

function SetupStripePaymentMethodForm({
  disclosure,
  clientSecret,
}: {
  disclosure: UseDisclosureReturn;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const selectedProject = useSelectedProject().data;
  const utils = api.useContext();

  // Code from stripe docs
  const [handleAddPaymentDetail, addPaymentDetailLoading] = useHandledAsyncCallback(async () => {
    const setupIntent = await addPaymentDetail();

    if (setupIntent) {
      switch (setupIntent.status) {
        case "succeeded":
          toast({
            description: "Success! Your payment method has been saved.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          break;

        case "processing":
          toast({
            description: "Processing payment details. Please wait a few minutes.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          break;

        case "requires_payment_method":
          toast({
            description: "Failed to process payment details. Please try another payment method.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          break;
      }
      disclosure.onClose();
    }

    await utils.payments.getPaymentMethods.invalidate();
  }, [utils, addPaymentDetail]);

  async function addPaymentDetail() {
    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${env.NEXT_PUBLIC_HOST}/p/${
          selectedProject?.slug ?? ""
        }/billing/payment-methods`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);

      return setupIntent;
    }
  }

  return (
    <Box style={{ width: "100%" }}>
      <PaymentElement />
      <HStack w="full" justifyContent="end">
        <Button colorScheme="gray" minW={24} onClick={() => handleAddPaymentDetail()}>
          {addPaymentDetailLoading ? <Spinner /> : "Save"}
        </Button>
      </HStack>
    </Box>
  );
}
