import { useState, useEffect } from "react";
import { Text, VStack, HStack, Tooltip, Box, GridItem, Icon } from "@chakra-ui/react";
import Link from "next/link";
import { BiSolidUpArrowAlt, BiSolidDownArrowAlt } from "react-icons/bi";

import ColoredPercent from "~/components/ColoredPercent";
import { useDataset, useModelTestingStats, useTestingEntries } from "~/utils/hooks";
import { displayBaseModel } from "~/utils/baseModels";
import { useTestEntrySortOrder } from "../useTestEntrySortOrder";
import { SortOrder } from "~/types/shared.types";

const ModelHeader = ({ modelId }: { modelId: string }) => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const dataset = useDataset().data;
  const stats = useModelTestingStats(dataset?.id, modelId, refetchInterval).data;
  const entries = useTestingEntries().data;
  const { sortModelSlug, sortOrder, setSortCriteria } = useTestEntrySortOrder();

  useEffect(() => {
    if (!stats?.finishedCount || !entries?.count || stats?.finishedCount < entries?.count) {
      setRefetchInterval(5000);
    } else {
      setRefetchInterval(0);
    }
  }, [stats?.finishedCount, entries?.count]);

  if (!stats || !entries) return <GridItem />;

  return (
    <VStack alignItems="flex-start">
      <HStack w="full" justifyContent="space-between">
        {stats.isComparisonModel ? (
          <Text fontWeight="bold" color="gray.500">
            {stats.slug}
          </Text>
        ) : (
          <Text
            as={Link}
            href={{ pathname: "/fine-tunes/[id]", query: { id: modelId } }}
            _hover={{ textDecoration: "underline" }}
            fontWeight="bold"
            color="gray.500"
          >
            openpipe:{stats.slug}
          </Text>
        )}
        {stats.averageScore !== null && (
          <HStack spacing={1}>
            <Tooltip
              label={
                <>
                  <Text>
                    % of fields from the ground truth that are exactly matched in the model's
                    output.
                  </Text>
                  <Text>We'll let you customize this calculation in the future.</Text>
                </>
              }
              aria-label="Help about accuracy"
            >
              <Box>
                <ColoredPercent value={stats.averageScore} />
              </Box>
            </Tooltip>
            <Tooltip label={`Sort by ${stats.slug} accuracy`}>
              <VStack
                spacing={0}
                h={6}
                cursor="pointer"
                mb={1}
                onClick={() => {
                  const modelSelected = sortModelSlug === stats.slug;
                  if (!modelSelected) {
                    setSortCriteria(stats.slug, SortOrder.DESC);
                  } else if (sortOrder === SortOrder.DESC) {
                    setSortCriteria(stats.slug, SortOrder.ASC);
                  } else {
                    setSortCriteria(null, null);
                  }
                }}
              >
                <Icon
                  as={BiSolidUpArrowAlt}
                  color={
                    sortModelSlug === stats.slug && sortOrder === SortOrder.ASC
                      ? "orange.400"
                      : "gray.500"
                  }
                  boxSize={4}
                  strokeWidth={2}
                  mb={-1}
                />
                <Icon
                  as={BiSolidDownArrowAlt}
                  color={
                    sortModelSlug === stats.slug && sortOrder === SortOrder.DESC
                      ? "orange.400"
                      : "gray.500"
                  }
                  boxSize={4}
                  strokeWidth={2}
                />
              </VStack>
            </Tooltip>
          </HStack>
        )}
      </HStack>
      <HStack>
        {stats.baseModel && <Text color="gray.500">{displayBaseModel(stats.baseModel)}</Text>}

        {stats.finishedCount < entries.count && (
          <Text>
            {stats.finishedCount}/{entries.count}
          </Text>
        )}
      </HStack>
    </VStack>
  );
};

export default ModelHeader;
