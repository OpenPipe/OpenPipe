import { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  HStack,
  VStack,
  Icon,
  Text,
  Button,
  Box,
  Link as ChakraLink,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import pluralize from "pluralize";
import { AiOutlineCloudUpload, AiOutlineFile } from "react-icons/ai";
import { FaBalanceScale, FaReadme } from "react-icons/fa";

import { useDataset, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import ActionButton from "~/components/ActionButton";
import { uploadDatasetEntryFile } from "~/utils/azure/website";
import { formatFileSize } from "~/utils/utils";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import {
  type RowToImport,
  parseRowsToImport,
  isRowToImport,
  isParseError,
} from "~/components/datasets/parseRowsToImport";
import { BsPlus } from "react-icons/bs";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "~/theme/ChakraThemeProvider";

export default function AddPaymentMethodButton() {
  const disclosure = useDisclosure();
  const selectedProject = useSelectedProject().data;

  const createStripeUserMutation = api.payments.createStripeUser.useMutation();

  async function handleAddPaymentMethodClick() {
    if (!selectedProject) return;

    const userSecret = await createStripeUserMutation.mutateAsync({
      projectId: selectedProject.id,
    });

    console.log("userSecret", userSecret);

    return disclosure.onOpen();
  }

  return (
    <>
      <Button colorScheme="blue" onClick={handleAddPaymentMethodClick}>
        <HStack spacing={0}>
          <Icon as={BsPlus} boxSize={6} strokeWidth={0.8} />
          <Text>Add Payment Method</Text>
        </HStack>
      </Button>
      <PaymentDetailsModal disclosure={disclosure} />
    </>
  );
}

// Call `loadStripe` outside of a component’s render to avoid recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  "pk_test_51OcEiyIpUtvR6wbgpoMtjp7GzrWoNcjM2kLSeYlEAcP9BevVtv69TeUvhndrg87A4zigWNXYfTjeHyDqX4dt3Pm100pZ8BTBtu",
);

const PaymentDetailsModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const options = {
    // passing the SetupIntent's client secret
    clientSecret: "seti_1OcHcfIpUtvR6wbgBciM1GfS_secret_PR9w06Iau6pod8SS1xrisqyBVU1VkB4",
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
                <SetupStripePaymentMethodForm disclosure={disclosure} />
              </Elements>
            </VStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

function SetupStripePaymentMethodForm({ disclosure }: { disclosure: UseDisclosureReturn }) {
  const stripe = useStripe();
  const elements = useElements();
  const selectedProject = useSelectedProject().data;

  // Code from stripe docs
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return null;
    }

    const { error } = await stripe.confirmSetup({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: `${process.env.NEXT_PUBLIC_HOST}/p/${selectedProject?.id}/billing/payment-methods`,
      },
      redirect: "if_required",
    });

    if (error) {
      // This point will only be reached if there is an immediate error when confirming the payment.
      toast({
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      // TODO: Close modal
      disclosure.onClose();

      toast({
        description: "WORKED!",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <form style={{ width: "100%" }}>
      <PaymentElement />
      <HStack w="full" justifyContent="end">
        <Button colorScheme="gray" minW={24} onClick={handleSubmit}>
          Save
        </Button>
      </HStack>
    </form>
  );
}
