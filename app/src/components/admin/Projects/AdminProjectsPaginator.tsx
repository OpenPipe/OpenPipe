import { type StackProps } from "@chakra-ui/react";
import Paginator from "~/components/Paginator";
import { api } from "~/utils/api";

import { useAdminProjects } from "~/utils/hooks";

const AdminProjectsPaginator = (props: StackProps) => {
  const { data } = useAdminProjects();

  if (!data) return null;

  return <Paginator count={data.length + 1} {...props} />;
};

export default AdminProjectsPaginator;
