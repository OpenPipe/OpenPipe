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

export default function OutputsTable({ experimentId }: { experimentId: string }) {
  const experiment = api.experiments.get.useQuery({ id: experimentId });

  const variants = api.promptVariants.list.useQuery({ experimentId: experimentId });

  const scenarios = api.scenarios.list.useQuery({ experimentId: experimentId });

  const columns = useMemo<MRT_ColumnDef<TableRow>[]>(
    () => [
      {
        id: "scenario",
        header: "Scenario",
        Cell: ({ row }) => {
          return <div>{JSON.stringify(row.original.scenario.variableValues)}</div>;
        },
      },
      ...(variants.data?.map(
        (variant): MRT_ColumnDef<TableRow> => ({
          id: variant.id,
          header: variant.label,
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
          // ...variants.data?.reduce(
          //   (acc, variant) => ({ ...acc, [variant.id]: { variant, scenario } }),
          //   {} as Record<string, CellData>
          // ),
        } as TableRow;
      }) ?? [],
    [variants.data, scenarios.data]
  );

  return <MantineReactTable columns={columns} data={tableData} enableFullScreenToggle={false} />;
  // return <div>OutputsTable</div>;
}
