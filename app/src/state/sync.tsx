import { useEffect } from "react";
import { api } from "~/utils/api";
import { useScenarios } from "~/utils/hooks";
import { useAppStore } from "./store";

export function useSyncVariantEditor() {
  const scenarios = useScenarios();

  useEffect(() => {
    if (scenarios.data) {
      useAppStore.getState().sharedVariantEditor.setScenarios(scenarios.data.scenarios);
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
