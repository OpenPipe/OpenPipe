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
  Collapse,
  Heading,
  Table,
} from "@chakra-ui/react";
import { DatasetEntrySplit, type NodeType } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { type RouterInputs, type RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { useDataset, useIsClientInitialized } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { SortableHeader } from "~/components/sorting";
import { ProjectLink } from "~/components/ProjectLink";
import FormattedOutput from "../FormattedOutput";
import { typedDatasetEntryInput } from "~/types/dbColumns.types";
import FormattedInput from "../FormattedInput";

type NodeEntryRow = RouterOutputs["nodeEntries"]["list"]["entries"][0];
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
  nodeEntry,
  isSelected,
  toggleSelected,
  expandable,
}: {
  nodeEntry: NodeEntryRow;
  isSelected: boolean;
  toggleSelected: () => void;
  expandable: boolean;
}) => {
  const createdAt = dayjs(nodeEntry.creationTime).format("MMMM D h:mm A");
  const fullTime = dayjs(nodeEntry.creationTime).toString();

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <>
      <Tr
        onClick={toggleSelected}
        key={nodeEntry.id}
        _hover={{ td: { bgColor: isSelected ? "gray.200" : "gray.50", cursor: "pointer" } }}
        bgColor={isSelected ? "gray.100" : undefined}
        transition={!expandable ? "background-color 1.2s" : undefined}
        sx={
          expandable
            ? {
                "> td": { borderBottom: "none" },
              }
            : undefined
        }
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
          {nodeEntry.inputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
        </Td>
        <Td isNumeric>
          {nodeEntry.outputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
        </Td>
        <Td isNumeric>
          <EntrySplit split={nodeEntry.split} />
        </Td>
      </Tr>
      {expandable && <ExpandableRow nodeEntry={nodeEntry} expanded={isSelected} />}
    </>
  );
};

const ExpandableRow = ({ nodeEntry, expanded }: { nodeEntry: NodeEntryRow; expanded: boolean }) => {
  const isRelabeled = nodeEntry.originalOutputHash !== nodeEntry.outputHash;

  const preferJson = typedDatasetEntryInput(nodeEntry).response_format?.type === "json_object";

  return (
    <Tr maxW="full" borderBottomWidth={0} borderTopWidth={0} bgColor="gray.50">
      <Td colSpan={4} w="full" maxW="full" py={0} px={6}>
        <Collapse in={expanded} unmountOnExit={true}>
          <Box py={8}>
            <Table w="full" variant="unstyled" layout="fixed" sx={{ "& td": { padding: 0 } }}>
              <Tr
                sx={{
                  "& td": {
                    pb: 4,
                  },
                }}
              >
                <Td>
                  <Heading size="sm">Input</Heading>
                </Td>
                {isRelabeled && <Heading size="sm">Original Output</Heading>}
                <Td>
                  <Heading size="sm">{isRelabeled ? "Relabeled Output" : "Output"}</Heading>
                </Td>
              </Tr>
              <Tr
                sx={{
                  "& td": {
                    padding: 4,
                    verticalAlign: "top",
                    borderWidth: 1,
                    borderColor: "gray.300",
                  },
                }}
              >
                <Td flex={1} justifyContent="flex-start" bgColor="white">
                  <FormattedInput input={nodeEntry} />
                </Td>
                {isRelabeled && (
                  <Td flex={1} justifyContent="flex-start" bgColor="white">
                    <FormattedOutput output={nodeEntry.originalOutput} preferJson={preferJson} />
                  </Td>
                )}
                <Td flex={1} justifyContent="flex-start" bgColor="white">
                  <FormattedOutput output={nodeEntry.output} preferJson={preferJson} />
                </Td>
              </Tr>
            </Table>
          </Box>
        </Collapse>
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

  if (filters.length) {
    return (
      <EmptyTableRowWrapper>
        No matching entries found. Try removing some filters.
      </EmptyTableRowWrapper>
    );
  }

  if (nodeType === "Dataset") {
    return <DatasetEmptyTableRow />;
  }

  return <EmptyTableRowWrapper>No matching entries found.</EmptyTableRowWrapper>;
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
