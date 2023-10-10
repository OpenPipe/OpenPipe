import { VStack, HStack, Text, Button, Heading } from "@chakra-ui/react";
import { displayBaseModel } from "~/utils/baseModels";
import { useFineTune, useHandledAsyncCallback } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import FineTuneDangerZone from "./FineTuneDangerZone";
import dayjs from "~/utils/dayjs";
import { getStatusColor } from "../../FineTunesTable";
import ColoredPercent from "~/components/ColoredPercent";
import { api } from "~/utils/api";

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
    <VStack w="full" h="full" justifyContent="space-between" pb={12}>
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard>
          <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white">
            <Heading size="md" pb={4}>
              Overview
            </Heading>
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
              <Text w={180}>Test Set Accuracy</Text>
              <ColoredPercent value={fineTune.averageScore} />
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
        <FineTuneDangerZone />
      </VStack>
    </VStack>
  );
};

export default General;
