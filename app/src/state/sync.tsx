import { useEffect } from "react";
import { api } from "~/utils/api";
import { useScenarioVars } from "~/utils/hooks";
import { useAppStore } from "./store";

export function useSyncVariantEditor() {
  const scenarioVars = useScenarioVars();

  useEffect(() => {
    if (scenarioVars.data) {
      useAppStore.getState().sharedVariantEditor.setScenarioVars(scenarioVars.data);
    }
  }, [scenarioVars.data]);
}

export function SyncAppStore() {
  const utils = api.useContext();

  const setApi = useAppStore((state) => state.setApi);

  useEffect(() => {
    setApi(utils);
  }, [utils, setApi]);

  return null;
}
