import { type StackProps } from "@chakra-ui/react";
import Paginator from "~/components/Paginator";

import { useAdminProjects } from "~/utils/hooks";

const AdminProjectsPaginator = (props: StackProps) => {
  const { data } = useAdminProjects();

  if (!data) return null;

  return <Paginator count={data.count} {...props} />;
};

export default AdminProjectsPaginator;
