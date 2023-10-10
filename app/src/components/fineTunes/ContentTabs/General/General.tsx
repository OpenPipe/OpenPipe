import { VStack, HStack, Text } from "@chakra-ui/react";
import { displayBaseModel } from "~/utils/baseModels";
import { useFineTune } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import FineTuneSlugEditor from "./FineTuneSlugEditor";
import dayjs from "~/utils/dayjs";
import DeleteFineTuneButton from "./DeleteFineTuneButton";
import { getStatusColor } from "../../FineTunesTable";
import ColoredPercent from "~/components/ColoredPercent";

const General = () => {
  const fineTune = useFineTune().data;

  if (!fineTune) return null;

  return (
    <VStack w="full" h="full" justifyContent="space-between">
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard>
          <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white">
            <Text fontWeight="bold" pb={4}>
              Overview
            </Text>
            <HStack>
              <Text w={180}>Base Model:</Text>
              <Text color="gray.500">{displayBaseModel(fineTune.baseModel)}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Training Set Size:</Text>
              <Text color="gray.500">{fineTune.numTrainingEntries.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Test Set Size:</Text>
              <Text color="gray.500">{fineTune.numTestingEntries.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Test Set Accuracy:</Text>
              <ColoredPercent value={fineTune.averageScore} />
            </HStack>
            <HStack>
              <Text w={180}>Pruning Rules:</Text>
              <Text color="gray.500">{fineTune.numPruningRules}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Created At:</Text>
              <Text color="gray.500">{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Text>
            </HStack>
            <HStack alignItems="flex-start">
              <Text w={180}>Status:</Text>
              <VStack alignItems="flex-start">
                <Text fontWeight="bold" color={getStatusColor(fineTune.status)}>
                  {fineTune.status}
                </Text>
                {fineTune.errorMessage && <Text color="gray.500">{fineTune.errorMessage}</Text>}
              </VStack>
            </HStack>
          </VStack>
        </ContentCard>
        <ContentCard>
          <FineTuneSlugEditor />
        </ContentCard>
        <ContentCard>
          <VStack w="full" alignItems="flex-start" spacing={4}>
            <Text fontWeight="bold">Delete Fine Tune</Text>
            <Text>
              If you won't be using this model in the future, you can delete it to free up space.
              This action cannot be undone, so make sure you really want to delete this model before
              confirming.
            </Text>
            <DeleteFineTuneButton />
          </VStack>
        </ContentCard>
      </VStack>
    </VStack>
  );
};

export default General;
