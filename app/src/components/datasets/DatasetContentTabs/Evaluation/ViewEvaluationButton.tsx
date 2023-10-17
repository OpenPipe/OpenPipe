import { Button } from "@chakra-ui/react";
import Link from "next/link";
import { DATASET_EVALUATION_TAB_KEY } from "../DatasetContentTabs";
import { EVALUATION_COLUMNS_KEY } from "./useVisibleEvaluationColumns";

const ViewEvaluationButton = ({
  datasetId,
  fineTuneSlug,
}: {
  datasetId: string;
  fineTuneSlug: string;
}) => {
  return (
    <Button
      as={Link}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetId,
          tab: DATASET_EVALUATION_TAB_KEY,
          [EVALUATION_COLUMNS_KEY]: fineTuneSlug,
        },
      }}
      variant="link"
      color="blue.600"
    >
      View Evalution
    </Button>
  );
};

export default ViewEvaluationButton;
