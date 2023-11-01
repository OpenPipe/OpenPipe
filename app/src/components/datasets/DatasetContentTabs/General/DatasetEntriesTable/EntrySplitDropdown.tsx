import { DatasetEntrySplit } from "@prisma/client";

import InputDropdown from "~/components/InputDropdown";

const EntrySplitDropdown = ({
  split,
  onChange: onChange,
}: {
  split: DatasetEntrySplit;
  onChange: (split: DatasetEntrySplit) => void;
}) => {
  return (
    <InputDropdown
      options={[DatasetEntrySplit.TRAIN, DatasetEntrySplit.TEST]}
      selectedOption={split}
      onSelect={onChange}
      inputGroupProps={{ w: "32", bgColor: "white" }}
    />
  );
};

export default EntrySplitDropdown;
