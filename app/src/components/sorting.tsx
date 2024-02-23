import { HStack, Icon, Th, VStack, Text } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import { BiSolidDownArrow, BiSolidUpArrow } from "react-icons/bi";
import { DelimitedArrayParam, useQueryParam } from "use-query-params";
import { z } from "zod";

type SortableFields = string;

export const useSortOrder = <Fields extends SortableFields>() => {
  const [rawParams, setParams] = useQueryParam("sort", DelimitedArrayParam);

  const parsedParams = z.tuple([z.string(), z.enum(["asc", "desc"])]).safeParse(rawParams);

  const reset = useCallback(() => setParams(undefined), [setParams]);

  const params = useMemo(
    () =>
      parsedParams.success
        ? { field: parsedParams.data[0] as Fields, order: parsedParams.data[1] }
        : undefined,
    [parsedParams],
  );

  // If it's not sorted by this, sort asc. If it's sorted asc, sort desc. If it's sorted desc, remove sorting.
  const toggle = useCallback(
    (newField: Fields) => {
      if (params?.field === newField) {
        if (params.order === "asc") {
          setParams([newField, "desc"]);
        } else {
          reset();
        }
      } else {
        setParams([newField, "asc"]);
      }
    },
    [setParams, params, reset],
  );

  return {
    params,
    reset,
    toggle,
  };
};

export const SortArrows = <Fields extends SortableFields>(props: { field: Fields }) => {
  const { toggle, params } = useSortOrder<Fields>();

  const currentSort = params?.field === props.field ? params.order : undefined;

  return (
    <VStack spacing={0} h={6} cursor="pointer" onClick={() => toggle(props.field)} justify="center">
      <Icon
        as={BiSolidUpArrow}
        color={currentSort === "asc" ? "orange.400" : "gray.300"}
        boxSize={2}
        strokeWidth={2}
      />
      <Icon
        as={BiSolidDownArrow}
        color={currentSort === "desc" ? "orange.400" : "gray.300"}
        boxSize={2}
        strokeWidth={2}
      />
    </VStack>
  );
};

export const SortableHeader = <T extends string>(props: {
  title: string;
  field: T;
  isNumeric?: boolean;
}) => {
  const sortOrder = useSortOrder<T>();

  return (
    <Th onClick={() => sortOrder.toggle(props.field)} cursor="pointer">
      <HStack justify={props.isNumeric ? "end" : undefined}>
        <Text>{props.title}</Text> <SortArrows<T> field={props.field} />
      </HStack>
    </Th>
  );
};
