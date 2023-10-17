import { Card, VStack, HStack, Text, Button } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import ColoredPercent from "~/components/ColoredPercent";
import { setActiveTab } from "~/components/ContentTabs";
import { getStatusColor } from "~/components/fineTunes/FineTunesTable";
import { displayBaseModel } from "~/utils/baseModels";
import dayjs from "~/utils/dayjs";

import { useDatasetFineTunes } from "~/utils/hooks";
import { DATASET_GENERAL_TAB_KEY } from "../DatasetContentTabs";
import ViewEvaluationButton from "../Evaluation/ViewEvaluationButton";

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
    <VStack alignItems="flex-start" w="full" px={8} spacing={4} pb={8}>
      {fineTunes?.map((fineTune) => (
        <Card key={fineTune.id} w="full">
          <VStack alignItems="flex-start" p={4}>
            <Text
              as={Link}
              href={{ pathname: "/fine-tunes/[id]", query: { id: fineTune.id } }}
              fontWeight="bold"
              _hover={{ textDecoration: "underline" }}
              pb={4}
            >
              openpipe:{fineTune.slug}
            </Text>
            <HStack>
              <Text w={180}>Base Model</Text>
              <Text color="gray.500">{displayBaseModel(fineTune.baseModel)}</Text>
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
                <ColoredPercent value={fineTune.averageScore} />
              ) : (
                <Text color="gray.500">Pending</Text>
              )}
              {fineTune.status === "DEPLOYED" && (
                <ViewEvaluationButton datasetId={fineTune.datasetId} fineTuneSlug={fineTune.slug} />
              )}
            </HStack>
            <HStack>
              <Text w={180}>Pruning Rules</Text>
              <Text color="gray.500">{fineTune.numPruningRules}</Text>
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
                {fineTune.errorMessage && <Text color="gray.500">{fineTune.errorMessage}</Text>}
              </HStack>
            </HStack>
          </VStack>
        </Card>
      ))}
    </VStack>
  );
};

export default Models;
