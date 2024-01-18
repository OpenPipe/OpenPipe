import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Area,
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

export default function UsageGraph({ startDate, endDate }: propsType) {
  const { data: selectedProject } = useSelectedProject();

  const stats = useStats(selectedProject?.id || "", startDate, endDate);

  const data = useMemo(() => {
    return (
      stats.data?.periods.map(({ period, numQueries }) => ({
        period,
        Requests: numQueries,
      })) || []
    );
  }, [stats.data]);

  const [requestsMainColor, requestsFill] = useToken("colors", ["blue.700", "blue.500"]);

  const longestRequestsLabelLength = data
    .map((c) => c.Requests.toString())
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 5, right: 24, left: 4, bottom: 5 }}>
        <XAxis
          dataKey="period"
          tickMargin={4}
          tickFormatter={(dateStr: string) => formatToUTCDayMonth(dateStr)}
        />
        <YAxis
          yAxisId="left"
          dataKey="Requests"
          orientation="left"
          width={longestRequestsLabelLength * 10 + 8}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Area
          type="monotone"
          dataKey="Requests"
          fill={requestsFill}
          stroke={requestsMainColor}
          yAxisId="left"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
