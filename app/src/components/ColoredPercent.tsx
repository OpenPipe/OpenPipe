import { useToken, Text } from "@chakra-ui/react";
import chroma from "chroma-js";

const ColoredPercent = ({ value }: { value: number | null }) => {
  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.600",
    "gray.600",
    "red.600",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  return value == null ? null : (
    <Text color={scale(value).hex()} fontWeight="bold">
      {(value * 100).toFixed(1)}%
    </Text>
  );
};

export default ColoredPercent;
