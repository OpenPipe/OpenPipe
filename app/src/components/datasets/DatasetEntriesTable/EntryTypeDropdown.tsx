import { type DatasetEntryType } from "@prisma/client";

import InputDropdown from "~/components/InputDropdown";

const ENTRY_TYPE_OPTIONS: DatasetEntryType[] = ["TRAIN", "TEST"];

const EntryTypeDropdown = ({
  type,
  onTypeChange,
}: {
  type: DatasetEntryType;
  onTypeChange: (type: DatasetEntryType) => void;
}) => {
  return (
    <InputDropdown
      options={ENTRY_TYPE_OPTIONS}
      selectedOption={type}
      onSelect={onTypeChange}
      inputGroupProps={{ w: "32", bgColor: "white" }}
    />
  );
};

export default EntryTypeDropdown;
