import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  ComposedChart,
} from "recharts";
import { useMemo } from "react";

import { useSelectedProject } from "~/utils/hooks";
import dayjs from "~/utils/dayjs";
import { api } from "~/utils/api";
import { Card, VStack, useToken, Text } from "@chakra-ui/react";

type propsType = {
  startDate: Date;
  endDate: Date;
};

export default function UsageGraph({ startDate, endDate }: propsType) {
  const { data: selectedProject } = useSelectedProject();

  const stats = api.usage.stats.useQuery(
    {
      projectId: selectedProject?.id ?? "",
      startDate,
      endDate,
    },
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

  const longestRequestsLabelLength = data
    .map((c) => c.Requests.toString())
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  const longestTotalSpendLabelLength = data
    .map((c) => c["Total Spend"].toFixed(2))
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active: boolean;
    payload: Array<object>;
    label: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <Card>
          <VStack alignItems="flex-start" p={4}>
            <Text as={"b"}>{toUTCDateString(label)} UTC</Text>
            {payload.map((p: any) => (
              <Text style={{ color: p.color }}>{`${p.name}: ${p.value}`}</Text>
            ))}
          </VStack>
        </Card>
      );
    }

    return null;
  };

  function toUTCDateString(dateStr: string) {
    return new Date(dateStr).toUTCString().slice(5, 11); // Extracts "DD MMM" format
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 5, right: 24, left: 4, bottom: 5 }}>
        <XAxis
          dataKey="period"
          tickMargin={4}
          tickFormatter={(str: string) => toUTCDateString(str)}
        />
        <YAxis
          yAxisId="left"
          dataKey="Requests"
          orientation="left"
          stroke={requestsColor}
          width={longestRequestsLabelLength * 10 + 8}
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
        <Tooltip content={<CustomTooltip active={true} payload={[]} label={""} />} />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Line type="monotone" dataKey="Requests" stroke={requestsColor} yAxisId="left" />
        <Bar stackId="a" dataKey="Training Spend" fill={trainingSpendColor} yAxisId="right" />
        <Bar stackId="a" dataKey="Inference Spend" fill={inferenceSpendColor} yAxisId="right" />
      </ComposedChart>
      {/* <LineChart data={data} margin={{ top: 5, right: 24, left: 4, bottom: 5 }}>
        <XAxis
          dataKey="period"
          tickMargin={4}
          tickFormatter={(str: string) => dayjs(str).format("MMM D")}
        />
        <YAxis
          yAxisId="left"
          dataKey="Requests"
          orientation="left"
          stroke={requestsColor}
          width={longestRequestsLabelLength * 10 + 8}
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
      </LineChart> */}
    </ResponsiveContainer>
  );
}
