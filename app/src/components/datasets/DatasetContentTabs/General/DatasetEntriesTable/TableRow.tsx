import { Box, Td, Tr, Thead, Th, Tooltip, HStack, Text, Checkbox } from "@chakra-ui/react";
import Link from "next/link";
import { DatasetEntryType } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { type RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { useIsClientRehydrated, useDatasetEntries } from "~/utils/hooks";
import { useMemo } from "react";
import { useFilters } from "~/components/Filters/useFilters";

type DatasetEntry = RouterOutputs["datasetEntries"]["list"]["entries"][0];

export const TableHeader = () => {
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
        <Th isNumeric>Input tokens</Th>
        <Th isNumeric>Output tokens</Th>
        <Th isNumeric>Type</Th>
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  datasetEntry,
  onToggle,
  showOptions,
}: {
  datasetEntry: DatasetEntry;
  onToggle: () => void;
  showOptions?: boolean;
}) => {
  const createdAt = dayjs(datasetEntry.createdAt).format("MMMM D h:mm A");
  const fullTime = dayjs(datasetEntry.createdAt).toString();

  const isChecked = useAppStore((s) => s.selectedDatasetEntries.selectedIds.has(datasetEntry.id));
  const toggleChecked = useAppStore((s) => s.selectedDatasetEntries.toggleSelectedId);

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <Tr
      onClick={onToggle}
      key={datasetEntry.id}
      _hover={{ bgColor: "gray.50", cursor: "pointer" }}
      fontSize="sm"
    >
      {showOptions && (
        <Td>
          <Checkbox isChecked={isChecked} onChange={() => toggleChecked(datasetEntry.id)} />
        </Td>
      )}
      <Td>
        <Tooltip label={fullTime} placement="top">
          <Box whiteSpace="nowrap" minW="120px">
            {createdAt}
          </Box>
        </Tooltip>
      </Td>
      <Td isNumeric>{datasetEntry.inputTokens.toLocaleString()}</Td>
      <Td isNumeric>{datasetEntry.outputTokens.toLocaleString()}</Td>
      <Td isNumeric>
        <EntryType type={datasetEntry.type} />
      </Td>
    </Tr>
  );
};

const EntryType = ({ type }: { type: string }) => {
  const color = type === DatasetEntryType.TRAIN ? "orange.500" : "purple.500";
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
        {type}
      </Text>
    </HStack>
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
