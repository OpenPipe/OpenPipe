import { useState } from "react";
import { Card, Skeleton, Table, Tbody } from "@chakra-ui/react";

import { TableHeader, TableRow } from "./TableRow/TableRow";
import EmptyRow from "./TableRow/EmptyRow";
import { type RouterOutputs } from "~/utils/api";
import NodeEntryEditDrawer, {
  type UpdateEntryCallback,
} from "./NodeEntryEditDrawer/NodeEntryEditDrawer";
import { useNode } from "~/utils/hooks";

type NodeEntryRow = RouterOutputs["nodeEntries"]["list"]["entries"][number];

export default function NodeEntriesTable({
  nodeId,
  entries,
  loading,
  updateEntry,
}: {
  nodeId?: string;
  entries?: NodeEntryRow[];
  loading?: boolean;
  updateEntry?: UpdateEntryCallback;
}) {
  const [expandedNodeEntryPersistentId, setExpandedNodeEntryPersistentId] = useState<string | null>(
    null,
  );

  const node = useNode({ id: nodeId }).data;

  const errorShown = !!entries?.some((entry) => !!entry.error);

  return (
    <>
      <Card width="100%" overflowX="auto">
        <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!loading && !!entries}>
          <Table>
            <TableHeader errorShown={errorShown} />
            <Tbody>
              {entries?.length ? (
                entries?.map((entry) => (
                  <TableRow
                    key={entry.persistentId}
                    nodeEntry={entry}
                    isSelected={entry.persistentId === expandedNodeEntryPersistentId}
                    toggleSelected={() =>
                      entry.persistentId === expandedNodeEntryPersistentId
                        ? setExpandedNodeEntryPersistentId(null)
                        : setExpandedNodeEntryPersistentId(entry.persistentId)
                    }
                    expandable={!updateEntry}
                    errorShown={errorShown}
                  />
                ))
              ) : (
                <EmptyRow nodeType={node?.type} />
              )}
            </Tbody>
          </Table>
        </Skeleton>
      </Card>
      {updateEntry && (
        <NodeEntryEditDrawer
          nodeEntryPersistentId={expandedNodeEntryPersistentId}
          nodeId={nodeId}
          setNodeEntryPersistentId={setExpandedNodeEntryPersistentId}
          updateEntry={updateEntry}
        />
      )}
    </>
  );
}
