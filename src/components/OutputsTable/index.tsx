import { Grid, GridItem } from "@chakra-ui/react";
import { api } from "~/utils/api";
import NewScenarioButton from "./NewScenarioButton";
import NewVariantButton from "./NewVariantButton";
import ScenarioRow from "./ScenarioRow";
import VariantEditor from "./VariantEditor";
import VariantHeader from "../VariantHeader/VariantHeader";
import VariantStats from "./VariantStats";
import { ScenariosHeader } from "./ScenariosHeader";
import { stickyHeaderStyle } from "./styles";

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId },
  );

  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId },
  );

  if (!variants.data || !scenarios.data) return null;

  const allCols = variants.data.length + 1;
  const headerRows = 3;

  return (
    <Grid
      p={4}
      pb={24}
      display="grid"
      gridTemplateColumns={`250px repeat(${variants.data.length}, minmax(300px, 1fr)) auto`}
      sx={{
        "> *": {
          borderColor: "gray.300",
          borderBottomWidth: 1,
          borderRightWidth: 1,
        },
      }}
      fontSize="sm"
    >
      <ScenariosHeader headerRows={headerRows} numScenarios={scenarios.data.length} />

      {variants.data.map((variant) => (
        <VariantHeader key={variant.uiId} variant={variant} canHide={variants.data.length > 1} />
      ))}
      <GridItem
        rowSpan={scenarios.data.length + headerRows}
        padding={0}
        // Have to use `style` instead of emotion style props to work around css specificity issues conflicting with the "> *" selector on Grid
        style={{ borderRightWidth: 0, borderBottomWidth: 0 }}
        h={8}
        sx={stickyHeaderStyle}
      >
        <NewVariantButton />
      </GridItem>

      {variants.data.map((variant) => (
        <GridItem key={variant.uiId}>
          <VariantEditor variant={variant} />
        </GridItem>
      ))}
      {variants.data.map((variant) => (
        <GridItem key={variant.uiId}>
          <VariantStats variant={variant} />
        </GridItem>
      ))}
      {scenarios.data.map((scenario) => (
        <ScenarioRow
          key={scenario.uiId}
          scenario={scenario}
          variants={variants.data}
          canHide={scenarios.data.length > 1}
        />
      ))}
      <GridItem borderBottomWidth={0} borderRightWidth={0} w="100%" colSpan={allCols} padding={0}>
        <NewScenarioButton />
      </GridItem>
    </Grid>
  );
}
