import { type StackProps } from "@chakra-ui/react";

import { useTrainingEntries } from "~/utils/hooks";
import Paginator from "~/components/Paginator";

const TrainingDataPaginator = (props: StackProps) => {
  const { data } = useTrainingEntries();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default TrainingDataPaginator;
