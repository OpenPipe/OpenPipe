import { useState, useEffect } from "react";
import { VStack, Card, Skeleton, RadioGroup, Stack, Radio, HStack, Button } from "@chakra-ui/react";

import { useMonitor } from "../../useMonitor";
import { RelabelOption, relabelOptions } from "~/server/utils/nodes/node.types";
import { LabelText } from "./styledText";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { toast } from "~/theme/ChakraThemeProvider";

const RelabelingBlock = () => {
  const monitor = useMonitor().data;

  const savedRelabelOption = monitor?.llmRelabel.config.relabelLLM;

  const [relabelOption, setRelabelOption] = useState<RelabelOption>(RelabelOption.SkipRelabel);

  useEffect(() => {
    if (savedRelabelOption) {
      setRelabelOption(savedRelabelOption);
    }
  }, [savedRelabelOption]);

  const saveDisabled = !monitor || relabelOption === savedRelabelOption;

  const utils = api.useUtils();

  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await monitorUpdateMutation.mutateAsync({
      id: monitor.id,
      updates: {
        relabelLLM: relabelOption,
      },
    });

    toast({
      description: "Relabeling model updated",
      status: "success",
    });

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [monitorUpdateMutation, utils, saveDisabled, monitor?.id, relabelOption]);

  return (
    <Card w="full">
      <Skeleton isLoaded={!!monitor}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <VStack alignItems="flex-start">
            <LabelText>Model</LabelText>
            {/* TODO: Require API key */}
            <RadioGroup
              colorScheme="orange"
              onChange={(option) => setRelabelOption(option as RelabelOption)}
              value={relabelOption}
            >
              <Stack>
                {relabelOptions.map((option) => (
                  <Radio key={option} value={option}>
                    {option}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </VStack>
          <HStack w="full" justifyContent="flex-end">
            <Button
              onClick={() => {
                if (savedRelabelOption) setRelabelOption(savedRelabelOption);
              }}
              isDisabled={saveDisabled || updatingMonitor}
            >
              Reset
            </Button>
            <Button
              colorScheme="blue"
              isDisabled={saveDisabled || updatingMonitor}
              onClick={updateMonitor}
            >
              Save
            </Button>
          </HStack>
        </VStack>
      </Skeleton>
    </Card>
  );
};

export default RelabelingBlock;
