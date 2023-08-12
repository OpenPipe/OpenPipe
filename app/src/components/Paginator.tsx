import { HStack, IconButton, Text, Select, type StackProps } from "@chakra-ui/react";
import React, { useCallback } from "react";
import {
  BsChevronDoubleLeft,
  BsChevronDoubleRight,
  BsChevronLeft,
  BsChevronRight,
} from "react-icons/bs";
import { usePageParams } from "~/utils/hooks";

const pageSizeOptions = [10, 25, 50, 100];

const Paginator = ({
  count,
  condense,
  ...props
}: { count: number; condense?: boolean } & StackProps) => {
  const { page, pageSize, setPageParams } = usePageParams();

  const lastPage = Math.ceil(count / pageSize);

  const updatePageSize = useCallback(
    (newPageSize: number) => {
      const newPage = Math.floor(((page - 1) * pageSize) / newPageSize) + 1;
      setPageParams({ page: newPage, pageSize: newPageSize }, "replace");
    },
    [page, pageSize, setPageParams],
  );

  const nextPage = () => {
    if (page < lastPage) {
      setPageParams({ page: page + 1 }, "replace");
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPageParams({ page: page - 1 }, "replace");
    }
  };

  const goToLastPage = () => setPageParams({ page: lastPage }, "replace");
  const goToFirstPage = () => setPageParams({ page: 1 }, "replace");

  return (
    <HStack
      pt={4}
      px={4}
      spacing={8}
      justifyContent={condense ? "flex-start" : "space-between"}
      alignItems="center"
      w="full"
      {...props}
    >
      {!condense && (
        <>
          <HStack>
            <Text>Rows</Text>
            <Select
              value={pageSize}
              onChange={(e) => updatePageSize(parseInt(e.target.value))}
              w={20}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </HStack>
          <Text>
            Page {page} of {lastPage}
          </Text>
        </>
      )}

      <HStack>
        <IconButton
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          isDisabled={page === 1}
          aria-label="Go to first page"
          icon={<BsChevronDoubleLeft />}
        />
        <IconButton
          variant="outline"
          size="sm"
          onClick={prevPage}
          isDisabled={page === 1}
          aria-label="Previous page"
          icon={<BsChevronLeft />}
        />
        {condense && (
          <Text>
            Page {page} of {lastPage}
          </Text>
        )}
        <IconButton
          variant="outline"
          size="sm"
          onClick={nextPage}
          isDisabled={page === lastPage}
          aria-label="Next page"
          icon={<BsChevronRight />}
        />
        <IconButton
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          isDisabled={page === lastPage}
          aria-label="Go to last page"
          icon={<BsChevronDoubleRight />}
        />
      </HStack>
    </HStack>
  );
};

export default Paginator;
