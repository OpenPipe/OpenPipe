import { Button, GridItem, HStack, Heading } from "@chakra-ui/react";
import { cellPadding } from "../constants";
import { useElementDimensions } from "~/utils/hooks";
import { stickyHeaderStyle } from "./styles";
import { BsPencil } from "react-icons/bs";
import { useAppStore } from "~/state/store";

export const ScenariosHeader = ({
  headerRows,
  numScenarios,
}: {
  headerRows: number;
  numScenarios: number;
}) => {
  const openDrawer = useAppStore((s) => s.openDrawer);

  const [ref, dimensions] = useElementDimensions();
  const topValue = dimensions ? `-${dimensions.height - 24}px` : "-455px";

  return (
    <GridItem
      ref={ref as any}
      display="flex"
      alignItems="flex-end"
      rowSpan={headerRows}
      px={cellPadding.x}
      py={cellPadding.y}
      // Only display the part of the grid item that has content
      sx={{ ...stickyHeaderStyle, top: topValue }}
    >
      <HStack w="100%">
        <Heading size="xs" fontWeight="bold" flex={1}>
          Scenarios ({numScenarios})
        </Heading>
        <Button
          size="xs"
          variant="ghost"
          color="gray.500"
          aria-label="Edit"
          leftIcon={<BsPencil />}
          onClick={openDrawer}
        >
          Edit Vars
        </Button>
      </HStack>
    </GridItem>
  );
};
