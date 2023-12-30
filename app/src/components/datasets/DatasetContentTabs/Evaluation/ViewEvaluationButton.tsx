import { Button } from "@chakra-ui/react";

import { DATASET_EVALUATION_TAB_KEY } from "../DatasetContentTabs";
import { constructVisibleModelIdsQueryParams } from "./useVisibleModelIds";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { ProjectLink } from "~/components/ProjectLink";

const ViewEvaluationButton = ({
  datasetId,
  fineTuneId,
}: {
  datasetId: string;
  fineTuneId: string;
}) => {
  const visibleModelIdsQueryParams = constructVisibleModelIdsQueryParams([
    ORIGINAL_MODEL_ID,
    fineTuneId,
  ]);
  return (
    <Button
      as={ProjectLink}
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetId,
          tab: DATASET_EVALUATION_TAB_KEY,
          ...visibleModelIdsQueryParams,
        },
      }}
      variant="link"
      color="blue.600"
    >
      View Evaluation
    </Button>
  );
};

export default ViewEvaluationButton;
