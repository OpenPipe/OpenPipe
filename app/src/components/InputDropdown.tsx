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
  type PopoverContentProps,
  type InputGroupProps,
} from "@chakra-ui/react";

import { FiChevronDown } from "react-icons/fi";
import { BiCheck } from "react-icons/bi";

type InputDropdownProps<T> = {
  options: ReadonlyArray<T>;
  selectedOption: T;
  onSelect: (option: T) => void;
  inputGroupProps?: InputGroupProps;
  popoverContentProps?: PopoverContentProps;
};

const InputDropdown = <T,>({
  options,
  selectedOption,
  onSelect,
  inputGroupProps,
  popoverContentProps,
}: InputDropdownProps<T>) => {
  const popover = useDisclosure();

  return (
    <Popover placement="bottom-start" {...popover}>
      <PopoverTrigger>
        <InputGroup cursor="pointer" w={360} {...inputGroupProps}>
          <Input
            value={selectedOption as string}
            cursor="pointer"
            borderWidth={popover.isOpen ? 2 : undefined}
            borderColor={popover.isOpen ? "blue.500" : undefined}
            _hover={popover.isOpen ? { borderColor: "blue.500" } : undefined}
            contentEditable={false}
            // disable focus
            onFocus={(e) => {
              e.target.blur();
            }}
          />
          <InputRightElement>
            <Icon as={FiChevronDown} />
          </InputRightElement>
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" w={224} {...popoverContentProps}>
        <VStack spacing={0}>
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
            >
              <Text>{option as string}</Text>
              {option === selectedOption && <Icon as={BiCheck} color="blue.500" boxSize={5} />}
            </HStack>
          ))}
        </VStack>
      </PopoverContent>
    </Popover>
  );
};

export default InputDropdown;
