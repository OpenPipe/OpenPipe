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
} from "@chakra-ui/react";

import { useMonitor } from "../../../useMonitor";
import { LabelText } from "../styledText";
import { type RouterOutputs } from "~/utils/api";
import { useDatasets, useHandledAsyncCallback } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { api } from "~/utils/api";
import { toast } from "~/theme/ChakraThemeProvider";
import { type DatasetToDisconnect, DisconnectDatasetDialog } from "./DisconnectDatasetDialog";
import { ProjectLink } from "~/components/ProjectLink";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { DATASET_GENERAL_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";

type DatasetToConnect = RouterOutputs["datasets"]["list"][number];

const DatasetsBlock = () => {
  const allDatasets = useDatasets().data;
  const monitor = useMonitor().data;

  const currentDatasets = monitor?.datasets;

  const [datasetToConnect, setDatasetToConnect] = useState<DatasetToConnect | null>(null);
  const [datasetToDisconnect, setDatasetToDisconnect] = useState<DatasetToDisconnect | null>(null);

  const availableDatasets = useMemo(
    () =>
      allDatasets
        ? allDatasets.filter((d1) => !currentDatasets?.some((d2) => d1.nodeId === d2.nodeId))
        : [],
    [allDatasets, currentDatasets],
  );

  const datasets = useMemo(() => {
    return allDatasets?.map((dataset) => {
      const connectedDataset = currentDatasets?.find((d) => d.nodeId === dataset.nodeId);
      if (connectedDataset) {
        return connectedDataset;
      }
      return dataset;
    });
  }, [allDatasets, currentDatasets]);

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
                <Th>Relabeled Data</Th>
                <Th isNumeric>Connection</Th>
              </Tr>
            </Thead>
            <Tbody>
              {monitor &&
                datasets?.map((dataset) => {
                  const isConnected = "llmRelabelNode" in dataset;
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
                        {isConnected ? (
                          <Button variant="link" fontWeight="400" colorScheme="blue">
                            {dataset.llmRelabelNode?.config.relabelLLM}
                          </Button>
                        ) : undefined}
                      </Td>
                      <Td>
                        {isConnected ? (
                          <Button variant="link" fontWeight="400" colorScheme="blue">
                            View
                          </Button>
                        ) : undefined}
                      </Td>
                      <Td isNumeric>
                        {isConnected ? (
                          <Button
                            variant="ghost"
                            colorScheme="red"
                            size="sm"
                            onClick={() => setDatasetToDisconnect(dataset)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            colorScheme="blue"
                            size="sm"
                            onClick={() => updateMonitor({ datasetToConnect: dataset })}
                          >
                            Connect
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
            </Tbody>
          </Table>
        </Skeleton>
      </Card>
      <Card width="100%">
        <Skeleton isLoaded={!!monitor}>
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Relabeling Method</Th>
                <Th>Relabeled Data</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {monitor &&
                currentDatasets?.map((dataset) => {
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
                        <Button variant="link" fontWeight="400">
                          {dataset.llmRelabelNode?.config.relabelLLM}
                        </Button>
                      </Td>
                      <Td>
                        <Button variant="link" fontWeight="400">
                          View
                        </Button>
                      </Td>
                      <Td display="flex" justifyContent="flex-end">
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
              <LabelText>Add Dataset</LabelText>
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
      <Card w="full">
        <Skeleton isLoaded={!!monitor && !!allDatasets}>
          <VStack alignItems="flex-start" spacing={4} w="full">
            {monitor &&
              currentDatasets?.map((dataset, i) => (
                <VStack
                  key={dataset.id}
                  w="full"
                  alignItems="flex-start"
                  borderTopWidth={i ? 1 : 0}
                  p={4}
                >
                  <HStack w="full" justifyContent="space-between">
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
                      <LabelText color="blue.600" _hover={{ textDecoration: "underline" }}>
                        {dataset.name}
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
                <LabelText>Add Dataset</LabelText>
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
          </VStack>
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
    </>
  );
};

export default DatasetsBlock;
