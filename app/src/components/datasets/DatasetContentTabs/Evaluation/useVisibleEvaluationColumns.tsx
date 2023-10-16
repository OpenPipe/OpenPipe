import { useRouter } from "next/router";

export const useVisibleEvaluationColumns = () => {
  const router = useRouter();

  // Split the "compare" query by commas to get the array of strings.
  const visibleColumns =
    typeof router.query.compare === "string"
      ? router.query.compare.split(",").filter((col) => !!col)
      : [];

  const setVisibleColumns = (newVisibleValues: string[]) => {
    // Form the updated query.
    const updatedQuery = {
      ...router.query,
      compare: newVisibleValues.join(","),
    };

    // If newVisibleValues is empty, we want to remove the "compare" query param entirely.
    if (newVisibleValues.length === 0) {
      delete (updatedQuery as { [key: string]: unknown }).compare;
    }

    void router.push(
      {
        pathname: router.pathname,
        query: updatedQuery,
      },
      undefined,
      { shallow: true },
    );
  };

  return { visibleColumns, setVisibleColumns };
};
