import { Button, type ButtonProps } from "@chakra-ui/react";
import Link from "next/link";

import { DATASET_GENERAL_TAB_KEY } from "./DatasetContentTabs/DatasetContentTabs";

const ViewDatasetButton = ({
  buttonText,
  datasetId,
  ...props
}: {
  buttonText: string;
  datasetId: string;
} & ButtonProps) => {
  return (
    <Button
      as={Link}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetId,
          tab: DATASET_GENERAL_TAB_KEY,
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
