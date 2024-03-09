import { Button } from "@chakra-ui/react";

import { useDatasetEval } from "~/utils/hooks";
import { constructVisibleModelIdsQueryParams } from "~/components/datasets/DatasetContentTabs/Evaluation/useVisibleModelIds";
import { constructVisibleEvalIdsQueryParams } from "~/components/datasets/DatasetContentTabs/Evaluation/useVisibleEvalIds";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";
import { ProjectLink } from "~/components/ProjectLink";

const ViewTestOutputButton = () => {
  const datasetEval = useDatasetEval().data;

  const visibleModelIdsQueryParams = constructVisibleModelIdsQueryParams(
    datasetEval?.outputSources.map((outputSource) => outputSource.modelId) ?? [],
  );

  const visibleEvalIdsQueryParams = constructVisibleEvalIdsQueryParams([datasetEval?.id ?? ""]);

  const filtersQueryParams = constructFiltersQueryParams({
    filters: [
      {
        id: Date.now().toString(),
        field: EvaluationFiltersDefaultFields.EvalApplied,
        comparator: "=",
        value: datasetEval?.id ?? "",
      },
    ],
  });

  if (!datasetEval) return null;

  return (
    <Button
      as={ProjectLink}
      variant="link"
      colorScheme="blue"
      href={{
        pathname: "/datasets/[id]/[tab]",
        query: {
          id: datasetEval.datasetId,
          tab: DATASET_EVALUATION_TAB_KEY,
          ...visibleModelIdsQueryParams,
          ...visibleEvalIdsQueryParams,
          ...filtersQueryParams,
        },
      }}
    >
      View Output
    </Button>
  );
};

export default ViewTestOutputButton;
