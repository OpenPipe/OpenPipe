import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Center,
  Flex,
  HStack,
  Icon,
  Input,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  BreadcrumbLink,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { BsGearFill, BsTrash } from "react-icons/bs";
import { RiFlaskLine } from "react-icons/ri";
import OutputsTable from "~/components/OutputsTable";
import SettingsDrawer from "~/components/OutputsTable/SettingsDrawer";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useStore } from "~/utils/store";

const DeleteButton = () => {
  const experiment = useExperiment();
  const mutation = api.experiments.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    const nextExperiment = await mutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();

    if (nextExperiment) {
      await router.push({ pathname: "/experiments/[id]", query: { id: nextExperiment } });
    }
    onClose();
  }, [mutation, experiment.data?.id, router]);

  return (
    <>
      <Button size="sm" variant="ghost" colorScheme="gray" fontWeight="normal" onClick={onOpen}>
        <Icon as={BsTrash} boxSize={4} mr={2} />
        Delete Experiment
      </Button>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Experiment
            </AlertDialogHeader>

            <AlertDialogBody>
              If you delete this experiment all the associated prompts and scenarios will be deleted
              as well. Are you sure?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={onDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default function Experiment() {
  const router = useRouter();
  const experiment = useExperiment();
  const utils = api.useContext();
  const openDrawer = useStore((s) => s.openDrawer);

  const [label, setLabel] = useState(experiment.data?.label || "");
  useEffect(() => {
    setLabel(experiment.data?.label || "");
  }, [experiment.data?.label]);

  const updateMutation = api.experiments.update.useMutation();
  const [onSaveLabel] = useHandledAsyncCallback(async () => {
    if (label && label !== experiment.data?.label && experiment.data?.id) {
      await updateMutation.mutateAsync({
        id: experiment.data.id,
        updates: { label: label },
      });
      await Promise.all([utils.experiments.list.invalidate(), utils.experiments.get.invalidate()]);
    }
  }, [updateMutation, experiment.data?.id, experiment.data?.label, label]);

  if (!experiment.isLoading && !experiment.data) {
    return (
      <AppShell title="Experiment not found">
        <Center h="100%">
          <div>Experiment not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title={experiment.data?.label}>
      <Box minH="100%" pb={50}>
        <HStack px={4} py={2}>
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <BreadcrumbLink href="/experiments">
                <Flex alignItems="center">
                  <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
                </Flex>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Input
                size="sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={onSaveLabel}
                borderWidth={1}
                borderColor="transparent"
                fontSize={16}
                px={0}
                minW={300}
                flex={1}
                _hover={{ borderColor: "gray.300" }}
                _focus={{ borderColor: "blue.500", outline: "none" }}
              />
            </BreadcrumbItem>
          </Breadcrumb>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="gray"
            fontWeight="normal"
            onClick={openDrawer}
            leftIcon={<Icon as={BsGearFill} boxSize={4} color="gray.600" />}
          >
            Edit Vars & Evals
          </Button>
          <DeleteButton />
        </HStack>
        <SettingsDrawer />
        <Box w="100%" overflowX="auto">
          <OutputsTable experimentId={router.query.id as string | undefined} />
        </Box>
      </Box>
    </AppShell>
  );
}
