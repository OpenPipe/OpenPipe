import {
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  VStack,
  HStack,
  Button,
  Text,
  useDisclosure,
  type InputGroupProps,
  type PlacementWithLogical,
} from "@chakra-ui/react";

import { FiChevronDown } from "react-icons/fi";
import { BiCheck } from "react-icons/bi";
import { isEqual } from "lodash-es";
import React from "react";

type InputDropdownProps<T> = {
  options: ReadonlyArray<T>;
  selectedOption: T;
  onSelect: (option: T) => void;
  inputGroupProps?: InputGroupProps;
  getDisplayLabel?: (option: T) => string;
  isDisabled?: boolean;
  maxPopoverContentHeight?: number;
  minItemHeight?: number;
  placeholder?: string;
  placement?: PlacementWithLogical;
};

const InputDropdown = <T,>({
  options,
  selectedOption,
  onSelect,
  inputGroupProps,
  getDisplayLabel = (option) => option as string,
  isDisabled,
  maxPopoverContentHeight,
  minItemHeight,
  placeholder,
  placement = "bottom-start",
}: InputDropdownProps<T>) => {
  const { onOpen, ...popover } = useDisclosure();

  return (
    <Popover placement={placement} onOpen={isDisabled ? undefined : onOpen} {...popover}>
      <PopoverTrigger>
        <InputGroup
          cursor="pointer"
          w={getDisplayLabel(selectedOption).length * 9 + 110}
          borderRadius={8}
          {...inputGroupProps}
        >
          <Input
            value={getDisplayLabel(selectedOption)}
            // eslint-disable-next-line @typescript-eslint/no-empty-function -- controlled input requires onChange
            onChange={() => {}}
            cursor="pointer"
            borderColor={popover.isOpen ? "blue.500" : undefined}
            _hover={popover.isOpen ? { borderColor: "blue.500" } : undefined}
            contentEditable={false}
            placeholder={placeholder}
            // disable focus
            onFocus={(e) => {
              e.target.blur();
            }}
            isDisabled={isDisabled}
          />
          <InputRightElement>
            <Icon as={FiChevronDown} color={isDisabled ? "gray.300" : undefined} />
          </InputRightElement>
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
        <VStack spacing={0} maxH={maxPopoverContentHeight} overflow="auto">
          {options?.map((option, index) => (
            <HStack
              key={index}
              as={Button}
              onClick={() => {
                onSelect(option);
                popover.onClose();
              }}
              w="full"
              variant="ghost"
              justifyContent="space-between"
              fontWeight="semibold"
              borderRadius={0}
              colorScheme="blue"
              color="black"
              fontSize="sm"
              borderBottomWidth={1}
              minH={minItemHeight}
            >
              <Text mr={16}>{getDisplayLabel(option)}</Text>
              {isEqual(option, selectedOption) && (
                <Icon as={BiCheck} color="blue.500" boxSize={5} />
              )}
            </HStack>
          ))}
        </VStack>
      </PopoverContent>
    </Popover>
  );
};

export default InputDropdown;
