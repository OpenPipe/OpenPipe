import { Box, Td, Tr, Thead, Th, Tooltip, HStack, Text, Checkbox } from "@chakra-ui/react";
import Link from "next/link";
import { DatasetEntrySplit, RelabelRequestStatus } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { type RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { useIsClientRehydrated, useDatasetEntries } from "~/utils/hooks";
import { useMemo } from "react";
import { useFilters } from "~/components/Filters/useFilters";

type DatasetEntry = RouterOutputs["datasetEntries"]["list"]["entries"][0];

export const TableHeader = ({ showRelabelStatusColumn }: { showRelabelStatusColumn: boolean }) => {
  const matchingDatasetEntryIds = useDatasetEntries().data?.matchingEntryIds;
  const selectedDatasetEntryIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  const addSelectedIds = useAppStore((s) => s.selectedDatasetEntries.addSelectedIds);
  const clearSelectedIds = useAppStore((s) => s.selectedDatasetEntries.clearSelectedIds);
  const allSelected = useMemo(() => {
    if (!matchingDatasetEntryIds || !matchingDatasetEntryIds.length) return false;
    return matchingDatasetEntryIds.every((id) => selectedDatasetEntryIds.has(id));
  }, [matchingDatasetEntryIds, selectedDatasetEntryIds]);
  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <Thead>
      <Tr>
        <Th pr={0}>
          <HStack minW={16}>
            <Checkbox
              isChecked={allSelected}
              onChange={() => {
                allSelected ? clearSelectedIds() : addSelectedIds(matchingDatasetEntryIds || []);
              }}
              _hover={{ borderColor: "gray.300" }}
            />
            <Text>
              (
              {selectedDatasetEntryIds.size
                ? `${selectedDatasetEntryIds.size.toLocaleString()}/`
                : ""}
              {(matchingDatasetEntryIds?.length || 0).toLocaleString()})
            </Text>
          </HStack>
        </Th>
        <Th>Created At</Th>
        {showRelabelStatusColumn && <Th>Relabeling Status</Th>}
        <Th isNumeric>Input tokens</Th>
        <Th isNumeric>Output tokens</Th>
        <Th isNumeric>Split</Th>
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  datasetEntry,
  toggleExpanded,
  showOptions,
  showRelabelStatusColumn,
}: {
  datasetEntry: DatasetEntry;
  toggleExpanded: (entryId: string) => void;
  showOptions?: boolean;
  showRelabelStatusColumn?: boolean;
}) => {
  const createdAt = dayjs(datasetEntry.createdAt).format("MMMM D h:mm A");
  const fullTime = dayjs(datasetEntry.createdAt).toString();

  const isChecked = useAppStore((s) => s.selectedDatasetEntries.selectedIds.has(datasetEntry.id));
  const toggleChecked = useAppStore((s) => s.selectedDatasetEntries.toggleSelectedId);

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <Tr
      onClick={() => toggleExpanded(datasetEntry.id)}
      key={datasetEntry.id}
      _hover={{ bgColor: "gray.50", cursor: "pointer" }}
      fontSize="sm"
    >
      {showOptions && (
        <Td>
          <Checkbox
            isChecked={isChecked}
            onChange={() => toggleChecked(datasetEntry.id)}
            _hover={{ borderColor: "gray.300" }}
          />
        </Td>
      )}
      <Td>
        <Tooltip label={fullTime} placement="top">
          <Box whiteSpace="nowrap" minW="120px">
            {createdAt}
          </Box>
        </Tooltip>
      </Td>
      {showRelabelStatusColumn && (
        <Td>
          <RelabelingStatus status={datasetEntry.relabelStatuses?.[0]?.status} />
        </Td>
      )}
      <Td isNumeric>{datasetEntry.inputTokens.toLocaleString()}</Td>
      <Td isNumeric>{datasetEntry.outputTokens.toLocaleString()}</Td>
      <Td isNumeric>
        <EntrySplit split={datasetEntry.split} />
      </Td>
    </Tr>
  );
};

const EntrySplit = ({ split }: { split: string }) => {
  const color = split === DatasetEntrySplit.TRAIN ? "orange.500" : "purple.500";
  return (
    <HStack justifyContent="flex-end">
      <Text
        fontSize="xs"
        fontWeight="semibold"
        w="14"
        color={color}
        borderColor={color}
        borderWidth={1}
        borderRadius={4}
        textAlign="center"
      >
        {split}
      </Text>
    </HStack>
  );
};

const RelabelingStatus = ({ status }: { status?: RelabelRequestStatus }) => {
  if (!status) return null;

  let color;
  let text;

  switch (status) {
    case RelabelRequestStatus.ERROR:
      color = "red.500";
      text = "Failed";
      break;
    case RelabelRequestStatus.IN_PROGRESS:
      color = "blue.500";
      text = "In Progress";
      break;
    case RelabelRequestStatus.PENDING:
      color = "gray.500";
      text = "Pending";
      break;
    default:
      return null;
  }

  return (
    <Text fontWeight="bold" color={color}>
      {text}
    </Text>
  );
};

export const EmptyTableRow = ({ filtersApplied = true }: { filtersApplied?: boolean }) => {
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const filters = useFilters().filters;
  const { isLoading } = useDatasetEntries();

  if (isLoading) return null;

  if (filters.length && filtersApplied) {
    return (
      <Tr>
        <Td w="full" colSpan={visibleColumns.size + 1}>
          <Text color="gray.500" textAlign="center" w="full" p={4}>
            No matching entries found. Try removing some filters.
          </Text>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td w="full" colSpan={visibleColumns.size + 1}>
        <Text color="gray.500" textAlign="center" w="full" p={4}>
          This dataset has no entries. Add some logs in the{" "}
          <Link href="/request-logs">
            <Text as="span" color="blue.600">
              Request Logs
            </Text>
          </Link>{" "}
          tab.
        </Text>
      </Td>
    </Tr>
  );
};
