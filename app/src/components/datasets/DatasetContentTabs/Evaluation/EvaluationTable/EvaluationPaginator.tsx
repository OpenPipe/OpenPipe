import { type StackProps } from "@chakra-ui/react";

import { useTestingEntries } from "~/utils/hooks";
import Paginator from "~/components/Paginator";

const EvaluationPaginator = (props: StackProps) => {
  const { data } = useTestingEntries();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default EvaluationPaginator;
