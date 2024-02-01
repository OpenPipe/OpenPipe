export const generateImportId = ({
  uniquePrefix,
  nodeId,
}: {
  uniquePrefix: string;
  nodeId: string;
}) => `${uniquePrefix}_${nodeId}`;
