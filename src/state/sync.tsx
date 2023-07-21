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
      useAppStore.getState().sharedVariantEditor.setScenarios(scenarios.data);
    }
  }, [scenarios.data]);
}

export function SyncAppStore() {
  const utils = api.useContext();

  const setApi = useAppStore((state) => state.setApi);

  useEffect(() => {
    setApi(utils);
  }, [utils, setApi]);

  return null;
}
