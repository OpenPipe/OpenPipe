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
      stats.data?.periods.map(({ period, numQueries, trainingCost, inferenceCost }) => ({
        period,
        Requests: numQueries,
        "Total Spend": parseFloat(trainingCost.toString()) + parseFloat(inferenceCost.toString()),
        "Training Spend": parseFloat(trainingCost.toString()).toFixed(2),
        "Inference Spend": parseFloat(inferenceCost.toString()).toFixed(2),
      })) || []
    );
  }, [stats.data]);

  const [totalSpendColor, trainingSpendColor, inferenceSpendColor, requestsColor] = useToken(
    "colors",
    ["gray.500", "orange.500", "blue.500", "gray.900"],
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <XAxis dataKey="period" tickFormatter={(str: string) => dayjs(str).format("MMM D")} />
        <YAxis yAxisId="left" dataKey="Requests" orientation="left" stroke={requestsColor} />
        <YAxis
          yAxisId="right"
          dataKey="Total Spend"
          orientation="right"
          type="number"
          tickMargin={4}
          tickFormatter={(value: number) => "$" + value.toFixed(2)}
          stroke={totalSpendColor}
        />
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
        <Line
          dataKey="Training Spend"
          stroke={trainingSpendColor}
          yAxisId="right"
          dot={false}
          strokeWidth={2}
        />
        <Line
          dataKey="Inference Spend"
          stroke={inferenceSpendColor}
          yAxisId="right"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
