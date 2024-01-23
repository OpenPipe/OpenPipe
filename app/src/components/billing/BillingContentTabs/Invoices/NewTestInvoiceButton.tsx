import { HStack, Text, Button, Icon } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

// TEST BUTTON. WILL BE REMOVED.
const NewTestInvoiceButton = () => {
  const createInvoiceMutation = api.billing.createInvoice.useMutation();
  const selectedProject = useSelectedProject().data;
  const utils = api.useContext();

  const [createInvoice, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject) return;

    await createInvoiceMutation.mutateAsync({
      projectId: selectedProject.id,
    });

    await utils.billing.invoices.invalidate();
  }, [selectedProject, utils]);

  return (
    <Button colorScheme="blue" isLoading={creationInProgress} onClick={createInvoice}>
      <HStack spacing={0}>
        <Icon as={BsPlus} boxSize={6} strokeWidth={0.8} />
        <Text>Create New Invoice</Text>
      </HStack>
    </Button>
  );
};

export default NewTestInvoiceButton;
