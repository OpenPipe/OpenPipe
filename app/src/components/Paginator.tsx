import {
  HStack,
  IconButton,
  Text,
  Select,
  type StackProps,
  Icon,
  useBreakpointValue,
} from "@chakra-ui/react";
import React, { useCallback } from "react";
import { FiChevronsLeft, FiChevronsRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { usePageParams } from "~/utils/hooks";

const pageSizeOptions = [10, 25, 50, 100];

const Paginator = ({ count, ...props }: { count: number; condense?: boolean } & StackProps) => {
  const { page, pageSize, setPageParams } = usePageParams();

  const lastPage = Math.ceil(count / pageSize);

  const updatePageSize = useCallback(
    (newPageSize: number) => {
      const newPage = Math.floor(((page - 1) * pageSize) / newPageSize) + 1;
      setPageParams({ page: newPage, pageSize: newPageSize });
    },
    [page, pageSize, setPageParams],
  );

  const nextPage = () => {
    if (page < lastPage) {
      setPageParams({ page: page + 1 });
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPageParams({ page: page - 1 });
    }
  };

  const goToLastPage = () => setPageParams({ page: lastPage });
  const goToFirstPage = () => setPageParams({ page: 1 });

  const isMobile = useBreakpointValue({ base: true, md: false });
  const condense = isMobile || props.condense;

  if (count === 0) return null;

  return (
    <HStack
      pt={4}
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
              backgroundColor="white"
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
          icon={<Icon as={FiChevronsLeft} boxSize={5} strokeWidth={1.5} />}
          bgColor="white"
        />
        <IconButton
          variant="outline"
          size="sm"
          onClick={prevPage}
          isDisabled={page === 1}
          aria-label="Previous page"
          icon={<Icon as={FiChevronLeft} boxSize={5} strokeWidth={1.5} />}
          bgColor="white"
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
          icon={<Icon as={FiChevronRight} boxSize={5} strokeWidth={1.5} />}
          bgColor="white"
        />
        <IconButton
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          isDisabled={page === lastPage}
          aria-label="Go to last page"
          icon={<Icon as={FiChevronsRight} boxSize={5} strokeWidth={1.5} />}
          bgColor="white"
        />
      </HStack>
    </HStack>
  );
};

export default Paginator;
