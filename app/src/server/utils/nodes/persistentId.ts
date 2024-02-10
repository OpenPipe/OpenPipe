export const generatePersistentId = ({
  uniquePrefix,
  nodeId,
}: {
  uniquePrefix: string;
  nodeId: string;
}) => `${uniquePrefix}_${nodeId}`;
