import { VStack, HStack, Text, Button, Heading, Box, Flex } from "@chakra-ui/react";
import { useFineTune, useHandledAsyncCallback } from "~/utils/hooks";
import ContentCard from "~/components/ContentCard";
import FineTuneDangerZone from "./FineTuneDangerZone";
import dayjs from "~/utils/dayjs";
import { api } from "~/utils/api";
import ViewEvaluationButton from "~/components/datasets/DatasetContentTabs/Evaluation/ViewEvaluationButton";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import FineTunePruningRules from "./FineTunePruningRules";
import InferenceCodeTabs from "./InferenceCodeTabs/InferenceCodeTabs";
import ExportWeights from "./ExportWeights";
import { FTStatus } from "../../FineTunesTable";

const General = () => {
  const fineTune = useFineTune().data;

  const restartTraining = api.fineTunes.restartTraining.useMutation();

  const utils = api.useContext();
  const [handleRestartTraining] = useHandledAsyncCallback(async () => {
    if (!fineTune) return;
    await restartTraining.mutateAsync({ id: fineTune.id });
    await utils.fineTunes.get.invalidate();
  }, [fineTune?.id]);

  if (!fineTune) return null;

  return (
    <Flex
      h="fit-content"
      position="relative"
      w="full"
      alignItems="flex-start"
      pb={12}
      flexDir={{ base: "column", md: "row" }}
    >
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard>
          <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white">
            <Heading size="md" pb={4}>
              Overview
            </Heading>
            <HStack>
              <Text minW={180}>Base Model</Text>
              <Text color="gray.500">{modelInfo(fineTune).name}</Text>
            </HStack>
            <HStack>
              <Text minW={180}>Dataset</Text>
              <ViewDatasetButton
                buttonText={fineTune.datasetName ?? ""}
                datasetId={fineTune.datasetId}
              />
            </HStack>
            <HStack>
              <Text minW={180}>Training Set Size</Text>
              <Text color="gray.500">{fineTune.numTrainingEntries?.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text minW={180}>Test Set Size</Text>
              <Text color="gray.500">{fineTune.numTestEntries?.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text minW={180}>Test Set Performance</Text>
              {fineTune.status === "DEPLOYED" ? (
                <ViewEvaluationButton datasetId={fineTune.datasetId} fineTuneId={fineTune.id} />
              ) : (
                <Text color="gray.500">Pending</Text>
              )}
            </HStack>
            <HStack>
              <Text minW={180}>Pipeline Version</Text>
              <Text color="gray.500">{fineTune.pipelineVersion}</Text>
            </HStack>
            {fineTune.trainingConfigOverrides && (
              <HStack>
                <Text minW={180}>Training Config</Text>
                <Text color="gray.500">
                  {Object.entries(fineTune.trainingConfigOverrides)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(", ")}
                </Text>
              </HStack>
            )}
            <HStack>
              <Text minW={180}>Created At</Text>
              <Text color="gray.500">{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Text>
            </HStack>
            <HStack alignItems="flex-start">
              <Text minW={180}>Status</Text>
              <HStack alignItems="center" spacing={4}>
                <FTStatus status={fineTune.status} />
                {fineTune.errorMessage && <Text color="gray.500">{fineTune.errorMessage}</Text>}
                {fineTune.status === "ERROR" && (
                  <ConditionallyEnable accessRequired="requireCanModifyProject">
                    <Button variant="outline" size="xs" onClick={handleRestartTraining}>
                      Restart Training
                    </Button>
                  </ConditionallyEnable>
                )}
              </HStack>
            </HStack>
          </VStack>
        </ContentCard>
        <FineTunePruningRules />
        <ExportWeights />
        <FineTuneDangerZone />
      </VStack>
      {fineTune.status === "DEPLOYED" && (
        <Box position="sticky" top={8} pl={{ base: 0, md: 8 }}>
          <InferenceCodeTabs />
        </Box>
      )}
    </Flex>
  );
};

export default General;
