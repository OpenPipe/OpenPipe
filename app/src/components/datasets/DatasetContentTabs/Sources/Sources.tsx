import { useCallback, useState } from "react";
import { VStack, HStack, Text, Button, Box, Divider } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { setActiveTab } from "~/components/ContentTabs";
import { DATASET_GENERAL_TAB_KEY } from "../DatasetContentTabs";
import { useDataset, useDatasetArchives, useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { RemoveSourceDialog } from "./RemoveSourceDialog";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { ProjectLink } from "~/components/ProjectLink";
import RelabelArchiveDialog, { type DatasetArchive } from "./RelabelArchiveDialog";
import { RelabelOption } from "~/server/utils/nodes/node.types";

const Sources = () => {
  const dataset = useDataset().data;

  const archives = useDatasetArchives().data;

  const selectedProject = useSelectedProject().data;

  const [archiveToRelabel, setArchiveToRelabel] = useState<DatasetArchive | null>(null);
  const [sourceToRemove, setSourceToRemove] = useState<DatasetArchive | null>(null);

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

  if (!archives?.length)
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
    <Box px={8} pb={8}>
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
          <Box key={archive.id}>
            {!!index && <Divider key={`${archive.id}-divider`} color="gray.300" my={1} />}
            <VStack key={archive.id} w="full" spacing={2} alignItems="flex-start" p={4}>
              <HStack w="full" justifyContent="space-between" alignItems="flex-start">
                <VStack alignItems="flex-start" spacing={1} pb={4}>
                  <Text fontWeight="bold">{archive.name}</Text>
                  <Button
                    variant="link"
                    fontSize="sm"
                    colorScheme="blue"
                    onClick={() => setArchiveToRelabel(archive)}
                  >
                    {getRelabelOptionDisplayText(archive.relabelOption)}
                  </Button>
                </VStack>

                <Button
                  variant="ghost"
                  colorScheme="red"
                  my={-2}
                  onClick={() => setSourceToRemove(archive)}
                >
                  Remove
                </Button>
              </HStack>
              <HStack>
                <Text w={180}>Creation Date</Text>
                <Text fontSize="sm" color="gray.500">
                  {dayjs(archive.createdAt).format("MMMM D, YYYY h:mm A")}
                </Text>
              </HStack>
              <HStack>
                <Text w={180}>Training Entries</Text>
                <Text fontSize="sm" color="gray.500">
                  {archive.numTrainEntries.toLocaleString()}
                </Text>
              </HStack>
              <HStack>
                <Text w={180}>Testing Entries</Text>
                <Text fontSize="sm" color="gray.500">
                  {archive.numTestEntries.toLocaleString()}
                </Text>
              </HStack>
              <HStack>
                <Text w={180}>Total Entries</Text>
                <Button
                  variant="link"
                  fontSize="sm"
                  colorScheme="blue"
                  minW={0}
                  onClick={() => filterToSource(archive.id)}
                >
                  {(archive.numTrainEntries + archive.numTestEntries).toLocaleString()}
                </Button>
              </HStack>
            </VStack>
          </Box>
        ))}
      </VStack>
      <RelabelArchiveDialog archive={archiveToRelabel} onClose={() => setArchiveToRelabel(null)} />
      <RemoveSourceDialog source={sourceToRemove} onClose={() => setSourceToRemove(null)} />
    </Box>
  );
};

const getRelabelOptionDisplayText = (relabelOption: RelabelOption) => {
  if (relabelOption === RelabelOption.SkipRelabel) {
    return "Relabel entries";
  }
  return `Relabeled by ${relabelOption}`;
};

export default Sources;
