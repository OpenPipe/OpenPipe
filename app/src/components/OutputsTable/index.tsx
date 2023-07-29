import { Grid, GridItem, type GridItemProps } from "@chakra-ui/react";
import { api } from "~/utils/api";
import AddVariantButton from "./AddVariantButton";
import ScenarioRow from "./ScenarioRow";
import VariantEditor from "./VariantEditor";
import VariantHeader from "../VariantHeader/VariantHeader";
import VariantStats from "./VariantStats";
import { ScenariosHeader } from "./ScenariosHeader";
import { borders } from "./styles";
import { useScenarios } from "~/utils/hooks";
import ScenarioPaginator from "./ScenarioPaginator";
import { Fragment } from "react";

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId },
  );

  const scenarios = useScenarios();

  if (!variants.data || !scenarios.data) return null;

  const allCols = variants.data.length + 2;
  const variantHeaderRows = 3;
  const scenarioHeaderRows = 1;
  const scenarioFooterRows = 1;
  const visibleScenariosCount = scenarios.data.scenarios.length;
  const allRows =
    variantHeaderRows + scenarioHeaderRows + visibleScenariosCount + scenarioFooterRows;

  return (
    <Grid
      pt={4}
      pb={24}
      pl={8}
      display="grid"
      gridTemplateColumns={`250px repeat(${variants.data.length}, minmax(300px, 1fr)) auto`}
      sx={{
        "> *": {
          borderColor: "gray.300",
        },
      }}
      fontSize="sm"
    >
      <GridItem rowSpan={variantHeaderRows}>
        <AddVariantButton />
      </GridItem>

      {variants.data.map((variant, i) => {
        const sharedProps: GridItemProps = {
          ...borders,
          colStart: i + 2,
          borderLeftWidth: i === 0 ? 1 : 0,
          marginLeft: i === 0 ? "-1px" : 0,
          backgroundColor: "gray.100",
        };
        return (
          <Fragment key={variant.uiId}>
            <VariantHeader
              variant={variant}
              canHide={variants.data.length > 1}
              rowStart={1}
              {...sharedProps}
            />
            <GridItem rowStart={2} {...sharedProps}>
              <VariantEditor variant={variant} />
            </GridItem>
            <GridItem rowStart={3} {...sharedProps}>
              <VariantStats variant={variant} />
            </GridItem>
          </Fragment>
        );
      })}

      <GridItem
        colSpan={allCols - 1}
        rowStart={variantHeaderRows + 1}
        colStart={1}
        {...borders}
        borderRightWidth={0}
      >
        <ScenariosHeader />
      </GridItem>

      {scenarios.data.scenarios.map((scenario, i) => (
        <ScenarioRow
          rowStart={i + variantHeaderRows + scenarioHeaderRows + 2}
          key={scenario.uiId}
          scenario={scenario}
          variants={variants.data}
          canHide={visibleScenariosCount > 1}
        />
      ))}
      <GridItem
        rowStart={variantHeaderRows + scenarioHeaderRows + visibleScenariosCount + 2}
        colStart={1}
        colSpan={allCols}
      >
        <ScenarioPaginator />
      </GridItem>

      {/* Add some extra padding on the right, because when the table is too wide to fit in the viewport `pr` on the Grid isn't respected. */}
      <GridItem rowStart={1} colStart={allCols} rowSpan={allRows} w={4} borderBottomWidth={0} />
    </Grid>
  );
}
