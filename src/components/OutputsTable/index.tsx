import { Grid, GridItem, Heading, type SystemStyleObject } from "@chakra-ui/react";
import ScenarioHeader from "~/server/ScenarioHeader";
import { api } from "~/utils/api";
import NewEvaluationButton from "./NewEvaluationButton";
import NewScenarioButton from "./NewScenarioButton";
import NewVariantButton from "./NewVariantButton";
import ScenarioRow from "./ScenarioRow";
import VariantConfigEditor from "./VariantConfigEditor";
import VariantHeader from "./VariantHeader";

const stickyHeaderStyle: SystemStyleObject = {
  position: "sticky",
  top: "-1px",
  backgroundColor: "#fff",
  zIndex: 1,
};

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  if (!variants.data || !scenarios.data) return null;

  const allCols = variants.data.length + 1;

  return (
    <Grid
      p={4}
      display="grid"
      gridTemplateColumns={`250px repeat(${variants.data.length}, minmax(300px, 1fr)) auto`}
      sx={{
        "> *": {
          borderColor: "gray.300",
          borderBottomWidth: 1,
          borderRightWidth: 1,
        },
        "> *:last-child": {
          borderRightWidth: 0,
        },
      }}
    >
      <GridItem borderBottomWidth={0} rowSpan={2} />
      {variants.data.map((variant) => (
        <GridItem key={variant.uiId} padding={0} sx={stickyHeaderStyle} borderTopWidth={1}>
          <VariantHeader variant={variant} />
        </GridItem>
      ))}
      <GridItem
        rowSpan={scenarios.data.length + 2}
        padding={0}
        // Have to use `style` instead of emotion style props to work around css specificity issues conflicting with the "> *" selector on Grid
        style={{ borderRightWidth: 0, borderBottomWidth: 0 }}
        sx={stickyHeaderStyle}
      >
        <NewVariantButton />
      </GridItem>

      {variants.data.map((variant) => (
        <GridItem key={variant.uiId} padding={0}>
          <VariantConfigEditor variant={variant} />
        </GridItem>
      ))}
      <GridItem
        display="flex"
        alignItems="flex-end"
        borderRightWidth={0}
        pt={4}
        sx={{ ...stickyHeaderStyle, top: -4 }}
      >
        <ScenarioHeader />
      </GridItem>
      <GridItem colSpan={allCols - 1} borderRightWidth={0} />

      {scenarios.data.map((scenario) => (
        <ScenarioRow key={scenario.uiId} scenario={scenario} variants={variants.data} />
      ))}
      <GridItem borderBottomWidth={0} w="100%" colSpan={allCols} padding={0}>
        <NewScenarioButton />
      </GridItem>
      {/* <GridItem borderBottomWidth={0} colSpan={allCols} px={2} pt={4}>
        <Heading size="sm" fontWeight="bold" flex={1}>
          Evaluations
        </Heading>
      </GridItem>
      <GridItem borderBottomWidth={0} w="100%" colSpan={allCols} padding={0}>
        <NewEvaluationButton />
      </GridItem> */}
    </Grid>
  );
}
