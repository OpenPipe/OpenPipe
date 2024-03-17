import { useEffect, useState, useMemo } from "react";
import {
  VStack,
  Card,
  Skeleton,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
} from "@chakra-ui/react";

import { useMonitor } from "../../../useMonitor";
import { LabelText } from "../styledText";
import { type RouterOutputs } from "~/utils/api";
import { useDatasets, useHandledAsyncCallback } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { api } from "~/utils/api";
import { toast } from "~/theme/ChakraThemeProvider";
import { type ConnectedDataset, DisconnectDatasetDialog } from "./DisconnectDatasetDialog";
import RelabelSourceDialog from "~/components/datasets/DatasetContentTabs/Sources/RelabelSourceDialog";
import { ProjectLink } from "~/components/ProjectLink";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { DATASET_GENERAL_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import NodeEntriesBottomDrawer from "~/components/nodeEntries/NodeEntriesBottomDrawer";
import { MdEdit } from "react-icons/md";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";

type DatasetToConnect = RouterOutputs["datasets"]["list"][number];

const DatasetsBlock = () => {
  const allDatasets = useDatasets().data;
  const monitor = useMonitor().data;

  const currentDatasets = monitor?.datasets;

  const [datasetToConnect, setDatasetToConnect] = useState<DatasetToConnect | null>(null);
  const [datasetToDisconnect, setDatasetToDisconnect] = useState<ConnectedDataset | null>(null);
  const [datasetToRelabel, setDatasetToRelabel] = useState<ConnectedDataset | null>(null);
  const [relabeledConnectionToView, setRelabeledConnectionToView] =
    useState<ConnectedDataset | null>(null);

  const availableDatasets = useMemo(
    () =>
      allDatasets
        ? allDatasets.filter((d1) => !currentDatasets?.some((d2) => d1.nodeId === d2.nodeId))
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
      datasetToDisconnect?: ConnectedDataset;
    }) => {
      if (saveDisabled || (!datasetToConnect && !datasetToDisconnect)) return;

      const connectedManualRelabelNodeIds = currentDatasets.map(
        (dataset) => dataset.node.config.manualRelabelNodeId,
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
              (id) => id !== datasetToDisconnect.node.config.manualRelabelNodeId,
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
      <Card width="100%">
        <Skeleton isLoaded={!!monitor}>
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Relabeling Method</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody fontSize="sm">
              {monitor &&
                currentDatasets?.map((dataset) => {
                  const isRelabeling = !!dataset.numUnrelabeledEntries;
                  return (
                    <Tr key={dataset.id}>
                      <Td>
                        <ProjectLink
                          href={{
                            pathname: "/datasets/[id]/[tab]",
                            query: {
                              id: dataset.id,
                              tab: DATASET_GENERAL_TAB_KEY,
                              ...constructFiltersQueryParams({
                                filters: [
                                  {
                                    id: Date.now().toString(),
                                    field: GeneralFiltersDefaultFields.Source,
                                    comparator: "=",
                                    value: monitor.id,
                                  },
                                ],
                              }),
                            },
                          }}
                        >
                          <LabelText
                            color="blue.600"
                            fontWeight={500}
                            _hover={{ textDecoration: "underline" }}
                          >
                            {dataset.name}
                          </LabelText>
                        </ProjectLink>
                      </Td>
                      <Td>
                        <Button
                          variant="ghost"
                          size="sm"
                          colorScheme="gray"
                          onClick={() => setDatasetToRelabel(dataset)}
                        >
                          {dataset.llmRelabelNode.config.relabelLLM}
                          <Icon as={MdEdit} ml={1} />
                        </Button>
                      </Td>
                      <Td display="flex" justifyContent="flex-end" alignItems="center">
                        <HStack spacing={1}>
                          <BlockProcessingIndicator isProcessing={isRelabeling} />
                          <Button
                            variant="ghost"
                            size="sm"
                            colorScheme="blue"
                            onClick={() => setRelabeledConnectionToView(dataset)}
                          >
                            {isRelabeling
                              ? `${dataset.numRelabeledEntries}/${
                                  dataset.numUnrelabeledEntries + dataset.numRelabeledEntries
                                }`
                              : "Preview Data"}
                          </Button>
                        </HStack>

                        <Button
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                          onClick={() => setDatasetToDisconnect(dataset)}
                        >
                          Disconnect
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
            </Tbody>
          </Table>
          {availableDatasets.length && datasetToConnect && (
            <VStack w="full" alignItems="flex-start" p={4} spacing={4}>
              <LabelText>Connect New Dataset</LabelText>
              <HStack w="full" justifyContent="space-between">
                <InputDropdown
                  selectedOption={datasetToConnect}
                  options={availableDatasets}
                  getDisplayLabel={(option) => option.name}
                  onSelect={setDatasetToConnect}
                  placement="top-start"
                  maxPopoverContentHeight={400}
                  minItemHeight={10}
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
        </Skeleton>
      </Card>
      <DisconnectDatasetDialog
        dataset={datasetToDisconnect}
        onConfirm={() => {
          if (datasetToDisconnect) updateMonitor({ datasetToDisconnect });
          setDatasetToDisconnect(null);
        }}
        onCancel={() => setDatasetToDisconnect(null)}
      />
      <RelabelSourceDialog
        source={
          monitor && datasetToRelabel
            ? {
                name: monitor.name,
                relabelOption: datasetToRelabel.llmRelabelNode?.config.relabelLLM,
                numTotalEntries: monitor.numPassedEntries,
                llmRelabelNodeId: datasetToRelabel.llmRelabelNode.id,
              }
            : null
        }
        onClose={() => setDatasetToRelabel(null)}
      />
      <NodeEntriesBottomDrawer
        nodeId={relabeledConnectionToView?.llmRelabelNodeId}
        onClose={() => setRelabeledConnectionToView(null)}
      />
    </>
  );
};

export default DatasetsBlock;
