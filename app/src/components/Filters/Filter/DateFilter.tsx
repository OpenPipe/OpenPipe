import { useCallback, useState, useEffect } from "react";
import { HStack, IconButton, Input, Icon } from "@chakra-ui/react";
import { BsTrash, BsDash } from "react-icons/bs";

import { formatDateForPicker } from "~/utils/dayjs";
import SelectFieldDropdown from "../SelectFieldDropdown";
import SelectComparatorDropdown from "../SelectComparatorDropdown";
import { useFilters } from "../useFilters";
import { type FilterData, type FilterOption } from "../types";
import { type AtLeastOne } from "~/types/shared.types";

const DateFilter = ({
  filterOptions,
  filter,
  urlKey,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
  urlKey?: string;
}) => {
  const { updateFilter, removeFilter } = useFilters({ urlKey });

  const isArray = Array.isArray(filter.value);

  const [firstDate, setFirstDate] = useState<number>(
    isArray ? (filter.value[0] as number) : Date.now(),
  );
  const [secondDate, setSecondDate] = useState<number>(
    isArray ? (filter.value[1] as number) : Date.now(),
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
      updateFilter({ ...filter, value: [date1, date2] });
      setFirstDate(date1);
      setSecondDate(date2);
    },
    [firstDate, secondDate, setFirstDate, setSecondDate, filter, updateFilter],
  );

  const valueIsEmpty = !filter.value;

  useEffect(() => {
    if (valueIsEmpty) {
      updateFilter({ ...filter, value: [firstDate, secondDate] });
    }
  }, [valueIsEmpty, firstDate, secondDate, updateFilter, filter]);

  return (
    <HStack>
      <SelectFieldDropdown filterOptions={filterOptions} filter={filter} urlKey={urlKey} />
      <SelectComparatorDropdown filter={filter} filterType="date" urlKey={urlKey} />
      <HStack>
        {!["LAST 15M", "LAST 24H", "LAST 7D"].includes(filter.comparator) && (
          <Input
            type="datetime-local"
            w={240}
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
              w={240}
              aria-label="second date"
              onChange={(e) => updateDate(e.target.value, true)}
              value={formatDateForPicker(secondDate)}
            />
          </>
        )}
      </HStack>

      <IconButton
        aria-label="Remove Filter"
        icon={<BsTrash />}
        onClick={() => removeFilter(filter)}
      />
    </HStack>
  );
};

export default DateFilter;
