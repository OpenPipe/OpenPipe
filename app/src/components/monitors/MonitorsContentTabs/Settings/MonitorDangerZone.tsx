import { useState, useEffect } from "react";
import { VStack, Text, Heading, HStack, InputGroup, Input, Button } from "@chakra-ui/react";

import { api } from "~/utils/api";
import { DeleteMonitorButton } from "./DeleteMonitorButton";
import ContentCard from "~/components/ContentCard";
import { useHandledAsyncCallback } from "~/utils/hooks";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { useMonitor } from "../../useMonitor";

const MonitorDangerZone = () => {
  const monitor = useMonitor().data;

  const [monitorNameToSave, setMonitorNameToSave] = useState(monitor?.name);

  useEffect(() => {
    setMonitorNameToSave(monitor?.name);
  }, [monitor?.name]);

  const utils = api.useUtils();

  const updateMutation = api.monitors.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (monitorNameToSave && monitorNameToSave !== monitor?.name && monitor?.id) {
      await updateMutation.mutateAsync({
        id: monitor.id,
        updates: {
          name: monitorNameToSave,
        },
      });
      await Promise.all([utils.monitors.list.invalidate(), utils.monitors.get.invalidate()]);
    }
  }, [updateMutation, monitor?.id, monitor?.name, monitorNameToSave]);

  return (
    <ContentCard>
      <VStack spacing={8} align="left">
        <Heading size="md" fontWeight="bold">
          General Settings
        </Heading>
        <VStack spacing={4} w="full" alignItems="flex-start">
          <Text fontWeight="bold">Change Monitor Name</Text>
          <HStack>
            <InputGroup w={96}>
              <Input
                bgColor="white"
                value={monitorNameToSave}
                onChange={(e) => setMonitorNameToSave(e.target.value)}
                placeholder="unique-id"
              />
            </InputGroup>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!!monitorNameToSave, "Please enter a name for your monitor"],
                [monitorNameToSave !== monitor?.name, ""],
              ]}
            >
              <Button colorScheme="orange" onClick={onSaveName} minW={24}>
                Save
              </Button>
            </ConditionallyEnable>
          </HStack>
        </VStack>
        <VStack w="full" alignItems="flex-start" spacing={4}>
          <Text fontWeight="bold">Delete Monitor</Text>
          <DeleteMonitorButton />
          <Text>
            Deleting this monitor will also delete all entries derived from it. This action cannot
            be undone, so make sure you won't need this data in the future.
          </Text>
        </VStack>
      </VStack>
    </ContentCard>
  );
};

export default MonitorDangerZone;
