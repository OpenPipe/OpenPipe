import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import { useMemo } from "react";

import { useSelectedProject, useStats } from "~/utils/hooks";
import { formatToUTCDayMonth } from "~/utils/dayjs";
import { useToken } from "@chakra-ui/react";
import CustomTooltip from "./CustomTooltip";

type propsType = {
  startDate: string;
  endDate: string;
};

export default function CostGraph({ startDate, endDate }: propsType) {
  const { data: selectedProject } = useSelectedProject();

  const stats = useStats(selectedProject?.id || "", startDate, endDate);

  const data = useMemo(() => {
    return (
      stats.data?.periods.map(({ period, trainingCost, inferenceCost }) => ({
        period,
        "Total Spend": parseFloat(trainingCost.toString()) + parseFloat(inferenceCost.toString()),
        "Training Spend": parseFloat(trainingCost.toString()).toFixed(2),
        "Inference Spend": parseFloat(inferenceCost.toString()).toFixed(2),
      })) || []
    );
  }, [stats.data]);

  const [totalSpendColor, trainingSpendColor, inferenceSpendColor] = useToken("colors", [
    "gray.500",
    "orange.500",
    "blue.500",
  ]);

  const longestTotalSpendLabelLength = data
    .map((c) => c["Total Spend"].toFixed(2))
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 5, right: 24, left: 4, bottom: 5 }}>
        <XAxis
          dataKey="period"
          tickMargin={4}
          tickFormatter={(dateStr: string) => formatToUTCDayMonth(dateStr)}
        />
        <YAxis
          yAxisId="right"
          dataKey="Total Spend"
          orientation="right"
          type="number"
          tickMargin={6}
          tickFormatter={(value: number) => "$" + value.toFixed(2)}
          stroke={totalSpendColor}
          width={longestTotalSpendLabelLength * 10 + 8}
        />
        <Tooltip cursor={{ fill: "#EDF2F7" }} content={<CustomTooltip valuePrefix="$" />} />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Bar stackId="a" dataKey="Training Spend" fill={trainingSpendColor} yAxisId="right" />
        <Bar stackId="a" dataKey="Inference Spend" fill={inferenceSpendColor} yAxisId="right" />
      </BarChart>
    </ResponsiveContainer>
  );
}
