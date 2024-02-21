import { useCallback, useState } from "react";
import { VStack, HStack, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { setActiveTab } from "~/components/ContentTabs";
import { DATASET_GENERAL_TAB_KEY } from "../DatasetContentTabs";
import { useDataset, useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { type Source, RemoveSourceDialog } from "./RemoveSourceDialog";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { ProjectLink } from "~/components/ProjectLink";

const Sources = () => {
  const dataset = useDataset().data;

  const selectedProject = useSelectedProject().data;

  const [sourceToRemove, setSourceToRemove] = useState<Source | null>(null);

  const router = useRouter();

  const filterToSource = useCallback(
    (sourceNodeId: string) => {
      if (!selectedProject || !dataset?.id) return;

      const filtersQueryParams = constructFiltersQueryParams([
        {
          id: Date.now().toString(),
          field: GeneralFiltersDefaultFields.Source,
          comparator: "=",
          value: sourceNodeId,
        },
      ]);

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

  if (!dataset?.archives.length)
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

  const archives = dataset.archives;

  return (
    <>
      <VStack spacing={4} alignItems="flex-start" w="full" px={8} pb={8}>
        {archives.map((archive) => (
          <VStack
            key={archive.id}
            w="full"
            bgColor="white"
            spacing={2}
            alignItems="flex-start"
            borderWidth={1}
            borderColor="gray.300"
            borderRadius={4}
            p={4}
          >
            <HStack w="full" justifyContent="space-between">
              <Text fontWeight="bold" pb={4}>
                {archive.name}
              </Text>
              <Button variant="ghost" colorScheme="red" onClick={() => setSourceToRemove(archive)}>
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
        ))}
      </VStack>
      <RemoveSourceDialog source={sourceToRemove} onClose={() => setSourceToRemove(null)} />
    </>
  );
};

export default Sources;
