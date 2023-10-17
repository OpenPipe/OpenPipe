import { type StackProps } from "@chakra-ui/react";

import { useDatasetEntries } from "~/utils/hooks";
import Paginator from "../../../Paginator";

const DatasetEntryPaginator = (props: StackProps) => {
  const { data } = useDatasetEntries();

  if (!data) return null;

  const { matchingEntryIds } = data;

  return <Paginator count={matchingEntryIds.length} {...props} />;
};

export default DatasetEntryPaginator;
