import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  VStack,
  HStack,
  Button,
  Text,
  useDisclosure,
  Box,
} from "@chakra-ui/react";
import { BiCheck } from "react-icons/bi";
import { BsToggles } from "react-icons/bs";

import { useTagNames } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import { StaticColumnKeys } from "~/state/columnVisiblitySlice";
import ActionButton from "./ActionButton";
import { useMemo } from "react";

const ColumnVisiblityDropdown = () => {
  const tagNames = useTagNames().data;

  const wholeStore = useAppStore();

  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const toggleColumnVisibility = useAppStore((s) => s.columnVisibility.toggleColumnVisibility);
  const totalColumns = Object.keys(StaticColumnKeys).length + (tagNames?.length ?? 0);

  const popover = useDisclosure();

  const columnVisiblityOptions = useMemo(() => {
    const options: { label: string; key: string }[] = [
      {
        label: "Sent At",
        key: StaticColumnKeys.SENT_AT,
      },
      {
        label: "Model",
        key: StaticColumnKeys.MODEL,
      },
      {
        label: "Duration",
        key: StaticColumnKeys.DURATION,
      },
      {
        label: "Input Tokens",
        key: StaticColumnKeys.INPUT_TOKENS,
      },
      {
        label: "Output Tokens",
        key: StaticColumnKeys.OUTPUT_TOKENS,
      },
      {
        label: "Status Code",
        key: StaticColumnKeys.STATUS_CODE,
      },
    ];
    for (const tagName of tagNames ?? []) {
      options.push({
        label: tagName,
        key: tagName,
      });
    }
    return options;
  }, [tagNames]);

  return (
    <Popover
      placement="bottom-start"
      isOpen={popover.isOpen}
      onOpen={popover.onOpen}
      onClose={popover.onClose}
    >
      <PopoverTrigger>
        <Box>
          <ActionButton
            label={`Columns (${totalColumns - visibleColumns.size}/${totalColumns})`}
            icon={BsToggles}
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
        <VStack spacing={0} maxH={400} overflowY="auto">
          {columnVisiblityOptions?.map((option, index) => (
            <HStack
              key={index}
              as={Button}
              onClick={() => toggleColumnVisibility(option.key)}
              w="full"
              minH={10}
              variant="ghost"
              justifyContent="space-between"
              fontWeight="semibold"
              borderRadius={0}
              colorScheme="blue"
              color="black"
              fontSize="sm"
              borderBottomWidth={1}
            >
              <Text mr={16}>{option.label}</Text>
              {visibleColumns.has(option.key) && <Icon as={BiCheck} color="blue.500" boxSize={5} />}
            </HStack>
          ))}
        </VStack>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnVisiblityDropdown;
