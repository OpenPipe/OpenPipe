import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useMemo } from "react";

import { useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { api } from "~/utils/api";

export default function UsageGraph() {
  const { data: selectedProject } = useSelectedProject();

  const stats = api.usage.stats.useQuery(
    { projectId: selectedProject?.id ?? "" },
    { enabled: !!selectedProject },
  );

  const data = useMemo(() => {
    return (
      stats.data?.periods.map(({ period, numQueries, cost }) => ({
        period,
        Requests: numQueries,
        "Total Spent (USD)": parseFloat(cost.toString()),
      })) || []
    );
  }, [stats.data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <XAxis dataKey="period" tickFormatter={(str: string) => dayjs(str).format("MMM D")} />
        <YAxis yAxisId="left" dataKey="Requests" orientation="left" stroke="#8884d8" />
        <YAxis
          yAxisId="right"
          dataKey="Total Spent (USD)"
          orientation="right"
          unit="$"
          stroke="#82ca9d"
        />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Line dataKey="Requests" stroke="#8884d8" yAxisId="left" dot={false} strokeWidth={2} />
        <Line
          dataKey="Total Spent (USD)"
          stroke="#82ca9d"
          yAxisId="right"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
