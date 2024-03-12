import { Td, Tr, Text, Button, type TextProps } from "@chakra-ui/react";
import { type NodeType } from "@prisma/client";

import { useAppStore } from "~/state/store";
import { useDataset } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { ProjectLink } from "~/components/ProjectLink";

const EmptyRow = ({ nodeType }: { nodeType?: NodeType }) => {
  const filters = useFilters().filters;

  if (filters.length) {
    return <EmptyRowWrapper>No matching entries found. Try removing some filters.</EmptyRowWrapper>;
  }

  if (nodeType === "Dataset") {
    return <DatasetEmptyRow />;
  }

  return <EmptyRowWrapper>No matching entries found.</EmptyRowWrapper>;
};

export default EmptyRow;

const DatasetEmptyRow = () => {
  const numIncomingEntries = useDataset().data?.numIncomingEntries;

  const initialText = numIncomingEntries
    ? `This dataset has ${numIncomingEntries} entries pending LLM relabeling.`
    : "This dataset has no entries.";
  return (
    <EmptyRowWrapper>
      {initialText} You can add entries from the{" "}
      <Button variant="link" as={ProjectLink} href="/request-logs">
        <Text as="span" color="blue.600">
          Request Logs
        </Text>
      </Button>{" "}
      tab or upload a dataset.
    </EmptyRowWrapper>
  );
};

const EmptyRowWrapper = (props: TextProps) => {
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);

  return (
    <Tr>
      <Td w="full" colSpan={visibleColumns.size + 1}>
        <Text color="gray.500" textAlign="center" w="full" p={4} {...props} />
      </Td>
    </Tr>
  );
};
