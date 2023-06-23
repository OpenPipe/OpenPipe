import { MRT_ColumnDef, MantineReactTable } from "mantine-react-table";
import { useMemo } from "react";
import { RouterOutputs, api } from "~/utils/api";
import { PromptVariant } from "./types";
import VariantHeader from "./VariantHeader";
import OutputCell from "./OutputCell";
import ScenarioHeader from "./ScenarioHeader";

type CellData = {
  variant: PromptVariant;
  scenario: NonNullable<RouterOutputs["scenarios"]["list"]>[0];
};

type TableRow = {
  scenario: NonNullable<RouterOutputs["scenarios"]["list"]>[0];
} & Record<string, CellData>;

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const columns = useMemo<MRT_ColumnDef<TableRow>[]>(() => {
    return [
      {
        id: "scenario",
        header: "Scenario",
        enableColumnDragging: false,
        size: 200,
        Cell: ({ row }) => <ScenarioHeader scenario={row.original.scenario} />,
      },
      ...(variants.data?.map(
        (variant): MRT_ColumnDef<TableRow> => ({
          id: variant.uiId,
          header: variant.label,
          Header: <VariantHeader variant={variant} />,
          size: 400,
          Cell: ({ row }) => <OutputCell scenario={row.original.scenario} variant={variant} />,
        })
      ) ?? []),
    ];
  }, [variants.data]);

  const tableData = useMemo(
    () =>
      scenarios.data?.map((scenario) => {
        return {
          scenario,
        } as TableRow;
      }) ?? [],
    [scenarios.data]
  );

  if (!variants.data || !scenarios.data) return null;

  return (
    <MantineReactTable
      mantinePaperProps={{
        withBorder: false,
        shadow: "none",
      }}
      columns={columns}
      data={tableData}
      enableBottomToolbar={false}
      enableTopToolbar={false}
      enableColumnDragging
      enableGlobalFilter={false}
      enableFilters={false}
      enableDensityToggle={false}
      enableFullScreenToggle={false}
      enableHiding={false}
      enableColumnActions={false}
      enableColumnResizing
      mantineTableProps={{
        sx: {
          th: {
            verticalAlign: "bottom",
          },
          "& .mantine-TableHeadCell-Content": {
            width: "100%",
            height: "100%",

            "& .mantine-TableHeadCell-Content-Actions": {
              alignSelf: "flex-start",
            },

            "& > .mantine-TableHeadCell-Content-Labels": {
              width: "100%",
              height: "100%",

              "& > .mantine-TableHeadCell-Content-Wrapper": {
                width: "100%",
                height: "100%",
              },
            },
          },
        },
      }}
    />
  );
}
