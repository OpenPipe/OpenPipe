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
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { BsTrash } from "react-icons/bs";
import { RiFlaskLine } from "react-icons/ri";
import OutputsTable from "~/components/OutputsTable";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

const DeleteButton = (props: { experimentId: string }) => {
  const mutation = api.experiments.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const [onClick] = useHandledAsyncCallback(async () => {
    const nextExperiment = await mutation.mutateAsync({ id: props.experimentId });
    await utils.experiments.list.invalidate();

    if (nextExperiment) {
      await router.push({ pathname: "/experiments/[id]", query: { id: nextExperiment } });
    }
  }, [mutation, props.experimentId]);

  return (
    <Button size="sm" variant="ghost" colorScheme="gray" fontWeight="normal" onClick={onClick}>
      <Icon as={BsTrash} boxSize={4} mr={2} />
      Delete Experiment
    </Button>
  );
};

export default function Experiment() {
  const router = useRouter();
  const experiment = useExperiment();
  const utils = api.useContext();

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
        <Center h="100vh">
          <div>Experiment not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title={experiment.data?.label}>
      <Box minH="100vh" mb={50}>
        <HStack px={4} py={2}>
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <Flex alignItems="center">
                <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
              </Flex>
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
                minW={400}
                flex={1}
                _hover={{ borderColor: "gray.300" }}
                _focus={{ borderColor: "blue.500", outline: "none" }}
              />
            </BreadcrumbItem>
          </Breadcrumb>
          <DeleteButton experimentId={router.query.id as string} />
        </HStack>
        <OutputsTable experimentId={router.query.id as string | undefined} />
      </Box>
    </AppShell>
  );
}
