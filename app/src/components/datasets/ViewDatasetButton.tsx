import { Button, type ButtonProps } from "@chakra-ui/react";

import { DATASET_GENERAL_TAB_KEY } from "./DatasetContentTabs/DatasetContentTabs";
import { ProjectLink } from "../ProjectLink";

const ViewDatasetButton = ({
  buttonText,
  datasetId,
  tabKey = DATASET_GENERAL_TAB_KEY,
  ...props
}: {
  buttonText: string;
  datasetId: string;
  tabKey?: string;
} & ButtonProps) => {
  return (
    <Button
      as={ProjectLink}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetId,
          tab: tabKey,
        },
      }}
      whiteSpace={"normal"}
      variant="link"
      color="blue.600"
      fontWeight="normal"
      _hover={{ textDecoration: "underline" }}
      {...props}
    >
      {buttonText}
    </Button>
  );
};

export default ViewDatasetButton;
