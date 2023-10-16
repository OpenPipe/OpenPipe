import { Button } from "@chakra-ui/react";
import Link from "next/link";
import { DATASET_EVALUATION_TAB_KEY } from "../DatasetContentTabs";

const ViewEvaluationButton = ({ datasetId }: { datasetId: string }) => {
  return (
    <Button
      as={Link}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: { id: datasetId, tab: DATASET_EVALUATION_TAB_KEY },
      }}
      variant="link"
      color="blue.600"
    >
      View Evalution
    </Button>
  );
};

export default ViewEvaluationButton;
