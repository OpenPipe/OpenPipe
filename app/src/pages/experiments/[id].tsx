import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  Center,
  Flex,
  Icon,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { RiFlaskLine } from "react-icons/ri";
import OutputsTable from "~/components/OutputsTable";
import ExperimentSettingsDrawer from "~/components/ExperimentSettingsDrawer/ExperimentSettingsDrawer";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import { useSyncVariantEditor } from "~/state/sync";
import { ExperimentHeaderButtons } from "~/components/experiments/ExperimentHeaderButtons/ExperimentHeaderButtons";
import Head from "next/head";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";

export default function Experiment() {
  const router = useRouter();
  const utils = api.useContext();
  useSyncVariantEditor();

  const experiment = useExperiment();
  const experimentStats = api.experiments.stats.useQuery(
    { id: router.query.id as string },
    {
      enabled: !!router.query.id,
    },
  );
  const stats = experimentStats.data;

  useEffect(() => {
    useAppStore.getState().sharedVariantEditor.loadMonaco().catch(console.error);
  }, []);

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

  const canModify = experiment.data?.access.canModify ?? false;

  return (
    <>
      {stats && (
        <Head>
          <meta property="og:title" content={stats.experimentLabel} key="title" />
          <meta
            property="og:image"
            content={`/api/experiments/og-image?experimentLabel=${stats.experimentLabel}&variantsCount=${stats.promptVariantCount}&scenariosCount=${stats.testScenarioCount}`}
            key="og-image"
          />
        </Head>
      )}
      <AppShell title={experiment.data?.label}>
        <VStack h="full">
          <PageHeaderContainer>
            <Breadcrumb>
              <BreadcrumbItem>
                <ProjectBreadcrumbContents projectName={experiment.data?.project?.name} />
              </BreadcrumbItem>
              <BreadcrumbItem>
                <Link href="/experiments">
                  <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                    <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
                  </Flex>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                {canModify ? (
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
                ) : (
                  <Text fontSize={16} px={0} minW={{ base: 100, lg: 300 }} flex={1}>
                    {experiment.data?.label}
                  </Text>
                )}
              </BreadcrumbItem>
            </Breadcrumb>
            <ExperimentHeaderButtons />
          </PageHeaderContainer>
          <ExperimentSettingsDrawer />
          <Box w="100%" overflowX="auto" flex={1}>
            <OutputsTable experimentId={router.query.id as string | undefined} />
          </Box>
        </VStack>
      </AppShell>
    </>
  );
}
