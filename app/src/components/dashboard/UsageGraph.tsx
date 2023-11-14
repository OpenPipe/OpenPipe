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
import { useToken } from "@chakra-ui/react";

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
        Spent: parseFloat(cost.toString()),
      })) || []
    );
  }, [stats.data]);

  const [spendColor, requestsColor] = useToken("colors", ["blue.500", "red.600"]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <XAxis dataKey="period" tickFormatter={(str: string) => dayjs(str).format("MMM D")} />
        <YAxis yAxisId="left" dataKey="Requests" orientation="left" stroke={requestsColor} />
        <YAxis yAxisId="right" dataKey="Spent" orientation="right" unit="$" stroke={spendColor} />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Line
          dataKey="Requests"
          stroke={requestsColor}
          yAxisId="left"
          dot={false}
          strokeWidth={2}
        />
        <Line dataKey="Spent" stroke={spendColor} yAxisId="right" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
