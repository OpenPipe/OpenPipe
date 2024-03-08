import { type StackProps } from "@chakra-ui/react";

import Paginator from "~/components/Paginator";
import { useTrainingEntries } from "~/utils/hooks";

const TrainingDataPaginator = (props: StackProps) => {
  const { data } = useTrainingEntries();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default TrainingDataPaginator;
