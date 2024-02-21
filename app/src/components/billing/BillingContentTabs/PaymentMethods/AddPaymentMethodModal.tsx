import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  HStack,
  VStack,
  Text,
  Button,
  Box,
  type UseDisclosureReturn,
} from "@chakra-ui/react";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "~/theme/ChakraThemeProvider";
import { env } from "~/env.mjs";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

export default function PaymentDetailsModal({
  clientSecret,
  disclosure,
  successCallback,
  buttonText,
}: {
  clientSecret: string;
  disclosure: UseDisclosureReturn;
  successCallback?: () => void;
  buttonText?: string;
}) {
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
            <VStack w="full" justifyContent="center">
              <Elements stripe={stripePromise} options={options}>
                <SetupStripePaymentMethodForm
                  disclosure={disclosure}
                  clientSecret={clientSecret}
                  successCallback={successCallback}
                  buttonText={buttonText}
                />
              </Elements>
            </VStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function SetupStripePaymentMethodForm({
  disclosure,
  clientSecret,
  successCallback,
  buttonText,
}: {
  disclosure: UseDisclosureReturn;
  clientSecret: string;
  successCallback?: () => void;
  buttonText?: string;
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
          if (successCallback) {
            successCallback();
          } else {
            toast({
              description: "Your payment method has been saved!",
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          }

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
        <Button
          colorScheme="gray"
          minW={24}
          isLoading={addPaymentDetailLoading}
          onClick={() => handleAddPaymentDetail()}
        >
          {buttonText || "Save"}
        </Button>
      </HStack>
    </Box>
  );
}
