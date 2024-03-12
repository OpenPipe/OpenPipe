import { useRouter } from "next/router";

import { api } from "~/utils/api";

export const useMonitor = (options?: { refetchInterval?: number }) => {
  const router = useRouter();

  return api.monitors.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id, refetchInterval: options?.refetchInterval },
  );
};
