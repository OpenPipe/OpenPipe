import {
  Button,
  ButtonGroup,
  HStack,
  Icon,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { FilterData } from "./types";
import { formatDateForPicker } from "~/utils/dayjs";
import { BsDash } from "react-icons/bs";
import { debounce } from "lodash-es";
import { useDateFilter } from "./useDateFilter";

const RequestLogDateFilter = () => {
  const filter = useDateFilter().filter;
  const updateFilter = useDateFilter().updateFilter;
  const addFilter = useDateFilter().addFilter;
  const deleteFilter = useDateFilter().deleteFilter;

  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Button
        backgroundColor={"white"}
        isActive={filter?.comparator === "LAST 15M"}
        onClick={() =>
          filter ? updateFilter({ ...filter, comparator: "LAST 15M" }) : addFilter("LAST 15M")
        }
      >
        15 m
      </Button>
      <Button
        backgroundColor={"white"}
        isActive={filter?.comparator === "LAST 24H"}
        onClick={() =>
          filter ? updateFilter({ ...filter, comparator: "LAST 24H" }) : addFilter("LAST 24H")
        }
      >
        24 h
      </Button>
      <Button
        backgroundColor={"white"}
        isActive={filter?.comparator === "LAST 7D"}
        onClick={() =>
          filter ? updateFilter({ ...filter, comparator: "LAST 7D" }) : addFilter("LAST 7D")
        }
      >
        7 d
      </Button>
      <Button
        backgroundColor={"white"}
        isActive={filter?.comparator === "LAST 7D"}
        onClick={() => deleteFilter()}
      >
        All
      </Button>
      <DateRange filter={filter} />
    </ButtonGroup>
  );
};

const DateRange = ({ filter }: { filter: FilterData }) => {
  const updateFilter = useDateFilter().updateFilter;

  const isArray = Array.isArray(filter.value);

  const [firstDate, setFirstDate] = useState<number>(
    isArray ? (filter.value[0] as number) : Date.now(),
  );
  const [secondDate, setSecondDate] = useState<number>(
    isArray ? (filter.value[1] as number) : Date.now(),
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
      let date1 = firstDate;
      let date2 = secondDate;
      if (isSecondDate) {
        date2 = date;
        if (date < firstDate) date1 = date;
      } else {
        date1 = date;
        if (date > secondDate) date2 = date;
      }
      setFirstDate(date1);
      setSecondDate(date2);
      debouncedUpdateFilter({ ...filter, value: [date1, date2] });
    },
    [firstDate, secondDate, setFirstDate, setSecondDate, filter, debouncedUpdateFilter],
  );

  return (
    <Popover placement="right">
      <PopoverTrigger>
        <Button
          backgroundColor={"white"}
          isActive={filter.comparator === "RANGE"}
          onClick={() => updateFilter({ ...filter, comparator: "RANGE" })}
        >
          Custom
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent w={480} bg="transperent" border="none" shadow="none" color="dark">
          <PopoverBody>
            <HStack>
              {!["LAST 15M", "LAST 24H", "LAST 7D"].includes(filter.comparator) && (
                <Input
                  bg="white"
                  type="datetime-local"
                  w={240}
                  h="32px"
                  aria-label="first date"
                  onChange={(e) => updateDate(e.target.value)}
                  value={formatDateForPicker(firstDate)}
                />
              )}
              {filter.comparator === "RANGE" && (
                <>
                  <Icon as={BsDash} />
                  <Input
                    type="datetime-local"
                    bg="white"
                    w={240}
                    h="32px"
                    aria-label="second date"
                    onChange={(e) => updateDate(e.target.value, true)}
                    value={formatDateForPicker(secondDate)}
                  />
                </>
              )}
            </HStack>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default RequestLogDateFilter;
