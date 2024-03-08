import { type StackProps } from "@chakra-ui/react";

import Paginator from "~/components/Paginator";
import { useTestingEntries } from "~/utils/hooks";

const EvaluationPaginator = (props: StackProps) => {
  const { data } = useTestingEntries();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default EvaluationPaginator;
