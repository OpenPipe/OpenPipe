import { useEffect, useState, useMemo } from "react";
import { VStack, Card, Skeleton, HStack, Button } from "@chakra-ui/react";

import { useMonitor } from "../../../useMonitor";
import { LabelText } from "../styledText";
import { type RouterOutputs } from "~/utils/api";
import { useDatasets, useHandledAsyncCallback } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { api } from "~/utils/api";
import { toast } from "~/theme/ChakraThemeProvider";
import { type DatasetToDisconnect, DisconnectDatasetDialog } from "./DisconnectDatasetDialog";
import { ProjectLink } from "~/components/ProjectLink";

type DatasetToConnect = RouterOutputs["datasets"]["list"][number];

const DatasetsBlock = () => {
  const allDatasets = useDatasets().data;
  const monitor = useMonitor().data;

  const currentDatasets = monitor?.datasetNodes;

  const [datasetToConnect, setDatasetToConnect] = useState<DatasetToConnect | null>(null);
  const [datasetToDisconnect, setDatasetToDisconnect] = useState<DatasetToDisconnect | null>(null);

  const availableDatasets = useMemo(
    () =>
      allDatasets
        ? allDatasets.filter(
            (node) => !currentDatasets?.some((dataset) => dataset.datasetId === node.id),
          )
        : [],
    [allDatasets, currentDatasets],
  );

  useEffect(() => {
    if (availableDatasets?.[0]) {
      setDatasetToConnect(availableDatasets[0]);
    }
  }, [availableDatasets?.length]);

  const saveDisabled = !datasetToConnect || !currentDatasets;

  const utils = api.useUtils();
  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(
    async ({
      datasetToConnect,
      datasetToDisconnect,
    }: {
      datasetToConnect?: DatasetToConnect;
      datasetToDisconnect?: DatasetToDisconnect;
    }) => {
      if (saveDisabled || (!datasetToConnect && !datasetToDisconnect)) return;

      const connectedManualRelabelNodeIds = currentDatasets.map(
        (dataset) => dataset.config.manualRelabelNodeId,
      );

      if (datasetToConnect) {
        await monitorUpdateMutation.mutateAsync({
          id: monitor?.id,
          updates: {
            datasetManualRelabelNodeIds: connectedManualRelabelNodeIds.concat(
              datasetToConnect.node.config.manualRelabelNodeId,
            ),
          },
        });

        toast({
          description: "Dataset connected",
          status: "success",
        });
      } else if (datasetToDisconnect) {
        await monitorUpdateMutation.mutateAsync({
          id: monitor?.id,
          updates: {
            datasetManualRelabelNodeIds: connectedManualRelabelNodeIds.filter(
              (id) => id !== datasetToDisconnect.config.manualRelabelNodeId,
            ),
          },
        });

        toast({
          description: "Dataset disconnected",
          status: "success",
        });
      }

      await utils.monitors.list.invalidate();
      await utils.monitors.get.invalidate({ id: monitor?.id });
    },
    [monitorUpdateMutation, utils, saveDisabled, monitor?.id, currentDatasets],
  );

  return (
    <>
      <Card w="full">
        <Skeleton isLoaded={!!monitor && !!allDatasets}>
          <VStack alignItems="flex-start" spacing={4} w="full">
            {currentDatasets?.map((dataset, i) => (
              <VStack
                key={dataset.datasetId}
                w="full"
                alignItems="flex-start"
                borderTopWidth={i ? 1 : 0}
                p={4}
              >
                <HStack w="full" justifyContent="space-between">
                  <ProjectLink
                    href={{ pathname: "/datasets/[id]", query: { id: dataset.datasetId } }}
                  >
                    <LabelText color="blue.600" _hover={{ textDecoration: "underline" }}>
                      {dataset.datasetName}
                    </LabelText>
                  </ProjectLink>
                  <Button
                    variant="ghost"
                    colorScheme="red"
                    size="sm"
                    onClick={() => setDatasetToDisconnect(dataset)}
                  >
                    Disconnect
                  </Button>
                </HStack>
              </VStack>
            ))}
            {availableDatasets.length && datasetToConnect && (
              <VStack
                w="full"
                alignItems="flex-start"
                p={4}
                spacing={4}
                borderTopWidth={currentDatasets?.length ? 1 : 0}
              >
                <LabelText>New Dataset</LabelText>
                <HStack w="full" justifyContent="space-between">
                  <InputDropdown
                    selectedOption={datasetToConnect}
                    options={availableDatasets}
                    getDisplayLabel={(option) => option.name}
                    onSelect={setDatasetToConnect}
                  />
                  <Button
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    onClick={() => updateMonitor({ datasetToConnect })}
                    isLoading={updatingMonitor}
                    isDisabled={saveDisabled}
                  >
                    Connect
                  </Button>
                </HStack>
              </VStack>
            )}
          </VStack>
        </Skeleton>
      </Card>
      <DisconnectDatasetDialog
        dataset={datasetToDisconnect}
        onConfirm={() => {
          if (datasetToDisconnect) updateMonitor({ datasetToDisconnect });
        }}
        onCancel={() => setDatasetToDisconnect(null)}
      />
    </>
  );
};

export default DatasetsBlock;
