import { Button, ButtonGroup } from "@chakra-ui/react";
import { useFilters } from "../Filters/useFilters";

const DateComparators = () => {
  const updateFilter = useFilters().updateFilter;

  const filters = useFilters().filters;
  console.log(filters);
  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Button backgroundColor={"white"}>24 h</Button>
      <Button backgroundColor={"white"} onSelect={() => updateFilter({ ...filters })}>
        7 d
      </Button>
      <Button backgroundColor={"white"}>3 m</Button>
      <Button backgroundColor={"white"}>All</Button>
    </ButtonGroup>
  );
};

export default DateComparators;
