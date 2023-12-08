import { useEffect } from "react";
import { api } from "~/utils/api";
import { useAppStore } from "./store";

export function SyncAppStore() {
  const utils = api.useContext();

  const setApi = useAppStore((state) => state.setApi);

  useEffect(() => {
    setApi(utils);
  }, [utils, setApi]);

  return null;
}
