import { type StackProps } from "@chakra-ui/react";

import { useScenarios } from "~/utils/hooks";
import Paginator from "../Paginator";

const ScenarioPaginator = (props: StackProps) => {
  const { data } = useScenarios();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} condense {...props} />;
};

export default ScenarioPaginator;
