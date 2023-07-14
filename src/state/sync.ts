import { useEffect } from "react";
import { api } from "~/utils/api";
import { useExperiment } from "~/utils/hooks";
import { useAppStore } from "./store";

export function useSyncVariantEditor() {
  const experiment = useExperiment();
  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experiment.data?.id ?? "" },
    { enabled: !!experiment.data?.id },
  );
  useEffect(() => {
    if (scenarios.data) {
      useAppStore.getState().variantEditor.setScenarios(scenarios.data);
    }
  }, [scenarios.data]);
}
