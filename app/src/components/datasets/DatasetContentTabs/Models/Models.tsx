import { Box, Divider, VStack, HStack, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { setActiveTab } from "~/components/ContentTabs";
import dayjs from "~/utils/dayjs";
import { useDatasetFineTunes } from "~/utils/hooks";
import { DATASET_GENERAL_TAB_KEY } from "../DatasetContentTabs";
import ViewEvaluationButton from "../Evaluation/ViewEvaluationButton";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import { ProjectLink } from "~/components/ProjectLink";
import { FTStatus } from "~/components/fineTunes/FineTunesTable";

const Models = () => {
  const fineTunes = useDatasetFineTunes().data;

  const router = useRouter();

  if (!fineTunes?.length) {
    return (
      <Text px={8}>
        No models have been trained on this dataset. You can start training a model in the{" "}
        <Button
          variant="link"
          _hover={{ textDecor: "underline" }}
          onClick={() => setActiveTab(DATASET_GENERAL_TAB_KEY, router)}
        >
          General
        </Button>{" "}
        tab.
      </Text>
    );
  }

  return (
    <Box px={8} pb={8}>
      <VStack
        spacing={0}
        alignItems="flex-start"
        w="full"
        bgColor="white"
        borderRadius={4}
        borderColor="gray.300"
        borderWidth={1}
      >
        {fineTunes?.map((fineTune, index) => (
          <>
            {!!index && <Divider key={`${fineTune.id}-divider`} color="gray.300" my={1} />}
            <VStack key={fineTune.id} w="full" alignItems="flex-start" p={4}>
              <VStack w="full" alignItems="flex-start" pb={4}>
                <HStack w="full" alignItems="flex-start" justifyContent="space-between">
                  <VStack alignItems="flex-start">
                    <Text
                      as={ProjectLink}
                      href={{ pathname: "/fine-tunes/[id]", query: { id: fineTune.id } }}
                      fontWeight="bold"
                      _hover={{ textDecoration: "underline" }}
                    >
                      openpipe:{fineTune.slug}
                    </Text>
                    <Text
                      color="orange.500"
                      fontWeight="bold"
                      fontSize="xs"
                      textTransform="uppercase"
                      textAlign="end"
                    >
                      {modelInfo(fineTune).name}
                    </Text>
                  </VStack>
                  <FTStatus status={fineTune.status} />
                </HStack>
                {fineTune.errorMessage && <Text color="gray.500">{fineTune.errorMessage}</Text>}
              </VStack>
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
                <Text w={180}>Pruning Rules</Text>
                <Text color="gray.500">{fineTune.numPruningRules}</Text>
              </HStack>
              {fineTune.trainingConfigOverrides && (
                <HStack>
                  <Text w={180}>Training Config</Text>
                  <Text color="gray.500">
                    {Object.entries(fineTune.trainingConfigOverrides)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(", ")}
                  </Text>
                </HStack>
              )}
              <HStack>
                <Text w={180}>Created At</Text>
                <Text color="gray.500">{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Text>
              </HStack>
            </VStack>
          </>
        ))}
      </VStack>
    </Box>
  );
};

export default Models;
