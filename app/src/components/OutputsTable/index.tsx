import { Grid, GridItem, type GridItemProps } from "@chakra-ui/react";
import { api } from "~/utils/api";
import AddVariantButton from "./AddVariantButton";
import ScenarioRow from "./ScenarioRow";
import VariantEditor from "./VariantEditor";
import VariantHeader from "./VariantHeader/VariantHeader";
import VariantStats from "./VariantStats";
import { ScenariosHeader } from "./ScenariosHeader";
import { borders } from "./styles";
import { useScenarios } from "~/utils/hooks";
import ScenarioPaginator from "./ScenarioPaginator";
import { Fragment } from "react";
import useScrolledPast from "./useHasScrolledPast";

export default function OutputsTable({
  experimentId,
  openDrawer,
}: {
  experimentId: string | undefined;
  openDrawer: () => void;
}) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId },
  );

  const scenarios = useScenarios();
  const shouldFlattenHeader = useScrolledPast(50);

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
      gridTemplateColumns={`250px repeat(${variants.data.length}, minmax(320px, 1fr)) auto`}
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
          backgroundColor: "white",
        };
        const isFirst = i === 0;
        const isLast = i === variants.data.length - 1;
        return (
          <Fragment key={variant.uiId}>
            <VariantHeader
              variant={variant}
              canHide={variants.data.length > 1}
              rowStart={1}
              borderTopLeftRadius={isFirst && !shouldFlattenHeader ? 8 : 0}
              borderTopRightRadius={isLast && !shouldFlattenHeader ? 8 : 0}
              {...sharedProps}
            />
            <GridItem rowStart={2} {...sharedProps}>
              <VariantEditor variant={variant} />
            </GridItem>
            <GridItem
              rowStart={3}
              {...sharedProps}
              borderBottomLeftRadius={isFirst ? 8 : 0}
              borderBottomRightRadius={isLast ? 8 : 0}
              boxShadow="5px 5px 15px 1px rgba(0, 0, 0, 0.1);"
            >
              <VariantStats variant={variant} />
            </GridItem>
          </Fragment>
        );
      })}

      <GridItem
        colSpan={allCols - 1}
        rowStart={variantHeaderRows + 1}
        colStart={1}
        borderRightWidth={0}
      >
        <ScenariosHeader openDrawer={openDrawer} />
      </GridItem>

      {scenarios.data.scenarios.map((scenario, i) => (
        <ScenarioRow
          rowStart={i + variantHeaderRows + scenarioHeaderRows + 2}
          key={scenario.uiId}
          scenario={scenario}
          variants={variants.data}
          canHide={visibleScenariosCount > 1}
          isFirst={i === 0}
          isLast={i === visibleScenariosCount - 1}
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
