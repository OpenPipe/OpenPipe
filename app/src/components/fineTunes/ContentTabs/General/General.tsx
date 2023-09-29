import { VStack, HStack, Text } from "@chakra-ui/react";
import { displayBaseModel } from "~/utils/baseModels";
import { useFineTune } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import FineTuneSlugEditor from "./FineTuneSlugEditor";
import dayjs from "~/utils/dayjs";
import DeleteFineTuneButton from "./DeleteFineTuneButton";
import { getStatusColor } from "../../FineTunesTable";

const General = () => {
  const fineTune = useFineTune().data;

  if (!fineTune) return null;

  const {
    baseModel,
    _count: { trainingEntries: numTrainingEntries },
    pruningRules,
    createdAt,
  } = fineTune;

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
              <Text color="gray.500">{displayBaseModel(baseModel)}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Training Dataset Size:</Text>
              <Text color="gray.500">{numTrainingEntries}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Pruning Rules:</Text>
              <Text color="gray.500">{pruningRules.length}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Created At:</Text>
              <Text color="gray.500">{dayjs(createdAt).format("MMMM D h:mm A")}</Text>
            </HStack>
            <HStack>
              <Text w={180}>Status:</Text>
              <Text fontWeight="bold" color={getStatusColor(fineTune.status)}>
                {fineTune.status}
              </Text>
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
