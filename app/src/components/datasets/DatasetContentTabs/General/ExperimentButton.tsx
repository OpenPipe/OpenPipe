import { RiFlaskLine } from "react-icons/ri";

import { useAppStore } from "~/state/store";
import ActionButton from "~/components/ActionButton";

const ExperimentButton = () => {
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  return (
    <ActionButton
      onClick={() => {
        console.log("experimenting with these ids", selectedIds);
      }}
      label="Experiment"
      icon={RiFlaskLine}
      isDisabled={selectedIds.size === 0}
      requireBeta
    />
  );
};

export default ExperimentButton;
