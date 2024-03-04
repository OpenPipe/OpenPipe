import { type StackProps } from "@chakra-ui/react";

import { useNodeEntries } from "~/utils/hooks";
import Paginator from "../../../Paginator";

const DatasetEntryPaginator = (props: StackProps) => {
  const { data } = useNodeEntries();

  if (!data) return null;

  const { matchingCount } = data;

  return <Paginator count={matchingCount} {...props} />;
};

export default DatasetEntryPaginator;
