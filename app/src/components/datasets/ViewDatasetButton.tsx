import { Button, type ButtonProps } from "@chakra-ui/react";
import Link from "next/link";

import { DATASET_GENERAL_TAB_KEY } from "./DatasetContentTabs/DatasetContentTabs";

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
      as={Link}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetId,
          tab: tabKey,
        },
      }}
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
