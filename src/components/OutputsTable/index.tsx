import { Box, Grid, GridItem, Heading, type SystemStyleObject } from "@chakra-ui/react";
import ScenarioHeader from "~/server/ScenarioHeader";
import { api } from "~/utils/api";
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
      }}
    >
      <GridItem display="flex" alignItems="flex-end" rowSpan={2}>
        <ScenarioHeader />
      </GridItem>

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
      {scenarios.data.map((scenario) => (
        <ScenarioRow key={scenario.uiId} scenario={scenario} variants={variants.data} />
      ))}
      <GridItem borderBottomWidth={0} borderRightWidth={0} w="100%" colSpan={allCols} padding={0}>
        <NewScenarioButton />
      </GridItem>
    </Grid>
  );
}
