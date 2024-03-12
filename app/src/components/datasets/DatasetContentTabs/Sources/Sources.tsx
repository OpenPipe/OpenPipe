import { useCallback, useState } from "react";
import { VStack, HStack, Text, Button, Box, Divider, Heading } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { setActiveTab } from "~/components/ContentTabs";
import { DATASET_GENERAL_TAB_KEY } from "../DatasetContentTabs";
import { useDataset, useDatasetSources, useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { RemoveSourceDialog } from "./RemoveSourceDialog";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { ProjectLink } from "~/components/ProjectLink";
import RelabelArchiveDialog, { type DatasetSource } from "./RelabelArchiveDialog";
import { RelabelOption } from "~/server/utils/nodes/node.types";
import { LabelText } from "~/components/monitors/MonitorsContentTabs/General/styledText";
import { MONITOR_GENERAL_KEY } from "~/components/monitors/MonitorsContentTabs/MonitorsContentTabs";

const Sources = () => {
  const dataset = useDataset().data;

  const sources = useDatasetSources().data ?? [];

  const monitors = sources.filter((source) => source.type === "Monitor");
  const archives = sources.filter((source) => source.type === "Archive");

  const selectedProject = useSelectedProject().data;

  const [archiveToRelabel, setArchiveToRelabel] = useState<DatasetSource | null>(null);
  const [sourceToRemove, setSourceToRemove] = useState<DatasetSource | null>(null);

  const router = useRouter();

  const filterToSource = useCallback(
    (sourceNodeId: string) => {
      if (!selectedProject || !dataset?.id) return;

      const filtersQueryParams = constructFiltersQueryParams({
        filters: [
          {
            id: Date.now().toString(),
            field: GeneralFiltersDefaultFields.Source,
            comparator: "=",
            value: sourceNodeId,
          },
        ],
      });

      void router.push({
        pathname: "/p/[projectSlug]/datasets/[id]/[tab]",
        query: {
          projectSlug: selectedProject.slug,
          id: dataset.id,
          tab: DATASET_GENERAL_TAB_KEY,
          ...filtersQueryParams,
        },
      });
    },
    [router, selectedProject, dataset?.id],
  );

  if (!sources.length)
    return (
      <Text px={8}>
        No dataset entries have been added to this dataset. You can import from{" "}
        <Button
          as={ProjectLink}
          href="/request-logs"
          variant="link"
          _hover={{ textDecor: "underline" }}
        >
          Request Logs
        </Button>{" "}
        or upload a dataset in the{" "}
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

  return (
    <VStack alignItems="flex-start" spacing={8} px={8} pb={8}>
      {monitors.length && (
        <VStack w="full" alignItems="flex-start">
          <Heading size="md">Monitors</Heading>
          <VStack
            spacing={0}
            alignItems="flex-start"
            w="full"
            bgColor="white"
            borderRadius={4}
            borderColor="gray.300"
            borderWidth={1}
          >
            {monitors.map((monitor, index) => (
              <Box key={monitor.id} w="full">
                {!!index && <Divider color="gray.300" my={1} />}
                <Source
                  source={monitor}
                  filterToSource={filterToSource}
                  openRemoveDialog={() => setSourceToRemove(monitor)}
                />
              </Box>
            ))}
          </VStack>
        </VStack>
      )}
      {archives.length && (
        <VStack w="full" alignItems="flex-start">
          <Heading size="md">Archives</Heading>
          <VStack
            spacing={0}
            alignItems="flex-start"
            w="full"
            bgColor="white"
            borderRadius={4}
            borderColor="gray.300"
            borderWidth={1}
          >
            {archives.map((archive, index) => (
              <Box key={archive.id} w="full">
                {!!index && <Divider color="gray.300" my={1} />}
                <Source
                  source={archive}
                  filterToSource={filterToSource}
                  openRemoveDialog={() => setSourceToRemove(archive)}
                  openRelabelDialog={() => setArchiveToRelabel(archive)}
                />
              </Box>
            ))}
          </VStack>
        </VStack>
      )}

      <RelabelArchiveDialog archive={archiveToRelabel} onClose={() => setArchiveToRelabel(null)} />
      <RemoveSourceDialog source={sourceToRemove} onClose={() => setSourceToRemove(null)} />
    </VStack>
  );
};

const Source = ({
  source,
  filterToSource,
  openRemoveDialog,
  openRelabelDialog,
}: {
  source: DatasetSource;
  filterToSource: (sourceId: string) => void;
  openRemoveDialog: () => void;
  openRelabelDialog?: () => void;
}) => {
  const relabelOptionText = getRelabelOptionText({
    relabelOption: source.relabelOption,
    suggestRelabeling: source.type === "Archive",
  });

  return (
    <VStack w="full" spacing={2} alignItems="flex-start" p={4}>
      <HStack w="full" justifyContent="space-between" alignItems="flex-start">
        <VStack alignItems="flex-start" spacing={1} pb={4}>
          {source.type === "Monitor" ? (
            <Text
              as={ProjectLink}
              fontWeight="bold"
              _hover={{ textDecor: "underline" }}
              href={{
                pathname: "/monitors/[id]/[tab]",
                query: {
                  id: source.id,
                  tab: MONITOR_GENERAL_KEY,
                },
              }}
              target="_blank"
            >
              {source.name}
            </Text>
          ) : (
            <Text fontWeight="bold">{source.name}</Text>
          )}
          {openRelabelDialog ? (
            <Button variant="link" fontSize="sm" colorScheme="blue" onClick={openRelabelDialog}>
              {relabelOptionText}
            </Button>
          ) : (
            <LabelText fontSize="sm">{relabelOptionText}</LabelText>
          )}
        </VStack>

        {openRemoveDialog && (
          <Button variant="ghost" colorScheme="red" my={-2} onClick={openRemoveDialog}>
            Remove
          </Button>
        )}
      </HStack>
      <HStack>
        <Text w={180}>Creation Date</Text>
        <Text fontSize="sm" color="gray.500">
          {dayjs(source.createdAt).format("MMMM D, YYYY h:mm A")}
        </Text>
      </HStack>
      <HStack>
        <Text w={180}>Training Entries</Text>
        <Text fontSize="sm" color="gray.500">
          {source.numTrainEntries.toLocaleString()}
        </Text>
      </HStack>
      <HStack>
        <Text w={180}>Testing Entries</Text>
        <Text fontSize="sm" color="gray.500">
          {source.numTestEntries.toLocaleString()}
        </Text>
      </HStack>
      <HStack>
        <Text w={180}>Total Entries</Text>
        <Button
          variant="link"
          fontSize="sm"
          colorScheme="blue"
          minW={0}
          onClick={() => filterToSource(source.id)}
        >
          {(source.numTrainEntries + source.numTestEntries).toLocaleString()}
        </Button>
      </HStack>
    </VStack>
  );
};

const getRelabelOptionText = ({
  relabelOption,
  suggestRelabeling,
}: {
  relabelOption: RelabelOption;
  suggestRelabeling: boolean;
}) => {
  if (relabelOption === RelabelOption.SkipRelabel) {
    return suggestRelabeling ? "Relabel entries" : "Relabeling skipped";
  }
  return `Relabeled by ${relabelOption}`;
};

export default Sources;
