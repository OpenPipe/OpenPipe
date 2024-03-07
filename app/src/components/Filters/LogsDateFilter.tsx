import {
  Button,
  ButtonGroup,
  Flex,
  Icon,
  Input,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Portal,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { type FilterData } from "./types";
import { formatDateForPicker } from "~/utils/dayjs";
import { BsDash } from "react-icons/bs";
import { debounce } from "lodash-es";
import { getDefaultDateFilter, useDateFilter } from "./useDateFilter";

const LogsDateFilter = () => {
  const { filters, updateFilter, addFilter, deleteFilter } = useDateFilter();
  const filter = filters[0];

  const updateOrAddFilter = useCallback(
    (comparator: FilterData["comparator"]) => {
      filter ? updateFilter({ ...filter, comparator: comparator }) : addFilter(comparator);
    },
    [filter, updateFilter, addFilter],
  );

  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      {["LAST 15M", "LAST 24H", "LAST 7D"].map((timeFrame) => (
        <Button
          key={timeFrame}
          backgroundColor={"white"}
          isActive={filter?.comparator === timeFrame}
          onClick={() => updateOrAddFilter(timeFrame as FilterData["comparator"])}
        >
          {timeFrame.split(" ")[1]?.toLowerCase()}
        </Button>
      ))}
      <Button backgroundColor={"white"} isActive={!filter} onClick={deleteFilter}>
        All
      </Button>

      <Popover>
        {({ onClose }) => (
          <>
            <PopoverTrigger>
              <Button isActive={filter?.comparator === "RANGE"}>Custom</Button>
            </PopoverTrigger>
            <DateRange filter={filter} close={onClose} />
          </>
        )}
      </Popover>
    </ButtonGroup>
  );
};

const DateRange = ({ filter, close }: { filter?: FilterData; close: () => void }) => {
  const updateFilter = useDateFilter().updateFilter;

  const [firstDate, setFirstDate] = useState<number>(
    filter && Array.isArray(filter.value) ? filter.value[0] : Date.now(),
  );
  const [secondDate, setSecondDate] = useState<number>(
    filter && Array.isArray(filter.value) ? filter?.value[1] : Date.now(),
  );

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterData) => updateFilter(filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  const updateDate = useCallback(
    (dateStr: string, isSecondDate?: boolean) => {
      const date = dateStr ? new Date(dateStr).getTime() : Date.now();
      if (isSecondDate) {
        if (date < firstDate) {
          setFirstDate(date);
          setSecondDate(firstDate);
        } else {
          setSecondDate(date);
        }
      } else {
        if (date > secondDate) {
          setFirstDate(secondDate);
          setSecondDate(date);
        } else {
          setFirstDate(date);
        }
      }
    },
    [firstDate, secondDate],
  );

  const handleSave = useCallback(() => {
    debouncedUpdateFilter({ ...getDefaultDateFilter("RANGE"), value: [firstDate, secondDate] });
  }, [firstDate, secondDate, filter, debouncedUpdateFilter]);

  return (
    <Portal>
      <PopoverContent w="fit-content" shadow={"md"} p={4}>
        <PopoverBody>
          <Flex flexDir={{ base: "column", md: "row" }} alignItems="center">
            <Input
              type="datetime-local"
              w={240}
              aria-label="first date"
              onChange={(e) => updateDate(e.target.value)}
              value={formatDateForPicker(firstDate)}
            />

            <Icon as={BsDash} />
            <Input
              type="datetime-local"
              w={240}
              aria-label="second date"
              onChange={(e) => updateDate(e.target.value, true)}
              value={formatDateForPicker(secondDate)}
            />
          </Flex>
          <ButtonGroup display="flex" justifyContent="flex-end" pt={4}>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <PopoverCloseButton />
            <Button
              colorScheme="blue"
              onClick={() => {
                close(), handleSave();
              }}
            >
              Save
            </Button>
          </ButtonGroup>
        </PopoverBody>
      </PopoverContent>
    </Portal>
  );
};

export default LogsDateFilter;
