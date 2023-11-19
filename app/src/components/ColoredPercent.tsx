import { useToken, Text, type TextProps } from "@chakra-ui/react";
import chroma from "chroma-js";
import { isNumber } from "lodash-es";

const ColoredPercent = ({ value, ...props }: { value?: number | null } & TextProps) => {
  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.600",
    "gray.600",
    "red.600",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  return isNumber(value) ? (
    <Text color={scale(value).hex()} fontWeight="bold" {...props}>
      {(value * 100).toFixed(1)}%
    </Text>
  ) : null;
};

export default ColoredPercent;
