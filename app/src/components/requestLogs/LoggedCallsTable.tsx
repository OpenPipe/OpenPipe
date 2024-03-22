import { Card, Skeleton, Table, Tbody } from "@chakra-ui/react";
import { useState } from "react";
import { useLoggedCalls } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import { type FilterData } from "../Filters/types";
import { type LoggedCallsOrderBy } from "~/types/shared.types";

export default function LoggedCallsTable({
  showOptions = true,
  filters,
  orderBy,
  sampleRate,
  maxOutputSize,
  skipCacheHits,
  slowBatch,
}: {
  showOptions?: boolean;
  filters: FilterData[];
  orderBy?: LoggedCallsOrderBy;
  sampleRate?: number;
  maxOutputSize?: number;
  skipCacheHits?: boolean;
  slowBatch?: boolean;
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: loggedCalls, isLoading } = useLoggedCalls({
    filters,
    orderBy,
    slowBatch,
    sampleRate,
    skipCacheHits,
    maxOutputSize,
  });

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton
        startColor="gray.100"
        endColor="gray.300"
        minHeight={isLoading ? "126px" : undefined}
        isLoaded={!isLoading}
      >
        <Table>
          <TableHeader showOptions={showOptions} filters={filters} />
          <Tbody>
            {loggedCalls?.calls.length ? (
              loggedCalls?.calls?.map((loggedCall) => {
                return (
                  <TableRow
                    key={loggedCall.id}
                    loggedCall={loggedCall}
                    isExpanded={loggedCall.id === expandedRow}
                    onToggle={() => {
                      if (loggedCall.id === expandedRow) {
                        setExpandedRow(null);
                      } else {
                        setExpandedRow(loggedCall.id);
                      }
                    }}
                    showOptions={showOptions}
                  />
                );
              })
            ) : (
              <EmptyTableRow filtersApplied={!!filters?.length} />
            )}
          </Tbody>
        </Table>
      </Skeleton>
    </Card>
  );
}
