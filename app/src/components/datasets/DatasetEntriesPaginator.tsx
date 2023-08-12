import { type StackProps } from "@chakra-ui/react";

import { useDatasetEntries } from "~/utils/hooks";
import Paginator from "../Paginator";

const DatasetEntriesPaginator = (props: StackProps) => {
  const { data } = useDatasetEntries();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default DatasetEntriesPaginator;
