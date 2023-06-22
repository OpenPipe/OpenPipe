import { MRT_ColumnDef, MantineReactTable } from "mantine-react-table";
import { useMemo } from "react";
import { RouterOutputs, api } from "~/utils/api";

type CellData = {
  variant: NonNullable<RouterOutputs["promptVariants"]["list"]>[0];
  scenario: NonNullable<RouterOutputs["scenarios"]["list"]>[0];
};

type TableRow = {
  scenario: NonNullable<RouterOutputs["scenarios"]["list"]>[0];
} & Record<string, CellData>;

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const experiment = api.experiments.get.useQuery(
    { id: experimentId as string },
    { enabled: !!experimentId }
  );

  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const columns = useMemo<MRT_ColumnDef<TableRow>[]>(
    () => [
      {
        id: "scenario",
        header: "Scenario",
        enableColumnDragging: false,
        size: 200,
        Cell: ({ row }) => {
          return <div>{JSON.stringify(row.original.scenario.variableValues)}</div>;
        },
      },
      ...(variants.data?.map(
        (variant): MRT_ColumnDef<TableRow> => ({
          id: variant.id,
          header: variant.label,
          // size: 300,
          Cell: ({ row }) => {
            const cellData = row.original[variant.id];
            return (
              <div>
                {row.original.scenario.id} | {variant.id}
              </div>
            );
          },
        })
      ) ?? []),
    ],
    [variants.data]
  );

  const tableData = useMemo(
    () =>
      scenarios.data?.map((scenario) => {
        return {
          scenario,
        } as TableRow;
      }) ?? [],
    [variants.data, scenarios.data]
  );

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
      enableRowDragging
    />
  );
  // return <div>OutputsTable</div>;
}
