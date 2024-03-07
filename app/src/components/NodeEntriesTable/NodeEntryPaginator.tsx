import { type StackProps } from "@chakra-ui/react";

import { useNodeEntries } from "~/utils/hooks";
import Paginator from "../Paginator";

const NodeEntryPaginator = ({ nodeId, ...rest }: StackProps & { nodeId?: string }) => {
  const { data } = useNodeEntries({ nodeId });

  if (!data) return null;

  const { matchingCount } = data;

  return <Paginator count={matchingCount} {...rest} />;
};

export default NodeEntryPaginator;
