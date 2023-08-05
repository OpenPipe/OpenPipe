import { Box, HStack, IconButton } from "@chakra-ui/react";
import {
  BsChevronDoubleLeft,
  BsChevronDoubleRight,
  BsChevronLeft,
  BsChevronRight,
} from "react-icons/bs";
import { usePage } from "~/utils/hooks";

const Paginator = ({
  numItemsLoaded,
  startIndex,
  lastPage,
  count,
}: {
  numItemsLoaded: number;
  startIndex: number;
  lastPage: number;
  count: number;
}) => {
  const [page, setPage] = usePage();

  const nextPage = () => {
    if (page < lastPage) {
      setPage(page + 1, "replace");
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1, "replace");
    }
  };

  const goToLastPage = () => setPage(lastPage, "replace");
  const goToFirstPage = () => setPage(1, "replace");

  return (
    <HStack pt={4}>
      <IconButton
        variant="ghost"
        size="sm"
        onClick={goToFirstPage}
        isDisabled={page === 1}
        aria-label="Go to first page"
        icon={<BsChevronDoubleLeft />}
      />
      <IconButton
        variant="ghost"
        size="sm"
        onClick={prevPage}
        isDisabled={page === 1}
        aria-label="Previous page"
        icon={<BsChevronLeft />}
      />
      <Box>
        {startIndex}-{startIndex + numItemsLoaded - 1} / {count}
      </Box>
      <IconButton
        variant="ghost"
        size="sm"
        onClick={nextPage}
        isDisabled={page === lastPage}
        aria-label="Next page"
        icon={<BsChevronRight />}
      />
      <IconButton
        variant="ghost"
        size="sm"
        onClick={goToLastPage}
        isDisabled={page === lastPage}
        aria-label="Go to last page"
        icon={<BsChevronDoubleRight />}
      />
    </HStack>
  );
};

export default Paginator;
