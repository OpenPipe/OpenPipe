import { Box, Td, Tr, Thead, Th, Tooltip, HStack, Text, Button, Badge } from "@chakra-ui/react";
import { DatasetEntrySplit } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { type RouterInputs, type RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { useIsClientInitialized, useNodeEntries } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { useSortOrder, SortArrows } from "~/components/sorting";
import { ProjectLink } from "~/components/ProjectLink";

type DatasetEntry = RouterOutputs["nodeEntries"]["list"]["entries"][0];

type SortableField = NonNullable<RouterInputs["nodeEntries"]["list"]["sortOrder"]>["field"];

const SortableHeader = (props: { title: string; field: SortableField; isNumeric?: boolean }) => {
  const sortOrder = useSortOrder<SortableField>();

  return (
    <Th onClick={() => sortOrder.toggle(props.field)} cursor="pointer">
      <HStack justify={props.isNumeric ? "end" : undefined}>
        <Text>{props.title}</Text> <SortArrows<SortableField> field={props.field} />
      </HStack>
    </Th>
  );
};

export const TableHeader = () => {
  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Thead>
      <Tr>
        <SortableHeader title="Updated At" field="createdAt" />
        <SortableHeader isNumeric title="Input Tokens" field="inputTokens" />
        <SortableHeader isNumeric title="Output Tokens" field="outputTokens" />
        <SortableHeader isNumeric title="Split" field="split" />
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  datasetEntry,
  isExpanded,
  toggleExpanded,
}: {
  datasetEntry: DatasetEntry;
  isExpanded: boolean;
  toggleExpanded: (persistentId: string) => void;
}) => {
  const createdAt = dayjs(datasetEntry.createdAt).format("MMMM D h:mm A");
  const fullTime = dayjs(datasetEntry.createdAt).toString();

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Tr
      onClick={() => toggleExpanded(datasetEntry.persistentId)}
      key={datasetEntry.id}
      _hover={{ td: { bgColor: "gray.50", cursor: "pointer" } }}
      bgColor={isExpanded ? "blue.50" : undefined}
      transition="background-color 1.2s"
      fontSize="sm"
    >
      <Td>
        <Tooltip label={fullTime} placement="top">
          <Box whiteSpace="nowrap" minW="120px">
            {createdAt}
          </Box>
        </Tooltip>
      </Td>
      <Td isNumeric>
        {datasetEntry.inputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
      </Td>
      <Td isNumeric>
        {datasetEntry.outputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
      </Td>
      <Td isNumeric>
        <EntrySplit split={datasetEntry.split} />
      </Td>
    </Tr>
  );
};

const EntrySplit = ({ split }: { split: string }) => {
  const color = split === DatasetEntrySplit.TRAIN ? "orange" : "purple";
  return (
    <HStack justifyContent="flex-end">
      <Badge
        variant="outline"
        w="14"
        p="1px"
        textAlign="center"
        borderRadius={4}
        colorScheme={color}
      >
        {split}
      </Badge>
    </HStack>
  );
};

export const EmptyTableRow = ({ filtersApplied = true }: { filtersApplied?: boolean }) => {
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const filters = useFilters().filters;
  const { isLoading } = useNodeEntries();

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
          This dataset has no entries. Import logs from the{" "}
          <Button variant="link" as={ProjectLink} href="/request-logs">
            <Text as="span" color="blue.600">
              Request Logs
            </Text>
          </Button>{" "}
          tab or upload a dataset.
        </Text>
      </Td>
    </Tr>
  );
};
