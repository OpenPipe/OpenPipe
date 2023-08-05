import { useDatasetEntries } from "~/utils/hooks";
import Paginator from "../Paginator";

const DatasetEntriesPaginator = () => {
  const { data } = useDatasetEntries();

  if (!data) return null;

  const { entries, startIndex, lastPage, count } = data;

  return (
    <Paginator
      numItemsLoaded={entries.length}
      startIndex={startIndex}
      lastPage={lastPage}
      count={count}
    />
  );
};

export default DatasetEntriesPaginator;
