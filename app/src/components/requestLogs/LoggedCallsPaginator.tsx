import { type StackProps } from "@chakra-ui/react";

import { useLoggedCallsCount } from "~/utils/hooks";
import Paginator from "../Paginator";

const LoggedCallsPaginator = (props: StackProps) => {
  const { data } = useLoggedCallsCount();

  if (!data) return null;

  const { count } = data;

  return <Paginator count={count} {...props} />;
};

export default LoggedCallsPaginator;
