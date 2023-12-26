import { VStack, HStack, Text, Button, Heading, Box, Flex } from "@chakra-ui/react";
import { useFineTune, useHandledAsyncCallback } from "~/utils/hooks";
import ContentCard from "~/components/ContentCard";
import FineTuneDangerZone from "./FineTuneDangerZone";
import dayjs from "~/utils/dayjs";
import { getStatusColor } from "../../FineTunesTable";
import { api } from "~/utils/api";
import ViewEvaluationButton from "~/components/datasets/DatasetContentTabs/Evaluation/ViewEvaluationButton";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import FineTunePruningRules from "./FineTunePruningRules";
import InferenceCodeTabs from "./InferenceCodeTabs/InferenceCodeTabs";

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
              <Text w={180}>Base Model</Text>
              <Text color="gray.500">{modelInfo(fineTune).name}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Dataset</Text>
              <ViewDatasetButton
                buttonText={fineTune.datasetName ?? ""}
                datasetId={fineTune.datasetId}
              />
            </HStack>
            <HStack>
              <Text w={180}>Training Set Size</Text>
              <Text color="gray.500">{fineTune.numTrainingEntries.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Test Set Size</Text>
              <Text color="gray.500">{fineTune.numTestingEntries.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Test Set Performance</Text>
              {fineTune.status === "DEPLOYED" ? (
                <ViewEvaluationButton datasetId={fineTune.datasetId} fineTuneId={fineTune.id} />
              ) : (
                <Text color="gray.500">Pending</Text>
              )}
            </HStack>
            <HStack>
              <Text w={180}>Created At</Text>
              <Text color="gray.500">{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Text>
            </HStack>
            <HStack alignItems="flex-start">
              <Text w={180}>Status</Text>
              <HStack alignItems="center" spacing={4}>
                <Text fontWeight="bold" color={getStatusColor(fineTune.status)}>
                  {fineTune.status}
                </Text>
                {fineTune.errorMessage && (
                  <>
                    <Text color="gray.500">{fineTune.errorMessage}</Text>
                    <Button variant="outline" size="xs" onClick={handleRestartTraining}>
                      Restart Training
                    </Button>
                  </>
                )}
              </HStack>
            </HStack>
          </VStack>
        </ContentCard>
        <FineTunePruningRules />
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
