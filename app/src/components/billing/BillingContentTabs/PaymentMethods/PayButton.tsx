import { useState } from "react";
import { Button, useDisclosure } from "@chakra-ui/react";

import { useHandledAsyncCallback, usePaymentMethods, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import PaymentDetailsModal from "./AddPaymentMethodModal";
import { toast } from "~/theme/ChakraThemeProvider";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export default function PayButton({ invoiceId }: { invoiceId: string }) {
  const paymentMethodExist = usePaymentMethods().data?.data?.length ?? 0;
  const payMutation = api.payments.pay.useMutation();
  const utils = api.useContext();

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

  const [pay, isPaymentLoading] = useHandledAsyncCallback(async () => {
    const resp = await payMutation.mutateAsync({
      invoiceId,
    });

    if (!maybeReportError(resp)) {
      toast({
        description: "Payment processing!",
        status: "success",
      });
    }

    await utils.invoices.list.invalidate();
    await utils.invoices.get.invalidate();
  }, [utils, payMutation]);

  return (
    <>
      <Button
        borderRadius={4}
        colorScheme="blue"
        onClick={(e) => {
          e.stopPropagation();
          paymentMethodExist ? pay() : addPaymentMethod();
        }}
        isLoading={paymentMethodExist ? isPaymentLoading : addPaymentMethodLoading}
      >
        Pay
      </Button>
      <PaymentDetailsModal
        clientSecret={clientSecret}
        disclosure={disclosure}
        successCallback={pay}
      />
    </>
  );
}
