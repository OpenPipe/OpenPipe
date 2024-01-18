import { Card, Text, VStack } from "@chakra-ui/react";
import { toUTCDateShortFormat } from "~/utils/dayjs";

interface PayloadItem {
  name: string;
  color: string;
  value: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  beforeValue,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
  beforeValue?: string;
}) {
  if (active && payload && payload.length && label) {
    return (
      <Card>
        <VStack alignItems="flex-start" p={4}>
          <Text as={"b"}>{toUTCDateShortFormat(label)} UTC</Text>
          {payload.map((p) => (
            <Text key={p.name} style={{ color: p.color }}>{`${p.name}: ${beforeValue || ""}${
              p.value
            }`}</Text>
          ))}
        </VStack>
      </Card>
    );
  }

  return <></>;
}

export default CustomTooltip;
