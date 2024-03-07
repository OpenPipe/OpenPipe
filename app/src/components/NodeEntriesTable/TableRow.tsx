import {
  Box,
  Td,
  Tr,
  Thead,
  Tooltip,
  HStack,
  Text,
  Button,
  Badge,
  type TextProps,
} from "@chakra-ui/react";
import { DatasetEntrySplit, type NodeType } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { type RouterInputs, type RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { useDataset, useIsClientInitialized } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { SortableHeader } from "~/components/sorting";
import { ProjectLink } from "~/components/ProjectLink";

type DatasetEntry = RouterOutputs["nodeEntries"]["list"]["entries"][0];
type SortableField = NonNullable<RouterInputs["nodeEntries"]["list"]["sortOrder"]>["field"];

export const TableHeader = () => {
  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Thead>
      <Tr>
        <SortableHeader<SortableField> title="Created At" field="persistentId" />
        <SortableHeader<SortableField> isNumeric title="Input Tokens" field="inputTokens" />
        <SortableHeader<SortableField> isNumeric title="Output Tokens" field="outputTokens" />
        <SortableHeader<SortableField> isNumeric title="Split" field="split" />
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  datasetEntry,
  isSelected,
  onSelect,
}: {
  datasetEntry: DatasetEntry;
  isSelected: boolean;
  onSelect: (persistentId: string) => void;
}) => {
  const createdAt = dayjs(datasetEntry.creationTime).format("MMMM D h:mm A");
  const fullTime = dayjs(datasetEntry.creationTime).toString();

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Tr
      onClick={() => onSelect(datasetEntry.persistentId)}
      key={datasetEntry.id}
      _hover={{ td: { bgColor: "gray.50", cursor: "pointer" } }}
      bgColor={isSelected ? "blue.50" : undefined}
      transition="background-color 1.2s"
      fontSize="sm"
    >
      <Td>
        <Tooltip label={fullTime} placement="top-start">
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

export const EmptyTableRow = ({ nodeType }: { nodeType?: NodeType }) => {
  const filters = useFilters().filters;

  if (!filters.length) {
    return (
      <EmptyTableRowWrapper>
        No matching entries found. Try removing some filters.
      </EmptyTableRowWrapper>
    );
  }

  if (nodeType === "Dataset") {
    return <DatasetEmptyTableRow />;
  }

  return (
    <EmptyTableRowWrapper>
      No matching entries found. Try removing some filters.
    </EmptyTableRowWrapper>
  );
};

const DatasetEmptyTableRow = () => {
  const numIncomingEntries = useDataset().data?.numIncomingEntries;

  const initialText = numIncomingEntries
    ? `This dataset has ${numIncomingEntries} entries pending LLM relabeling.`
    : "This dataset has no entries.";
  return (
    <EmptyTableRowWrapper>
      {initialText} You can add entries from the{" "}
      <Button variant="link" as={ProjectLink} href="/request-logs">
        <Text as="span" color="blue.600">
          Request Logs
        </Text>
      </Button>{" "}
      tab or upload a dataset.
    </EmptyTableRowWrapper>
  );
};

const EmptyTableRowWrapper = (props: TextProps) => {
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);

  return (
    <Tr>
      <Td w="full" colSpan={visibleColumns.size + 1}>
        <Text color="gray.500" textAlign="center" w="full" p={4} {...props} />
      </Td>
    </Tr>
  );
};
