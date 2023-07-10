import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Center,
  Flex,
  Icon,
  Input,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Text,
  HStack,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";

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
    await mutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments" });
    onClose();
  }, [mutation, experiment.data?.id, router]);

  return (
    <>
      <Button
        size="sm"
        variant={{ base: "outline", lg: "ghost" }}
        colorScheme="gray"
        fontWeight="normal"
        onClick={onOpen}
      >
        <Icon as={BsTrash} boxSize={4} color="gray.600" />
        <Text display={{ base: "none", lg: "block" }} ml={2}>
          Delete Experiment
        </Text>
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
      <VStack h="full">
        <Flex
          px={4}
          py={2}
          direction={{ base: "column", md: "row" }}
          alignItems={{ base: "flex-start", md: "center" }}
        >
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <Link href="/experiments">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
                </Flex>
              </Link>
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
                minW={{ base: 100, lg: 300 }}
                flex={1}
                _hover={{ borderColor: "gray.300" }}
                _focus={{ borderColor: "blue.500", outline: "none" }}
              />
            </BreadcrumbItem>
          </Breadcrumb>
          <HStack>
            <Button
              size="sm"
              variant={{ base: "outline", lg: "ghost" }}
              colorScheme="gray"
              fontWeight="normal"
              onClick={openDrawer}
            >
              <Icon as={BsGearFill} boxSize={4} color="gray.600" />
              <Text display={{ base: "none", lg: "block" }} ml={2}>
                Edit Vars & Evals
              </Text>
            </Button>
            <DeleteButton />
          </HStack>
        </Flex>
        <SettingsDrawer />
        <Box w="100%" overflowX="auto" flex={1}>
          <OutputsTable experimentId={router.query.id as string | undefined} />
        </Box>
      </VStack>
    </AppShell>
  );
}
