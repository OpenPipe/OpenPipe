import { useRouter } from "next/router";
import { api } from "~/utils/api";

export const useExperiment = () => {
  const router = useRouter();
  const experiment = api.experiments.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id }
  );

  return experiment;
};
