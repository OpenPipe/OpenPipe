import { useScenarios } from "~/utils/hooks";
import Paginator from "../Paginator";

const ScenarioPaginator = () => {
  const { data } = useScenarios();

  if (!data) return null;

  const { scenarios, startIndex, lastPage, count } = data;

  return (
    <Paginator
      numItemsLoaded={scenarios.length}
      startIndex={startIndex}
      lastPage={lastPage}
      count={count}
    />
  );
};

export default ScenarioPaginator;
